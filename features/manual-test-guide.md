# DriveEasy — Manual Testing Guide

A step-by-step checklist you can follow in the browser.
Each story has: **what to do**, **what should happen**, and **what would mean it's broken**.

---

## How to use this guide

1. Open the app in your browser
2. Go through each story one by one
3. ✅ = passed / ❌ = broken → note what went wrong

---

## 🔐 AUTH — Sign Up & Login

### A1 — New client signs up
1. Go to `/register`
2. Fill in: name, email, password, phone, CIN, permis number
3. Click **S'inscrire**
- ✅ Redirected to home or account page, logged in
- ❌ Error message / stays on register page

### A2 — Client logs in
1. Go to `/login`
2. Enter correct email + password
3. Click **Se connecter**
- ✅ Redirected to home, user menu visible
- ❌ "Invalid credentials" or nothing happens

### A3 — Wrong password
1. Go to `/login`
2. Enter correct email + **wrong** password
- ✅ Error message shown
- ❌ Logged in anyway

### A4 — Admin logs in
1. Go to `/login`
2. Enter admin credentials
- ✅ Redirected to `/admin` dashboard
- ❌ Redirected to client home

### A5 — Logged-in user visits login page
1. While logged in, go to `/login`
- ✅ Redirected away (no reason to see login again)
- ❌ Login page shown to already logged-in user

### A6 — User logs out
1. Click **Déconnexion** in the sidebar or header
- ✅ Redirected to home, no more user menu
- ❌ Still appears logged in

---

## 🏠 LANDING PAGE & FLEET

### L1 — Hero search works
1. Go to `/`
2. Pick a start date and end date in the date picker
3. Click **Chercher**
- ✅ Goes to fleet page with those dates in the URL
- ❌ Nothing happens / wrong dates passed

### L2 — Fleet page shows all available cars
1. Go to `/fleet`
- ✅ Cars are listed with photo, name, price
- ❌ Empty page / loading forever

### L3 — Car image auto-scrolls on hover
1. Go to `/fleet`
2. Hover your mouse over a car that has multiple photos
- ✅ Images cycle automatically every ~1 second
- ❌ Image stays the same / jumps only once

### L4 — Filter by car type
1. Go to `/fleet`
2. Click **SUV** filter
- ✅ Only SUVs shown
- ❌ All cars still showing / page crashes

### L5 — Search by date hides booked cars
1. Book a car for June 1–5 (see Reservation section)
2. Go to `/fleet?start=2026-06-02&end=2026-06-04`
- ✅ That car does not appear in results
- ❌ Car still shows as available

---

## 🚗 CAR DETAIL PAGE (Client)

### C1 — Open a car detail page
1. From fleet, click on any car
- ✅ Detail page loads with photo carousel, specs, booking widget
- ❌ Blank page / 404

### C2 — Carousel navigation with arrows
1. Open a car that has multiple photos
2. Click the **→** right arrow
- ✅ Next photo appears
3. Click the **←** left arrow
- ✅ Previous photo appears
4. Click a dot indicator at the bottom
- ✅ Jumps to that photo

### C3 — Thumbnail strip navigates too
1. On car detail, click a small thumbnail below the main photo
- ✅ Main photo changes to match
- ❌ Nothing happens

### C4 — Carousel wraps around
1. On the last photo, click **→**
- ✅ Goes back to the first photo (loops)
- ❌ Arrow disappears or page crashes

### C5 — Date picker defaults are pre-filled
1. Open a car from `/fleet?start=2026-06-01&end=2026-06-05`
- ✅ Booking widget already shows Jun 1–5
- ❌ Empty dates

### C6 — Price updates when dates change
1. Open a car (e.g. 125 TND/day)
2. Select 3 days
- ✅ Total shows **375 TND**
3. Change to 7 days
- ✅ Total updates to **875 TND**

### C7 — Not logged in → clicking Reserve redirects to login
1. Log out
2. Open a car, click **Réserver**
- ✅ Redirected to `/login?redirect=...`
- ❌ Error popup / nothing happens

---

## 📅 RESERVATION FLOW

### R1 — Client makes a reservation
1. Log in as a client
2. Open any available car
3. Pick valid dates, click **Réserver**, confirm in the dialog
- ✅ Success message, reservation appears in **Mon compte → Mes réservations**
- ❌ Error / no confirmation

### R2 — Client cannot book a car that is already booked for those dates
1. Book car X for June 1–5 (as Client A)
2. Log in as a different client (Client B)
3. Try to book car X for June 3–7
- ✅ Error: "Cette voiture n'est plus disponible pour ces dates."
- ❌ Booking goes through (double booking bug!)

### R3 — Adjacent dates ARE allowed
1. Car X is booked June 1–5
2. Try to book car X for June 5–9 (starts exactly when previous ends)
- ✅ Booking succeeds
- ❌ Error saying dates are unavailable

### R4 — Client cancels their own pending reservation
1. Make a reservation (it starts as PENDING)
2. Go to **Mon compte → Mes réservations**
3. Click **Annuler**
- ✅ Status changes to CANCELLED
- ❌ Button missing / nothing happens

### R5 — Booked dates are greyed out in the calendar
1. Car X is booked June 1–5
2. Open car X detail page
3. Open the date picker
- ✅ June 1–5 are greyed out / unselectable
- ❌ Those dates appear available

### R6 — Blocked client cannot reserve
1. Admin blocks a client (see Admin section)
2. Log in as that client
3. Try to make a reservation
- ✅ Error: "Votre compte a été suspendu."
- ❌ Reservation goes through

---

## 👤 CLIENT ACCOUNT PAGE

### AC1 — View reservations
1. Log in as client
2. Go to `/account`
- ✅ All their reservations listed with status, dates, car name
- ❌ Empty / wrong reservations shown

### AC2 — Edit profile info
1. Go to account page
2. Change phone number, click **Enregistrer**
- ✅ New phone saved, shown after reload
- ❌ Nothing changes

---

## 🛠️ ADMIN — CARS

### ADC1 — View car list
1. Log in as admin, go to `/admin/cars`
- ✅ Full fleet listed with image, brand, model, price
- ❌ Empty / loading forever

### ADC2 — Add a new car
1. Click **New** button
2. Fill in all fields (brand, model, year, matricule, price…)
3. Upload at least one photo
4. Click **Ajouter**
- ✅ Car appears in the list
- ❌ Error / car not saved

### ADC3 — Duplicate matricule is rejected
1. Try to add a car with a matricule that already exists
- ✅ Error about duplicate matricule
- ❌ Two cars with same matricule created

### ADC4 — Edit a car from the list
1. In `/admin/cars`, click the pencil/edit icon on any car
2. Change the price, click **Sauvegarder**
- ✅ New price shown in list
- ❌ Price unchanged / error

### ADC5 — Open car detail page
1. Click on a car name or its photo
- ✅ Goes to `/admin/cars/:id` with full carousel + specs + reservations

### ADC6 — Edit car from detail page
1. On the car detail page, click **Modifier**
- ✅ Edit dialog opens pre-filled with current data
2. Change a field and save
- ✅ Detail page refreshes with updated data
- ❌ Button missing / dialog empty / data not saved

### ADC7 — Image carousel on detail page works
1. On car detail page (admin), click the **→** arrow
- ✅ Next image shown
2. Click a thumbnail
- ✅ Main image changes
- ❌ Images not navigable

### ADC8 — Add images when editing a car
1. Click **Modifier** on a car
2. In the dialog, upload 2 new photos
3. Save
- ✅ Photos appear in the carousel on the detail page
- ❌ Old photos lost / new ones not saved

### ADC9 — Reorder images (drag & drop)
1. Click **Modifier** on a car with multiple photos
2. Drag the 2nd image to the 1st position
3. Save
- ✅ The image you dragged is now the cover photo
- ❌ Order unchanged

### ADC10 — Delete an image
1. Click **Modifier** on a car with photos
2. Hover over an image → click the **X**
3. Confirm deletion, save
- ✅ That photo no longer appears
- ❌ Photo still there after save

### ADC11 — Toggle availability
1. On a car row, toggle the availability switch
- ✅ Car marked unavailable / available, change reflected immediately
- ❌ Toggle snaps back / no change

### ADC12 — Delete a car
1. Click **Supprimer** on a car
2. Confirm the dialog
- ✅ Car removed from list
- ❌ Car still there / error

### ADC13 — "Retour" button is visible and works
1. Open any car detail page
2. Look at the top-left buttons
- ✅ **← Retour** button is clearly visible (not same color as background)
3. Click it
- ✅ Goes back to `/admin/cars`

---

## 📋 ADMIN — RESERVATIONS

### ADR1 — View all reservations
1. Go to `/admin/reservations`
- ✅ All reservations listed with client name, car, dates, status
- ❌ Empty / only own reservations

### ADR2 — Confirm a reservation
1. Find a PENDING reservation, click **Confirmer**
- ✅ Status changes to CONFIRMED
- ❌ Nothing changes / error

### ADR3 — Reject a reservation with a reason
1. Find a PENDING reservation, click **Rejeter**
2. Enter a reason (e.g. "Documents invalides")
- ✅ Status becomes REJECTED, reason saved
- ❌ No reason field / rejection goes through without reason

### ADR4 — Complete a reservation
1. Find a CONFIRMED reservation, click **Terminer**
- ✅ Status becomes COMPLETED
- ❌ Nothing happens

### ADR5 — Auto-complete past reservations
1. On the reservations page, click **Mettre à jour** (auto-complete button)
- ✅ All past CONFIRMED reservations become COMPLETED
- ❌ Nothing changes / pending ones also completed (bug)

### ADR6 — Open reservation detail
1. Click on a reservation row
- ✅ Full detail page with client info, car info, dates, contract section
- ❌ 404 / blank

### ADR7 — Generate contract (PDF)
1. On a CONFIRMED reservation detail, fill in the contract fields
2. Click **Générer PDF**
- ✅ PDF downloads / opens in new tab
- ❌ Nothing happens / error

---

## 👥 ADMIN — CLIENTS

### ADL1 — View client list
1. Go to `/admin/clients`
- ✅ All registered clients listed
- ❌ Empty

### ADL2 — View a client's profile and history
1. Click on a client name
- ✅ Profile page with CIN, phone, all reservations
- ❌ 404 / no reservation history

### ADL3 — Block a client
1. On a client, click **Bloquer**
- ✅ Client marked as blocked
2. Log in as that client and try to reserve
- ✅ Error: "Votre compte a été suspendu."
- ❌ Client can still reserve

### ADL4 — Unblock a client
1. On a blocked client, click **Débloquer**
- ✅ Client can now make reservations again

### ADL5 — Add a client manually
1. Click **Nouveau client**, fill in the form
- ✅ Client appears in list
- ❌ Error / not saved

---

## 🔧 ADMIN — MAINTENANCE

### ADM1 — View maintenance for a car
1. Go to `/admin/cars/:id/maintenance`
- ✅ Maintenance history table shown
- ❌ Blank / 404

### ADM2 — Add a maintenance record
1. Fill in the inline row (date, type, km, cost…)
2. Click **Sauvegarder**
- ✅ Row saved and appears in history
- ❌ Error / not saved

### ADM3 — Edit an existing record
1. Change a value in an existing row
2. Save
- ✅ Updated value persisted after reload
- ❌ Reverts to old value

### ADM4 — Delete a maintenance record
1. Click the trash icon on a row, confirm
- ✅ Row removed
- ❌ Row still there

---

## 👔 ADMIN — MANAGERS

### ADG1 — View staff list
1. Go to `/admin/managers`
- ✅ Staff members listed with role
- ❌ Empty / error

### ADG2 — Invite a new manager
1. Click **Inviter**, fill name, email, password, role = Manager
2. Submit
- ✅ New manager appears in list
- ❌ Error / not saved

### ADG3 — Duplicate email is rejected
1. Try to invite a staff member with an email already in use
- ✅ Error shown
- ❌ Two accounts with same email

### ADG4 — Remove a staff member
1. Click **Supprimer** on a manager, confirm
- ✅ Removed from list
- ❌ Still there

---

## 🌍 LANGUAGE SWITCH

### LNG1 — Switch to Arabic
1. Click the language toggle (FR / AR / EN)
2. Select **AR**
- ✅ Page text switches to Arabic, layout mirrors right-to-left
- ❌ Still in French / layout breaks

### LNG2 — Switch back to French
1. From Arabic, select **FR**
- ✅ Back to French, layout normal
- ❌ Mixed languages / broken layout

---

## 🔒 SECURITY & ACCESS CONTROL

### SEC1 — Client cannot access admin pages
1. Log in as a regular client
2. Manually go to `/admin/cars`
- ✅ Redirected to home / access denied
- ❌ Admin panel visible to client

### SEC2 — Unauthenticated user cannot access admin
1. Log out
2. Go to `/admin`
- ✅ Redirected to login
- ❌ Admin page loads

### SEC3 — Manager cannot do admin-only actions
1. Log in as a Manager (not Admin)
2. Try to access `/admin/managers`
- ✅ Access denied or page hidden
- ❌ Manager can invite/remove staff (should only be Admin)

---

## 🧪 EDGE CASES TO TRY MANUALLY

| Scenario | Expected |
|---|---|
| Book a car for exactly 1 day (Jun 5 → Jun 6) | Should work, price = 1 × daily rate |
| Try to book with end date = start date | Should be blocked |
| Try to book with end date before start date | Should be blocked |
| Book a car for a very long period (e.g. 60 days) | Should work |
| Two tabs open: book same car at exact same time | Only one should succeed (test this manually — it may double-book, which is the known race condition) |
| Upload 10 photos to a car | Should all save and be navigable in carousel |
| Car with no photos | Should show placeholder, no carousel crash |
| Client with 0 reservations views account page | Should show empty state, not crash |
| Search fleet with start = today, end = tomorrow | Should return available cars |
 ✅ What's working correctly                               
                                                                                                                                               
  - Date math and price calculation — no arithmetic bugs
  - Conflict detection — all 8 overlap scenarios handled correctly                                                                               
  - Blocked client guard — properly blocked before any DB write                                                                                  
  - Adjacent dates — two back-to-back rentals allowed (correct behavior)                                                                         
  - CANCELLED / REJECTED / COMPLETED reservations — properly freed for re-booking                                                                
  - Status lifecycle — PENDING → CONFIRMED → COMPLETED chain works                                                                               
  - Duplicate matricule — rejected at creation                                                                                                   
  - Contract upsert — idempotent, no duplicates                                                                                                  
                                                            
  ---                                                                                                                                            
  ⚠️  1 Real Bug Found (Race Condition)                      
                                                                                                                                                 
  Test 4 — "true race" — this test was written to document a vulnerability, and it passes precisely because the bug exists:
                                                                                                                                                 
  ▎ If two clients click Réserver at the exact same millisecond, both bookings go through — the same car gets double-booked.                     
                                                                                                                                                 
  Why it happens: Your app code does:                                                                                                            
  1. Check: "is there already a booking for these dates?" → sees nothing
  2. Insert the reservation                                                                                                                      
                                                            
  If two people do step 1 at the same time, both see "nothing" and both proceed to insert. The check and the insert are two separate operations —
   not atomic.                                                                                                                                   
   
  The fix requires one SQL line added to Supabase. Add this to your migration:                                                                   
                                                            
  ALTER TABLE reservations                                                                                                                       
  ADD CONSTRAINT no_double_booking                          
  EXCLUDE USING gist (
    car_id WITH =,
    daterange(start_date, end_date, '[)') WITH &&                                                                                                
  ) WHERE (status IN ('PENDING', 'CONFIRMED'));
                                                                                                                                                 
  This makes the database itself reject the second insert — no app code change needed. Without it, the race is theoretically possible though in  
  practice very rare (would require two users clicking within milliseconds of each other).                                                       
                                                                                                                                                 
  ---                                                       
  What the tests didn't cover (and can't be tested in code)
                                                                                                                                                 
  These need manual testing in the browser:
                                                                                                                                                 
  ┌─────────────────────────────────┬────────────────────────────────────────────────────────┐                                                   
  │              Issue              │                      How to check                      │                                                   
  ├─────────────────────────────────┼────────────────────────────────────────────────────────┤                                                   
  │ Image carousel working visually │ Open a car detail page, click the arrows               │
  ├─────────────────────────────────┼────────────────────────────────────────────────────────┤
  │ PDF contract actually generates │ Go to a confirmed reservation, click "Générer PDF"     │                                                   
  ├─────────────────────────────────┼────────────────────────────────────────────────────────┤                                                   
  │ Language switch (FR/AR/EN)      │ Click the language toggle                              │                                                   
  ├─────────────────────────────────┼────────────────────────────────────────────────────────┤                                                   
  │ Auth redirect after login       │ Try to access /admin while logged out                  │
  ├─────────────────────────────────┼────────────────────────────────────────────────────────┤                                                   
  │ Supabase RLS policies           │ Try to access another user's data via the API directly │
  └─────────────────────────────────┴────────────────────────────────────────────────────────┘         


  Rating: 6.5 / 10                                                                                                                               
                                                                                                                                                 
  Here's the breakdown, area by area:                                                                                                            
                                                                                                                                                 
  ---                                                                                                                                            
  ✅ What's genuinely good                                                                                                                       
                                                            
  Architecture & tooling — 8/10                                                                                                                
  Solid choices: Supabase + React Query + TypeScript + Vitest. The hooks are cleanly separated by domain (use-cars, use-reservations,            
  use-maintenance…). The DB schema is well-designed with proper foreign keys, RLS policies, and constraints. Auth is done correctly —            
  mounted-flag pattern to avoid state updates on unmounted components, session restoration from localStorage, clean role resolution.             
                                                                                                                                                 
  UI quality — 8/10                                                                                                                              
  The design system is consistent (custom Tailwind tokens, shared button variants, unified color palette). Components like CarDialog with      
  drag-to-reorder images are genuinely well-built.                                                                                               
                                                            
  Business logic correctness — 7/10                                                                                                              
  The overlap detection query is correct. Guards for blocked clients, conflict checks, and the PENDING/CONFIRMED-only filter are all right. No 
  console.log left in, no TODO/FIXME comments, no any types.                                                                                     
                                                                                                                                               
  ---                                                                                                                                            
  ⚠️  What brings the score down                                                                                                                
                                                                                                                                                 
  The two main files are too big — 4/10                                                                                                          
  AdminUI.tsx is 2,300 lines and ClientUI.tsx is 2,665 lines. That's roughly 10–15 different pages crammed into 2 files. This is the biggest     
  problem. If something breaks in the reservation detail page, you're hunting through 2,000 lines of unrelated code to find it.                  
                                                                                                                                                 
  4 as unknown as type casts                                                                                                                     
  In the hooks, Supabase's joined query results get cast like data as unknown as ReservationWithDetails[]. This silences TypeScript — if the DB
  schema changes, the compiler won't warn you. Minor but worth noting.                                                                           
                                                                                                                                               
  The race condition (already discussed)                                                                                                         
  The double-booking vulnerability under simultaneous requests. Fixable with one SQL constraint.                                               
                                                                                                                                                 
  No error boundaries
  If a component crashes (e.g. a null image URL), the whole page goes blank with no recovery. React error boundaries would contain the damage.   
                                                                                                                                                 
  Mock data fallback is silent                                                                                                                   
  When Supabase returns empty (e.g. DB not connected), the app silently falls back to MOCK_CARS. A user would see fake data and not know the real
   DB failed. This should at least log a warning in non-production.                                                                              
                                                                                                                                               
  ---                                                                       