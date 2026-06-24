# Feature: Admin Reservation Management

## Rating: 8.5 / 10

### What's solid
- Status filter tabs (Toutes / En attente / Confirmée / Refusée / Terminée / Annulée) with live counts
- Search bar: filters by client name, CIN, car brand/model, or matricule — client-side, instant
- Date range filter (Du / Au): overlap-based, stacks on top of status tabs and search
- Confirm flow: one click → status becomes CONFIRMED
- Reject flow: dialog asks for a reason → stored in `rejection_reason`, shown on the card in red
- "Terminer" button on CONFIRMED reservations → asks for return km → marks COMPLETED and updates car mileage
- Auto-complete: fixed — runs once per browser session via `useRef` guard, not on every mount
- Contract link: CONFIRMED and COMPLETED reservations show a "Contrat" button
- Excel export: exports the currently filtered list via SheetJS (Client, CIN, Voiture, Matricule, Début, Fin, Jours, Prix, Statut)
- Walk-in / manual reservation: admin opens a dialog, picks a client + car + dates, price is auto-calculated with override — inserts directly as CONFIRMED
- Calendar / Gantt view: monthly table, each car = one row, each reservation = a colored band spanning its dates, colored by status, month navigation, today's column highlighted
- Pagination: PAGE_SIZE = 20, page N / M controls, resets when any filter changes

### What brings it down
- WhatsApp notifications are still a no-op mock — client has no way to know their reservation was confirmed or rejected without logging in
- Calendar is read-only — no drag to reschedule, no click-through to act on a reservation from the calendar
- No reservation editing — once a reservation is created there is no way to change its dates, car, or price without going to the DB directly
- Walk-in client dropdown is only as good as the Supabase `users` table — if a walk-in is a brand new person who never registered online, the admin cannot create them from this screen

---

## Current state

| Item | Status |
|---|---|
| List all reservations | ✅ done |
| Filter by status | ✅ done |
| Search by client / car | ✅ done |
| Date range filter | ✅ done |
| Confirm reservation | ✅ done |
| Reject with reason | ✅ done |
| Mark as completed + odometer update | ✅ done |
| Auto-complete past reservations | ✅ fixed — runs once per session |
| Contract link | ✅ done |
| Export to Excel | ✅ done |
| Walk-in / manual reservation | ✅ done |
| Calendar / Gantt view | ✅ done |
| Pagination | ✅ done |
| WhatsApp notification | ❌ mocked — does nothing |
| Reservation editing (change dates / car) | ❌ missing |
| Create client from walk-in dialog | ✅ done |
| Calendar: click band to act on reservation | ❌ missing |

---

## Completed tasks

### 1. Fix `autoComplete` firing every mount ✅
**File:** `AdminUI.tsx` — `AdminReservations`
Added a `useRef(false)` flag (`autoCompleteRan`). The mutation now fires at most once per browser session, regardless of how many times the component mounts or re-mounts.

### 2. Search bar ✅
**File:** `AdminUI.tsx` — `AdminReservations`
Client-side filter on the already-loaded array. Matches `user.name + user.cin + car.brand + car.model + car.matricule` (case-insensitive). Stacks with status and date filters.

### 3. Date range filter ✅
**File:** `AdminUI.tsx` — `AdminReservations`
Two date inputs (Du / Au) in the toolbar. Overlap condition: `r.start_date < filterEnd && r.end_date > filterStart`. Stacks with status and search. Any filter change resets the page to 0.

### 4. Export to Excel ✅
**File:** `AdminUI.tsx` — `AdminReservations` → `handleExport`
SheetJS is already installed. Exports the currently filtered + searched list. Filename includes today's date. Button is disabled when the filtered list is empty.

### 5. Walk-in / manual reservation ✅
**Files:** `AdminUI.tsx` — `CreateWalkInDialog`; `use-reservations.ts` — `useCreateReservation` + `useAllClients`
- `useCreateReservation` now accepts an optional `status` field (defaults to `PENDING`; walk-in passes `CONFIRMED`)
- `useAllClients` queries the Supabase `users` table ordered by name
- Dialog: client dropdown, car dropdown (available cars only), start/end dates, auto-calculated price with override
- On submit: conflict check runs, then inserts as CONFIRMED

### 6. WhatsApp notification on status change ❌ (deferred)
**File:** `AdminUI.tsx` — `handleConfirm` and `handleReject`
Requires a WhatsApp Business API account. Credentials go in `.env` (`VITE_WA_TOKEN`, `VITE_WA_PHONE_ID`). Message templates: confirmation and rejection. Follow the `src/lib/cloudinary.ts` pattern for the API wrapper.

### 7. Calendar / Gantt view ✅
**File:** `AdminUI.tsx` — `ReservationCalendar`
Monthly Gantt table. Columns = days of month. Rows = distinct cars that have at least one reservation in the month (filtered by the active filters). Reservation bands built via segment algorithm (handles multi-month reservations correctly). Colors: yellow = PENDING, green = CONFIRMED, grey = COMPLETED/CANCELLED, red = REJECTED. Today's column is highlighted. Month navigation with ← / → buttons.

### 8. Pagination ✅
**File:** `AdminUI.tsx` — `AdminReservations`
PAGE_SIZE = 20. List view shows `filtered.slice(page * 20, (page + 1) * 20)`. Page controls only appear when `totalPages > 1`. Any filter or search change resets `page` to 0 via `useEffect`.

---

## Future features

### A. WhatsApp notification on status change
**Why:** The client has no way to know their reservation was confirmed or rejected without logging in and checking. A WhatsApp message solves this instantly for a Tunisian audience.
**How:** After `updateStatus.mutateAsync(...)` succeeds in `handleConfirm` / `handleReject`, call a wrapper around the WhatsApp Cloud API. Two message templates:
- Confirmation: "Votre réservation pour [Voiture] du [date] au [date] a été confirmée. Merci de vous présenter à l'agence."
- Rejection: "Votre réservation a été refusée. Raison : [reason]."
**Requires:** WhatsApp Business API account + `VITE_WA_TOKEN` + `VITE_WA_PHONE_ID` in `.env`.

---

### B. Reservation editing (change dates, car, or price)
**Why:** Mistakes happen — a client calls to move their rental by two days, or the originally booked car breaks down and needs to be swapped. Right now the admin has no choice but to reject and re-create, which loses history.
**How:** Add an "Éditer" button on each card. Opens a dialog pre-filled with current values (same layout as walk-in dialog). On submit: run conflict check excluding the current reservation, then `UPDATE reservations SET ...`. Update car mileage if car changes.

---

### C. Create new client directly from walk-in dialog
**Why:** A brand new walk-in customer who never registered online won't appear in the client dropdown. Currently the admin has to go to the Clients page, create the client there, then come back to create the reservation — two separate flows.
**How:** Add a "Nouveau client" link inside the client Select that opens a nested mini-form (name, CIN, phone). On save, inserts into `users` and pre-selects the new client in the walk-in dialog.

---

### D. Calendar: click band to open reservation popover
**Why:** The calendar is currently read-only and informational. Being able to click a reservation band to see full details (client, dates, price, status) — and confirm/reject directly from the popover — would make the calendar actually actionable.
**How:** Wrap each `<td>` band in a `Popover`. The popover shows the reservation card content plus action buttons (Confirmer, Refuser, Terminer, Contrat). Mirrors the card in list view.

---

### E. Calendar: drag to reschedule
**Why:** The most natural way to move a reservation from July 5–10 to July 8–13 is to drag it on the calendar.
**How:** Use a drag library (e.g., `@dnd-kit/core`) or native HTML5 drag events. On drop: calculate new start/end date from the target column, run conflict check, update the reservation. Show a ghost while dragging. This is a significant effort — implement D first.

---

### F. Bulk actions (confirm / reject / export selected)
**Why:** When 15 reservations come in overnight, confirming them one by one is slow. A checkbox on each card + "Confirmer tout" button would save the admin a lot of clicks.
**How:** Add a `Set<string>` state for selected IDs. Checkbox on each card. Toolbar shows "N sélectionnée(s)" when any are checked, with bulk Confirmer / Refuser / Exporter buttons. Bulk update: loop `updateStatus.mutateAsync` calls or a single Supabase `UPDATE ... IN (ids)` call.

---

### G. Payment and deposit tracking
**Why:** The agency collects a deposit at pickup and receives full payment at return. There is currently no record of whether a reservation has been paid, how much the deposit was, or if there is a remaining balance.
**How:** Add `deposit_paid: number | null`, `amount_paid: number | null`, `payment_method: 'cash' | 'virement' | null` to the `reservations` table (or a separate `payments` table). Show a payment badge on each card. "Enregistrer un paiement" action updates these fields. Export picks up the payment columns automatically.

---

### H. Sort the list
**Why:** With 50+ reservations in one status tab, the admin might want to see the most expensive ones first, or sort by start date ascending to see what's coming up next.
**How:** Add a sort dropdown: "Date de début ↑", "Date de début ↓", "Prix ↑", "Prix ↓", "Nom client A→Z". Apply after all filters using `Array.sort`. No DB query needed — sort the client-side array.

---

### I. Revenue analytics panel
**Why:** The owner wants a quick answer to "how much did we make this month?" without exporting to Excel and summing a column.
**How:** Add a collapsed summary row above the list: total reservations in current filter, sum of `total_price` for CONFIRMED + COMPLETED reservations, average rental duration in days. Updates live as filters change.

---

### J. SMS / email notification fallback
**Why:** Not every client has WhatsApp. If WhatsApp delivery fails (number not on WhatsApp, API error), the client gets nothing.
**How:** After a failed WhatsApp send, fall back to an SMS via Twilio or a transactional email via Resend. Store `notification_sent_at` on the reservation so the UI can show a "notifié" badge.

---

### K. Convert `autoComplete` to a Supabase Edge Function cron
**Why:** Even with the `useRef` fix, the mutation runs once per browser session per admin. A server-side cron that runs once per day at midnight is the correct architecture — no client needs to be open, and it can't be run multiple times accidentally.
**How:** Create a Supabase Edge Function that runs `UPDATE reservations SET status = 'COMPLETED' WHERE status = 'CONFIRMED' AND end_date < NOW()`. Schedule it via Supabase's built-in cron (`pg_cron`). Remove the `autoComplete` mutation from the frontend entirely.
