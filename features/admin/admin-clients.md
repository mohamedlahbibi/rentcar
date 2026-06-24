# Feature: Admin Client Management

## Rating: 8.5 / 10

### What's solid
- Real Supabase data — every registered client is visible, ordered by creation date
- Search bar: instant client-side filter on name, CIN, email, and phone
- Per-client stats on the list card: completed rental count + total TND spent
- Client name is a link — clicking goes directly to the detail page
- Blocked clients show a red "Bloqué" badge on both the list and the detail page
- Detail page: full profile (CIN, permis, email, phone, address, member-since date), stats summary, complete reservation history with status badges
- Edit profile dialog: admin can fix name, phone, address — email/CIN/permis are intentionally locked
- Block / unblock toggle: one click, immediate feedback toast, reflected live via React Query cache invalidation
- Export to Excel: exports the currently filtered list including stats columns (SheetJS, same pattern as reservations export)
- Dashboard "Clients" stat now pulls from real data

### What brings it down
- No pagination on the list — with 500+ clients the DOM will get heavy
- Stats on the list card count only COMPLETED reservations; CONFIRMED (currently rented) are excluded from the total
- No "add client" button directly from the clients page (only accessible via the walk-in reservation dialog)
- Block does not yet prevent the client from submitting new reservations on the client-side UI

---

## Current state

| Item | Status |
|---|---|
| List clients | ✅ real Supabase data |
| Search / filter | ✅ done |
| Client detail page | ✅ done |
| Reservation history per client | ✅ done |
| Edit client profile (admin) | ✅ done |
| Block / flag client | ✅ done — `is_blocked` column migrated |
| Client stats (total spent, # rentals) | ✅ done |
| Export to Excel | ✅ done |

---

## Tasks

### 1. Replace mock data with real Supabase query ✅
**File:** `AdminUI.tsx` — `AdminClients`
Real clients from `useAllClients()`, loading state, ordered by `created_at` desc.

---

### 2. Add search bar ✅
**File:** `AdminUI.tsx` — `AdminClients`
Client-side filter on name, CIN, email, phone. Instant, no extra DB call.

---

### 3. Reservation count + total spent per client ✅
**File:** `AdminUI.tsx` — `AdminClients`
Computed from already-loaded `useAllReservations()`. Shows completed count and sum of `total_price`.

---

### 4. Client detail page ✅
**File:** `AdminUI.tsx` — `AdminClientDetail`
**Route:** `/admin/clients/:id`
Full profile card, member-since date, complete reservation history table, total spent stat.

---

### 5. Edit client profile (admin override) ✅
**File:** `AdminUI.tsx` — `AdminClientDetail`
Dialog with name, phone, address. Email/CIN/permis locked. Uses existing `useUpdateProfile` hook.

---

### 6. Block / flag client ✅
**File:** `AdminUI.tsx` + `src/types/database.ts` + `src/hooks/use-reservations.ts`
`is_blocked` boolean column added to Supabase `users` table. `useToggleBlockClient` mutation. Block/unblock button on detail page. Blocked badge on list and detail. Toast feedback.

**Remaining gap:** the client-side booking flow does not yet check `is_blocked` before allowing a new reservation.

---

### 7. Export to Excel ✅
**File:** `AdminUI.tsx` — `AdminClients`
SheetJS export of the filtered list. Columns: Nom, CIN, Permis, Email, Téléphone, Adresse, Membre depuis, Nb locations, Total dépensé.

---

## Future features

### A. Enforce block on client-side booking ✅
**File:** `src/hooks/use-reservations.ts` — `useCreateReservation`
Added a `users.is_blocked` check before the conflict check. Throws `"Votre compte a été suspendu. Veuillez contacter l'agence."` if the client is blocked. Works for both the client UI and the admin walk-in flow.

---

### B. Pagination on the client list
**Why:** Once the agency has hundreds of clients, rendering the full list in one DOM pass will slow the page down.
**How:** Same pattern as `AdminReservations` — `PAGE_SIZE = 20`, slice `filtered`, page controls below the list. Any search change resets to page 0.

---

### C. Add client directly from the clients page
**Why:** Currently the only way to create a new client without a walk-in reservation is via the walk-in dialog. The clients page has no "New" button.
**How:** Wire the `AdminShell` `onNew` prop to open the existing `NewClientDialog` (already used inside `CreateWalkInDialog`). After creation, the query cache is invalidated and the new client appears at the top of the list.
