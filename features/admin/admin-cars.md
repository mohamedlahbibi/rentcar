# Feature: Admin Car Management

## Rating: 9 / 10

### What's solid
- Full CRUD with pre-populated edit form, fully in French
- Duplicate car — pre-fills form, clears matricule
- Inline availability toggle with AlertDialog confirmation
- Bulk select with floating action bar — set many cars available/unavailable at once
- Cloudinary image upload: multi-image, drag-to-reorder, per-image delete with confirm, lightbox
- COUVERTURE badge on first image; cover shows as thumbnail in the fleet table
- Upcoming reservations badge + popover inline in the table
- Car detail page (`/admin/cars/:id`) — specs, gallery, full reservation history, maintenance summary
- Export fleet to Excel (filtered results)
- Odometer update when marking a reservation COMPLETED
- Delete dialog for both cars and maintenance rows

### What still brings it down
- Search is client-side only — fine for small fleets, will slow down at hundreds of cars
- `total_price` still set client-side (security bug — belongs to the reservation feature, not fixed here)
- H (seasonal pricing) not implemented — needs a DB schema change (`price_overrides` JSONB column)
- No drag reorder for new file previews — only existing images can be reordered before save
- Car detail page has no Edit button — admin has to go back to the list to edit

---

## Completed tasks

| # | Task | Status |
|---|---|---|
| 1 | Replace `window.confirm` with Dialog (car + maintenance) | ✅ |
| 2 | Fix "Booked" → "Disponible / Indisponible" | ✅ |
| 3 | Image preview in car form (new files + existing) | ✅ |
| 4 | Delete individual images with AlertDialog confirm | ✅ |
| 5 | Car thumbnail in table with fallback icon | ✅ |
| 6 | Upcoming reservations badge + popover per car | ✅ |
| A | Image drag reorder + COUVERTURE badge | ✅ |
| B | Fully French car form labels | ✅ |
| C | Availability toggle confirmation | ✅ |
| D | Duplicate car | ✅ |
| E | Bulk availability toggle with floating bar | ✅ |
| F | Car detail page (`/admin/cars/:id`) | ✅ |
| G | Export fleet to Excel | ✅ |
| H | Seasonal pricing | ❌ needs DB migration |
| I | Odometer update on reservation completion | ✅ |

---

## Remaining / future

### H. Seasonal pricing
- Requires new `price_overrides JSONB` column on `cars` table
- UI: accordion in CarDialog to add date ranges with custom prices
- Client site picks the right price based on reservation dates

### Quick wins
- Add Edit button on car detail page (opens CarDialog)
- Drag reorder for new file previews (before upload)
- Server-side search once fleet grows past ~200 cars
