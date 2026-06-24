# Feature: Hero Search Bar — Date-to-Fleet Flow

## Rating: 7 / 10

### What's solid
- Live range preview as the mouse hovers over the calendar (correct visual feedback)
- Dates survive the navigation and carry through to the car detail page and reservation form
- Reversed-date correction: if the user clicks end before start, the app swaps them silently
- `useAvailableCars` uses correct interval-overlap logic on Supabase — it won't show a car that is PENDING or CONFIRMED for any overlapping day
- Graceful mock fallback — works in development without a connected Supabase
- **Search button is the only navigation trigger** — picking dates fills the fields only; user confirms with the button, no accidental redirects

### What brings it down
- **No date validation on the URL** — anyone can hand-craft `/fleet?start=abc&end=xyz` and the query runs anyway; the app should validate both params are valid ISO dates with `start < end`
- **No minimum rental duration** — `start < end` passes even for a 1-hour difference; should enforce at least 1 full day
- **No maximum advance booking** — user can pick dates 10 years from now with no warning
- **Mock fallback is invisible** — when Supabase is empty, the client sees all mock cars as "available" with no indication that real availability is not being checked
- **No location field** — the search bar has a location label in the UI copy (`t.locationLabel`) but the field is decorative; it does nothing and is not sent to the fleet page

---

## What it does
The search bar on the landing page lets the user pick a pickup date and a return date.
When they confirm, the app navigates to `/fleet?start=YYYY-MM-DD&end=YYYY-MM-DD`.
The fleet page reads those URL params and shows **only the cars that are not booked** for that period.

---

## Does it actually work?

**Yes — when Supabase is connected and has data.**
**Partially — when Supabase is empty or unreachable (falls back to mock cars).**

See the "fallback" section below for the exact behaviour.

---

## Step-by-step flow

### 1. Landing page mounts (`/`)

`LandingPage` reads `?start` and `?end` from the URL with `useSearchParams`:

```ts
// ClientUI.tsx ~line 927
const startDate = searchParams.get("start") ?? "";
const endDate   = searchParams.get("end")   ?? "";
```

Both are empty strings on first load (no params yet).

---

### 2. User opens the calendar

The `HeroSearchBar` renders two clickable pill-shaped fields: **Pickup** and **Return**.
Clicking either one opens a popover with a `react-day-picker` calendar.

Internal state inside `HeroSearchBar`:

| state | purpose |
|---|---|
| `calOpen` | whether the popover is visible |
| `pickingEnd` | `false` = user is picking the start date, `true` = picking the end |
| `pendingStart` | the start date the user just clicked, before they pick the end |
| `hovered` | the day the mouse is hovering — used to preview the range |

---

### 3. First click → picks the start date

```ts
function handleDayClick(day: Date) {
  if (!pickingEnd) {
    setPendingStart(day);   // store the start
    setPickingEnd(true);    // switch to "now pick the end"
  } else { ... }
}
```

The calendar highlights the selected start day and shows a live preview range
as the user moves the mouse toward the return date.

---

### 4. Second click → picks the end date and fires navigation

```ts
  } else {
    const start = pendingStart ?? selectedStart;
    if (day < start) { onDatesChange(toStr(day), toStr(start)); }  // reversed → still valid
    else             { onDatesChange(toStr(start), toStr(day)); }
    setCalOpen(false);
  }
```

`onDatesChange` is the `setDates` callback defined in `LandingPage`:

```ts
// ClientUI.tsx ~line 936
const setDates = (start: string, end: string) => {
  if (start && end) navigate(`/fleet?start=${start}&end=${end}`);
};
```

**At this exact moment the browser navigates to the fleet page.**
The popover closes, the user never has to click a separate "Search" button
(though the blue button also exists and calls `goToFleet()` which does the same thing).

---

### 5. Fleet page mounts (`/fleet?start=…&end=…`)

`FleetPage` reads the same params:

```ts
const startDate    = searchParams.get("start") ?? "";
const endDate      = searchParams.get("end")   ?? "";
const hasDateFilter = !!(startDate && endDate && startDate < endDate);
```

It then decides which hook to call:

```ts
const { data: availableCars } = useAvailableCars(startDate, endDate);
const { data: allCars }       = useAllCars();

const cars = hasDateFilter ? availableCars : allCars;
```

- **With dates** → `useAvailableCars` — only cars free for those dates
- **Without dates** → `useAllCars` — the full catalogue

---

### 6. `useAvailableCars` — the real availability check

```ts
// use-cars.ts
async function fetchAvailableCars(start: string, end: string) {
  // Step A: find all car_ids that are ALREADY booked during this period
  const { data: booked } = await supabase
    .from("reservations")
    .select("car_id")
    .in("status", ["PENDING", "CONFIRMED"])
    .lt("start_date", end)    // reservation starts before our end
    .gt("end_date", start);   // reservation ends after our start

  const bookedIds = booked.map(r => r.car_id);

  // Step B: return all cars that are NOT in that booked list
  const { data } = bookedIds.length
    ? await supabase.from("cars").select("*").not("id", "in", `(${bookedIds.join(",")})`)
    : await supabase.from("cars").select("*");

  return data;
}
```

The overlap condition `.lt("start_date", end).gt("end_date", start)` is the standard
interval-overlap test: two date ranges overlap when **A starts before B ends AND A ends after B starts**.

---

### 7. Fallback — mock data

```ts
// use-cars.ts line 28
if (result.length === 0) return MOCK_CARS.filter(c => !bookedIds.includes(c.id));
```

If Supabase returns zero cars (table empty or connection error), the hook silently
falls back to the hardcoded mock fleet in `src/data/rentalMock.ts`.
The booked-IDs filter still applies so the logic is consistent, but since there are
no real reservations in the mock, **all mock cars will appear available**.

---

## Concrete example

User picks **10 June → 15 June 2025**.

**URL after selection:**
```
/fleet?start=2025-06-10&end=2025-06-15
```

**Supabase query A (find booked cars):**
```sql
SELECT car_id FROM reservations
WHERE status IN ('PENDING', 'CONFIRMED')
  AND start_date < '2025-06-15'   -- reservation starts before our return
  AND end_date   > '2025-06-10';  -- reservation ends after our pickup
```

Suppose cars `uuid-abc` and `uuid-def` are booked. Then:

**Supabase query B (return free cars):**
```sql
SELECT * FROM cars
WHERE id NOT IN ('uuid-abc', 'uuid-def');
```

The fleet page renders only those cars, each `CarCard` linked as:
```
/car/uuid-xyz?start=2025-06-10&end=2025-06-15
```
so the dates carry through to the car detail page and the reservation form is pre-filled.

---

## What is NOT working / at risk

| Issue | Impact |
|---|---|
| No minimum stay enforced | User can pick same day start and end (`start < end` check passes for same-day but `diffDays` returns 0) |
| No maximum advance booking enforced | User could pick dates 5 years in the future |
| `MOCK_CARS` fallback has no real reservations | During development without Supabase, all cars always appear free |
| No loading skeleton on the landing page itself | If the user lands with `?start=&end=` already in the URL, the fleet page loads with a spinner but the landing page shows nothing special |
| Dates are passed as plain strings in the URL | Easy to tamper with — the fleet page should validate that `start < end` and both are valid ISO dates before querying |
