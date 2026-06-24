# Logic Review — DriveEasy Rentals
**Date:** 2026-04-28  
**Scope:** hooks, auth, schema, RLS, routing, state management

---

## Score: 6.5 / 10

The architecture foundation is genuinely solid — React Query + Supabase + TypeScript + RLS is a good
stack for this domain. The data model covers the real business domain well. But there are several
production-blocking bugs and one critical security issue that need to be fixed before launch.

---

## What's Good ✅

### Data model & schema
- Types in `database.ts` closely mirror the DB tables — no impedance mismatch.
- `no_overlap` constraint enforces `start_date < end_date` at the DB level.
- `reservations_updated_at` trigger keeps `updated_at` honest without relying on client code.
- `handle_new_user` trigger auto-creates the `public.users` row at signup, so there's no gap
  between `auth.users` and `public.users`.
- Foreign keys use `ON DELETE RESTRICT` on reservations — you can't delete a car or user that
  has an active booking. Correct.

### Auth
- `resolveRole` cleanly separates staff from clients with two DB lookups.
- The `mounted` flag in `AuthProvider` prevents setState-after-unmount race conditions.
- `ProtectedRoute` covers both directions: unauthenticated → `/login`,
  and staff trying to access client routes → `/admin`.
- `INITIAL_SESSION` event is intentionally skipped to avoid double-processing. Good.

### React Query usage
- Query keys are consistent and granular (`["cars", "available", start, end]`).
- Every mutation properly invalidates related queries on success.
- `enabled` guards prevent queries from running with undefined/empty params.
- `useAutoCompleteReservations` exists as an escape hatch to mark past confirmed
  reservations as COMPLETED.

### RLS policies
- Clients can only read/update their own rows. Staff can read everything.
- `is_staff()` helper is `SECURITY DEFINER`, so it can't be bypassed by RLS recursion.
- Contracts and maintenance are staff-only at the DB level — even if a client
  guesses a URL, Supabase will block the query.

---

## Critical Issues 🔴

### 1. TOCTOU race condition in `useCreateReservation` (booking bug)
**File:** `src/hooks/use-reservations.ts:56-73`

```
SELECT → (race window) → INSERT
```

Two users can simultaneously pass the conflict check and both get a booking
for the same car on the same dates. The check is done with a plain `SELECT`,
then a separate `INSERT` — these are not atomic.

**Fix:** Add a DB-level exclusion constraint using `pg_trgm` or a partial unique index,
or move the check into a Postgres function that runs inside a transaction.
Alternatively: use Supabase's `rpc()` to call a `SECURITY DEFINER` function that
does a `SELECT FOR UPDATE` then `INSERT` in one transaction.

---

### 2. `total_price` is set by the client (security)
**File:** `src/hooks/use-reservations.ts:44-50`

```ts
interface CreateReservationInput {
  total_price: number;  // ← user-supplied
}
```

A client can open DevTools, call the mutation, and pass `total_price: 1`.
The server accepts it. This means anyone can book a car for 1 TND.

**Fix:** Remove `total_price` from the client input. Compute it in a
Postgres function: `price_per_day * (end_date - start_date)` server-side.

---

## Significant Issues 🟠

### 3. Mock data fallback fires silently in production
**File:** `src/hooks/use-cars.ts:28, 68`

```ts
if (result.length === 0) return MOCK_CARS; // ← also fires in production
```

If the `cars` table is legitimately empty (e.g. admin deleted all cars),
the app silently returns fake mock data to real users. If Supabase has a
network hiccup and returns nothing, same thing.

**Fix:** Remove the mock fallback from production paths. Keep mock data only
in a Storybook / local dev environment (feature flag or `import.meta.env.DEV`).

---

### 4. `cars_write_staff` RLS policy uses `USING` instead of `WITH CHECK`
**File:** `supabase/migrations/001_initial_schema.sql:119`

```sql
CREATE POLICY "cars_write_staff" ON cars FOR ALL USING (is_staff());
```

For `INSERT` and `UPDATE`, Postgres uses `WITH CHECK` to validate the new row.
`USING` only applies to rows being read/filtered. Using `USING` for `ALL` means
inserts by non-staff might not be properly blocked in all Postgres versions.

**Fix:**
```sql
CREATE POLICY "cars_write_staff" ON cars FOR ALL
  USING (is_staff())
  WITH CHECK (is_staff());
```

---

### 5. `users_own` policy allows clients to DELETE their own row
**File:** `supabase/migrations/001_initial_schema.sql:122`

```sql
CREATE POLICY "users_own" ON users FOR ALL USING (id = auth.uid());
```

`FOR ALL` includes `DELETE`. A client can delete their own `users` row.
Because `reservations.client_id` has `ON DELETE RESTRICT`, this would fail if
they have reservations — but if they have none, the row disappears and the
account becomes a ghost in `auth.users` with no profile.

**Fix:** Split into separate `FOR SELECT`, `FOR UPDATE` policies. No `FOR DELETE`.

---

### 6. `useUpsertContract` is not atomic
**File:** `src/hooks/use-contracts.ts:26-50`

```ts
const existing = await SELECT ...
if (existing) { UPDATE } else { INSERT }
```

Two staff members saving a contract at the same time could both see `existing = null`
and both try to `INSERT`, causing a unique constraint error (or duplicate row).

**Fix:** Use Supabase's native upsert: `.upsert(input, { onConflict: "reservation_id" })`.

---

### 7. `useAutoCompleteReservations` is manual / client-triggered
**File:** `src/hooks/use-reservations.ts:181-195`

Marking confirmed reservations as COMPLETED only happens when a staff member
triggers this mutation from the UI. If no one logs in for a week, old reservations
stay stuck as CONFIRMED indefinitely.

**Fix:** Add a Postgres cron job via `pg_cron` (available on Supabase Pro) or a
scheduled Supabase Edge Function to run this update daily.

---

## Minor Issues 🟡

### 8. `ReservationWithDetails` defined twice
- `src/types/database.ts:94` — has the canonical definition  
- `src/hooks/use-reservations.ts:102` — duplicates it as a local interface

One of them will drift. Remove the one in `use-reservations.ts`.

### 9. QueryClient has no configuration
**File:** `src/App.tsx:16`

```ts
const queryClient = new QueryClient(); // defaults only
```

No `staleTime`, no `retry` config, no global error handler.
Queries retry 3 times on failure by default, causing a 3× slowdown on auth errors.

**Fix:**
```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});
```

### 10. Auth role resolution always makes 2 DB round-trips
**File:** `src/lib/auth.tsx:40-68`

Every session restore hits `staff` table, then `users` table.
If the user is a client (99% of traffic), the staff query always 404s first.

**Fix:** Store the role in `auth.users.user_metadata` at signup/staff creation,
so `resolveRole` only needs one DB call (or zero, using the JWT claim directly).

### 11. No React error boundaries
If any component throws during render (e.g. Supabase returns an unexpected shape),
the entire app goes blank with no fallback UI.

---

## Summary Table

| Area | Score | Notes |
|---|---|---|
| Data model / schema | 8/10 | Clean, well-typed, good constraints |
| RLS / security | 5/10 | Policies have gaps; price is client-controlled |
| Auth | 7/10 | Solid, minor perf issue |
| React Query | 7/10 | Good usage, missing QueryClient config |
| Business logic | 5/10 | Race condition in booking is a real bug |
| Error handling | 4/10 | No boundaries, silent mock fallback |
| **Overall** | **6.5/10** | Good bones, needs hardening before launch |

---

## Priority Fix Order

1. 🔴 Move price calculation server-side (security — must fix before launch)
2. 🔴 Fix booking race condition (correctness — must fix before launch)
3. 🟠 Remove mock fallback from production code
4. 🟠 Fix `cars_write_staff` RLS policy (`WITH CHECK`)
5. 🟠 Fix `users_own` policy (remove DELETE)
6. 🟠 Replace `useUpsertContract` with native Supabase upsert
7. 🟡 Add QueryClient config
8. 🟡 Remove duplicate `ReservationWithDetails`
9. 🟡 Schedule auto-complete via Edge Function / pg_cron
10. 🟡 Add error boundaries

---

---

# UX Flow Review — Booking, Reservations, Contracts, Car CRUD
**Score: 5 / 10**

The flows exist end-to-end and work, but several are broken, half-finished, or inconsistent in ways
that would confuse real users and the business owner.

---

## Client Booking Flow

### What works ✅
- **Full path exists:** Landing → date picker → Fleet → Car detail → Confirm dialog → Account.
- Login redirect preserves the return URL, so a guest clicking "Reserve" lands back on the same
  car after logging in. Dates are preserved in the URL.
- Confirmation dialog shows a clear summary (car, dates, total) before committing.
- Success screen redirects to `/account` with a clear next step.
- `activeReservation` warning on the booking card — user sees if they already have an open booking.

### What's broken or missing 🔴
**1. Back link on car detail goes to the landing page, not the fleet.**
`href="/?start=...&end=..."` (line 1484 in ClientUI.tsx). If a user browsed the fleet, clicked
a car, then hit "Back", they'd go to the landing hero — losing their fleet browse context.
Should be `/fleet?start=...&end=...`.

**2. No real WhatsApp integration.**
The app prominently advertises "WhatsApp confirmation within 2h" (trust strip, booking success
screen, "How it works" step 3). But there is zero code that sends any message. When a client
books, nothing happens on WhatsApp — it's dead copy. Admin will never know unless they check
the dashboard manually.

**3. Two date pickers with completely different UX patterns.**
`HeroSearchBar` (landing page) and `DateRangePicker` (fleet + car detail) are separate
components with different interaction models. A user who set dates on the hero then goes to
the fleet page sees a completely different date picker widget. They're not in sync by design
(dates are passed via URL params) but the visual inconsistency is jarring.

**4. No price or sort filter on the fleet page.**
Users can only filter by car type. No price range slider, no sort by price/newest/seats.
On a real rental site this is table stakes.

**5. Dates default to today+3 on car detail even when no dates were picked.**
`ClientUI.tsx:1405-1406`: `startDate = todayStr()`, `endDate = plusDays(3)`. If a user
navigates directly to a car URL with no dates, they silently get a 3-day booking pre-selected.
The reserve button will be active and show a real price even though they never chose dates.
This leads to accidental bookings on wrong dates.

**6. Client can only cancel PENDING reservations, not CONFIRMED ones.**
In the account page, the cancel button only appears for PENDING status. If an admin confirms
the booking and then the client needs to cancel, they have no way to do it. No "request
cancellation" flow exists.

---

## Admin Reservation Flow

### What works ✅
- Status filter tabs (Toutes / En attente / Confirmée / etc.) with live counts.
- Confirm and Reject buttons on PENDING rows, reject reason dialog is clean.
- `autoComplete` mutation auto-runs on mount to mark past confirmed reservations as COMPLETED.
- "Contrat" button on CONFIRMED/COMPLETED rows.

### What's broken or missing 🔴
**7. Dashboard "Voir" link goes to the reservations LIST, not the specific reservation.**
`AdminUI.tsx:204`: `<Link to="/admin/reservations">Voir</Link>`. Every row in
"Demandes récentes" shows a "Voir" button that navigates to the full list, losing
which reservation the admin wanted to look at.
Should be: `/admin/reservations/${r.id}` (if ContractPage is accessible there) or at minimum
scroll to or highlight the row.

**8. Dashboard "Clients" stat uses hardcoded mock data.**
`AdminUI.tsx:174`: `["Clients", clients.length, Users]` — this is `clients` imported from
`rentalMock.ts`, not from Supabase. The dashboard will always show the same fake number
regardless of how many real users have registered.

**9. Dashboard "Revenue" is always "—".**
`["Revenue", "—", BarChart3]` — no revenue calculation exists at all. Even a simple
`allReservations.filter(r => r.status === "CONFIRMED").reduce(sum)` would be better.

**10. `autoComplete.mutate()` fires on every mount of AdminReservations.**
`AdminUI.tsx:524`. Every time any staff member opens the reservations page, a write mutation
runs against the DB. This is a side effect disguised as a page mount. It should be a
scheduled job (pg_cron or Edge Function), not a UI-triggered mutation.

**11. No real-time notifications for new bookings.**
Admin has to manually navigate to the reservations page to see new PENDING requests.
With Supabase Realtime this could show a live badge count in the sidebar. Without it,
a busy day could mean hours of delay before the admin sees a booking.

**12. AdminClients shows completely fake data.**
`AdminUI.tsx:831`: The entire client management page is one line rendering `clients` from
`rentalMock.ts`. No Supabase query. "History (N)" buttons do nothing. This page is
essentially a placeholder that looks real.

---

## Contract Flow

### What works ✅
- Form pre-populates if a contract already exists for that reservation (edit mode).
- Prints a clean, complete document with client, vehicle, and rental details.
- Save + Print are separate — staff can save draft then print later.

### What's broken or missing 🔴
**13. You can print without saving — you'd print stale data.**
The "Imprimer PDF" button calls `printContract(reservation, form)` directly from the current
React state, not from the saved DB record. If staff edit fields and click print before
clicking save, the printed contract won't match what's in the database.
Fix: Either disable print until saved, or print from `existingContract` (the DB record).

**14. No contract number / reference on the printed document.**
The printed contract has no ID, no reference number, no date of generation. Legally this is
weak — both parties need a unique identifier to refer back to.

**15. No back link / breadcrumb from ContractPage to the reservation.**
`ContractPage` lives at `/admin/reservations/:id` but there's no "Back to reservations" link.
Staff have to use the browser back button or the sidebar.

**16. Popup blocker will silently kill the print.**
`window.open("", "_blank", ...)` — browsers block popups by default unless triggered
directly from a user gesture. If the async `handleSave()` runs before print, the call is
outside the gesture event loop and will be blocked. Should use `window.open` synchronously
(before the async save) or render the printable content in an `<iframe>` on the page.

---

## Car CRUD Flow (Admin)

### What works ✅
- Full create / edit / delete cycle with toast feedback.
- Search by brand/model/matricule.
- Availability toggle inline in the table.
- Excel export for maintenance records.

### What's broken or missing 🔴
**17. `window.confirm()` for car deletion.**
`AdminUI.tsx:263`. Browser native `confirm()` is ugly, not branded, and can't be dismissed
with keyboard on some browsers. Should use the existing `Dialog` component.

**18. "Booked" label on `is_available = false` is misleading.**
The availability toggle shows "Booked" when `is_available` is false. But `is_available`
is a manual flag — admin can set it to false even if there are no active bookings (e.g.
car is at the mechanic). "Unavailable" or "Hors service" would be accurate. "Booked" implies
there's a customer reservation.

**19. No image management after upload.**
When creating a car you upload images. When editing you can "add more". But:
- No preview of images before submitting the form.
- No way to delete individual images from an existing car.
- No way to reorder images (first image is the main photo shown to clients).
Images are stored as a flat array with no metadata.

**20. Can't see a car's reservations from the car management page.**
To check if a car is booked on specific dates, admin has to leave AdminCars, go to
AdminReservations, and manually scan. There's no "View reservations for this car" link.

**21. Maintenance: unsaved rows are silently lost on navigation.**
The inline-editable maintenance table keeps local state. If a staff member adds a row,
edits it, then clicks away (different sidebar link) without clicking the checkmark save
button, the row disappears with no warning.

---

## Auth / Registration Flow

### What works ✅
- CIN is auto-formatted to 8 digits (numeric only) on input.
- Password show/hide toggle.
- Email confirmation required before login.
- Redirect after login restores the page the user was trying to access.

### What's missing 🔴
**22. No password strength requirement.**
Any password is accepted — `signUpClient` passes it directly to Supabase with no client-side
minimum length check. A user can register with password "1".

**23. No phone number validation.**
Phone field accepts anything. No format check, no Tunisian number format hint (+216...).

**24. "Succès !" heading reused on email-confirm screen.**
`ClientUI.tsx:1772`: after registering, the success screen shows `{t.bookingSuccess}` —
the same translation key used for a successful booking. If the language is French this says
"Réservation confirmée !" which makes no sense as a registration success message.

---

## Summary Table

| Flow | Score | Biggest gap |
|---|---|---|
| Client booking | 6/10 | Wrong back link, no date validation, default dates trap |
| Fleet browsing | 5/10 | No price filter, no sort, inconsistent date picker |
| Admin reservations | 4/10 | Mock client data, dashboard Voir broken, no realtime |
| Contract | 5/10 | Can print stale data, no contract ID, popup blocker risk |
| Car CRUD | 6/10 | window.confirm, no image management, "Booked" label |
| Maintenance | 6/10 | Unsaved row loss, inline table UX is unusual |
| Auth | 7/10 | No password rules, wrong success message |
| **Overall UX** | **5/10** | Flows exist but several are half-built or broken |

---

## Priority UX Fix Order

1. 🔴 Fix back link on car detail (`/fleet` not `/`)
2. 🔴 Remove or implement the WhatsApp promise — don't advertise what doesn't exist
3. 🔴 Fix AdminClients to use real Supabase data
4. 🟠 Fix dashboard "Voir" link to go to the specific reservation
5. 🟠 Compute and display real revenue on dashboard
6. 🟠 Fix print-before-save bug in ContractPage
7. 🟠 Remove default date trap on car detail (don't pre-fill dates when none were chosen)
8. 🟠 Replace `window.confirm` with a Dialog for car deletion
9. 🟡 Add image preview + delete in car form
10. 🟡 Move `autoComplete.mutate()` out of UI into a scheduled job
11. 🟡 Add price filter + sort to fleet page
12. 🟡 Fix wrong translation key on registration success screen
13. 🟡 Add password minimum length validation
