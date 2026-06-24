# Feature: Account Page

## Rating: 8.5 / 10

### What's solid
- Two-tab layout: "Mes réservations" / "Mon profil" with a segmented pill control
- Reservations split into upcoming (PENDING + CONFIRMED) and history (COMPLETED / CANCELLED / REJECTED)
- `ReservationRow` shows: car thumbnail, brand + model, short reservation ID, dates, day count, price, status badge
- Cancel is a two-step flow: first click shows "Confirmer ? / Oui, annuler / Retour" inline — no accidental cancels
- Rejected reservations show a red card border + a red "Motif du refus :" box with the admin's reason
- Contract download intentionally absent — contract is handed over physically at pickup by the owner
- Profile tab: name, email, phone, CIN in a clean grid
- Inline edit mode for name, phone, address — "Enregistré ✓" flash on save
- Loading spinner covers both profile and reservations queries
- "Browse fleet" CTA in the empty upcoming reservations state
- Member-since date in the page header (month + year)

### What brings it down
- **Header shows only "Logout"** for logged-in clients — no name, no avatar, no "Mon compte" link. A client on another page has no header indicator they are logged in
- No reservation detail drill-in — the row is a summary and `/account/reservation/:id` still renders the full account page again

---

## Current state

| Item | Status |
|---|---|
| Upcoming reservations | ✅ done |
| History reservations | ✅ done |
| Cancel PENDING — two-step confirmation | ✅ done |
| Rejection reason with label + red styling | ✅ done |
| Contract download | N/A — physical handover at pickup |
| Profile view (name, email, phone, CIN) | ✅ done |
| Profile edit (name, phone, address) | ✅ done — error toast on failure |
| Loading state | ✅ done |
| Empty state with CTA | ✅ done |
| Permis number in profile view | ✅ done |
| Profile save error feedback | ✅ done — toast "Erreur lors de la sauvegarde." |

---

## Tasks

### 1. Fix profile save error handling
**Why:** If the Supabase update fails (network drop, RLS policy), `editMode` silently closes and the client sees their old data with no explanation.
**How:** Wrap `saveProfile` in try/catch. On error: keep `editMode` open, show a toast "Erreur lors de la sauvegarde. Réessayez." On success: close edit mode + show "Enregistré ✓" flash as today.

---

### 2. Show permis number in profile view
**Why:** It's stored in the DB, shown on the admin detail page, but invisible to the client themselves.
**How:** Add `{ label: t.permisId, value: profile?.permis_id }` to the read-only profile grid. One line.

---

## Future features

### A. Change password from profile tab
**Why:** A logged-in client who wants to change their password has to log out and go through "forgot password." There is no in-app flow.
**How:** Add a "Changer le mot de passe" collapsible section in the profile tab. Two fields: new password + confirm. On save: `supabase.auth.updateUser({ password })`. Toast on success/error.

---

### ~~B. Logged-in indicator in header~~ ✅ done
Avatar pill with name initial + truncated name + ChevronDown. Dropdown: "Mon compte" → `/account`, "Déconnexion". Backdrop div closes it on outside click. Overlay-aware coloring inherited from `HeaderActions`.

---

### ~~C. Reservation detail page~~ ✅ done
`AccountReservationDetail` at `/account/reservation/:id`. Shows: car hero image, brand/model, status badge, short ID, date breakdown (start, end, duration, price/day, total), full car spec grid (fuel, transmission, seats, type, color, mileage, matricule, year), rejection reason block (REJECTED only), two-step cancel action (PENDING only → navigates back to `/account` on confirm). Reservation row thumbnail+info wrapped in `<Link>` to the route; cancel button left outside so it doesn't trigger navigation.
