# Feature: Car Detail Page

## Rating: 7.5 / 10

### What's solid
- Image gallery: main image + up to 3 side thumbnails, click-to-switch with selected outline
- Full spec grid: year, fuel, transmission, seats, mileage, color
- Car notes/description shown when present
- Sticky booking card: price per day, date picker (with booked ranges blocked), day count, price breakdown, total in terracotta
- Booked ranges from Supabase are passed to the date picker — already-booked dates are visually unavailable
- "Active reservation" warning banner if the client already has a PENDING or CONFIRMED reservation for any car
- Redirect to `/login?redirect=…` if client tries to reserve without being logged in — returns to the same page after login
- Confirmation dialog: summary of car + dates + total price before final submit
- Success state: checkmark + "Voir mon compte" button after booking
- Error display in the dialog if the reservation fails (e.g. conflict, blocked client)
- Loading and 404 states handled

### What brings it down
- **Back link uses `<a href>` instead of `<Link>`** — navigating back triggers a full page reload, losing the React state
- **No image lightbox / fullscreen** — clicking the main image does nothing; client can't zoom in
- Only 3 thumbnails are shown (`images.slice(1, 4)`) — if the car has 5+ photos the extras are invisible
- The "WhatsApp confirmation" note below the reserve button is a hardcoded i18n string, not a real link
- The `activeReservation` check prevents double-booking per client, but it blocks booking a *different* car while one reservation is PENDING — likely too restrictive
- No sharing button (copy link, WhatsApp share)

---

## Current state

| Item | Status |
|---|---|
| Image gallery (real data) | ✅ done |
| Specs grid | ✅ done |
| Sticky booking card | ✅ done |
| Booked dates blocked in picker | ✅ done |
| Active reservation warning | ✅ done |
| Redirect to login + return | ✅ done |
| Booking confirmation dialog | ✅ done |
| Success state | ✅ done |
| Error display | ✅ done |
| Image lightbox / fullscreen | ❌ missing |
| All images accessible | ⚠️ capped at 4 (1 main + 3 thumbs) |
| Back navigation (no reload) | ⚠️ `<a href>` causes reload |

---

## Future features

### A. Fix back navigation
**Why:** `<a href={`/?start=…`}>` causes a full page reload. The user's scroll position and any loaded state is lost.
**How:** Replace with `<Link to={…}>` or `<button onClick={() => navigate(-1)}>`. One-line fix.

---

### B. Image lightbox
**Why:** Car photos are small in the gallery layout. A client who wants to inspect the interior or check for damage needs to see the full image.
**How:** Wrap the main image in a click handler that opens a fullscreen overlay with arrow navigation between all images. Can be a simple CSS-only overlay or a small library like `yet-another-react-lightbox`.

---

### C. Show all images in gallery
**Why:** The admin may upload 6+ photos but the client can only see 4.
**How:** Replace the hardcoded `.slice(1, 4)` sidebar with a horizontal thumbnail strip below the main image that scrolls. Show all images. Clicking any thumbnail sets `activeImg`.

---

### D. Relax the active reservation check
**Why:** Blocking a client from booking *any* car because they have one PENDING reservation is too aggressive. A client might want to book a second car for a family member.
**How:** Change the check from "any PENDING/CONFIRMED" to "this specific car has an active reservation by this client." The real guard against double-booking is the conflict check in `useCreateReservation`.
