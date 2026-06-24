# Feature: Landing Page

## Rating: 7 / 10

### What's solid
- Cinematic hero: full-viewport photo background, dark gradient overlay, bottom-aligned headline
- Sticky header transitions from transparent → frosted glass on scroll — polished UX detail
- Date range search bar on the hero: selecting dates navigates directly to `/fleet?start=…&end=…`
- Featured cars section pulls real data from Supabase (`useAllCars().slice(0, 4)`) with skeleton loaders
- "Voir toute la flotte · N véhicules" counter is live
- Stats strip, "How It Works", Testimonials, CTA section, Footer are all present
- Multilingual (FR / EN / AR) via `useLang()` — all copy goes through the i18n layer
- RTL layout for Arabic via `dir="rtl"` on the root element
- Scroll bounce indicator animates on the hero

### What brings it down
- **Stats strip values are hardcoded** in the i18n strings ("+300 clients", "24h support") — they do not come from the database and will never update automatically
- **Testimonials are fake** — three invented reviews with made-up names. Real clients can't leave reviews
- The 4 featured cars on the homepage are `allCars.slice(0, 4)` — no curation, no "most booked" logic, no featured flag
- The CTA phone number `+21671000000` is a placeholder — it must be updated to the real agency number
- The footer has no real agency address, hours, or social links
- No structured data / SEO meta tags — the page title and description are generic

---

## Current state

| Item | Status |
|---|---|
| Hero with date search | ✅ done |
| Sticky scrolling header | ✅ done |
| Featured cars (real data) | ✅ done |
| Stats strip | ⚠️ hardcoded values |
| How It Works section | ✅ static content |
| Testimonials | ✅ commented out |
| CTA section | ✅ done |
| Footer | ✅ real contact info |
| Multilingual (FR/EN/AR) + RTL | ✅ done |
| SEO meta tags | ✅ done |

---

## Future features

### A. Real stats from the database
**Why:** "+300 clients" and "125 TND/j" are lies today. As the agency grows, the numbers should reflect reality.
**How:** Add a `useAgencyStats()` hook that queries `count(users)`, `count(reservations where status = COMPLETED)`, and `min(cars.price_per_day)`. Show them in the stats strip.

---

### B. Featured / curated cars
**Why:** Showing the first 4 cars in DB insertion order is arbitrary. The owner should be able to highlight specific cars (e.g. the newest SUV, the best-value city car).
**How:** Add a boolean `is_featured` column to `cars`. Filter `useAllCars()` for featured cars on the landing page. Admin toggle in the car edit form.

---

### C. Real agency contact info in footer + CTA
**Why:** The phone number, address, and hours in the footer are placeholders. A client who wants to call before booking will see a fake number.
**How:** Replace hardcoded values with env vars (`VITE_AGENCY_PHONE`, `VITE_AGENCY_ADDRESS`) or a `settings` table in Supabase. The CTA `tel:` link must use the real number.

---

### D. SEO meta tags
**Why:** The page has no `<title>` beyond the Vite default, no `<meta description>`, no Open Graph tags. It will rank poorly and share badly on social media.
**How:** Use `react-helmet-async` or Vite's `index.html` to set a proper title, description, and OG image for each page.
