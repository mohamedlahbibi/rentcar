# Feature: Fleet Page

## Rating: 7 / 10

### What's solid
- When dates are provided in the URL (`?start=…&end=…`), the page switches from `useAllCars()` to `useAvailableCars(start, end)` — only cars that have no overlapping PENDING/CONFIRMED reservation are shown
- The date range picker carries over from the homepage; dates can be cleared with one click
- Car type filter pills (Citadine / SUV / Berline / Utilitaire / Tous) work client-side
- Car count display updates live as filters change: "N véhicules disponibles · 10 juil → 15 juil"
- Skeleton loaders during data fetch
- Empty state with message when no cars match
- RTL support via `dir="rtl"` for Arabic

### What brings it down
- **No price filter or sort** — client cannot sort by cheapest, most expensive, or filter to a max budget
- **No transmission or seats filter** — a client looking for an automatic or a 7-seater has to scroll through everything
- **No search by name/brand** — typing "Hyundai" does nothing
- The type filter is the only filter — all other attributes (fuel, year, seats) are invisible on the fleet page
- No "sort by" dropdown (price ↑↓, newest, available soonest)
- The date picker is top-of-page only — there is no way to change dates without scrolling back up on a long fleet page

---

## Current state

| Item | Status |
|---|---|
| List all cars (real data) | ✅ done |
| Availability filter by dates | ✅ done |
| Car type filter pills | ✅ done |
| Car count | ✅ done |
| Loading skeleton | ✅ done |
| Empty state | ✅ done |
| Price sort / filter | ❌ missing |
| Transmission / seats filter | ❌ missing |
| Search by brand / model | ❌ missing |

---

## Future features

### A. Price range filter
**Why:** A client on a budget wants to see only cars under 150 TND/jour without scrolling past the Teslas.
**How:** Add a two-handle range slider or min/max inputs above the grid. Filter `cars` array client-side: `c.price_per_day >= min && c.price_per_day <= max`. Show the active range as a chip that can be cleared.

---

### B. Sort dropdown
**Why:** "Prix croissant" is the most natural sort for a price-conscious client. "Disponibilité" (soonest available) would also be valuable.
**How:** Add a `<Select>` with options: Prix ↑, Prix ↓, Année (récente), Kilométrage ↑. Apply `Array.sort` on the filtered array. No new DB query needed.

---

### C. Transmission + seats filter chips
**Why:** A family of 5 needs 7 seats. A non-driver of manual needs automatic. These are hard blockers that the type filter doesn't cover.
**How:** Add two small chip groups below the type pills: Transmission (Tous / Manuelle / Automatique) and Sièges (Tous / 5 / 7+). Stack with the type and date filters.

---

### D. Sticky date picker on scroll
**Why:** On a fleet of 20+ cars the user has to scroll back to the top to change dates.
**How:** Stick the date picker row to the top of the `<main>` area (below the header) once the user scrolls past the page header. The same `DateRangePicker` component, just with `position: sticky`.
