# Product Backlog — DriveEasy Rentals

> Status: Active Development | Started: April 2026
> Stack: Next.js · Supabase · Prisma · NextAuth.js · Cloudinary · @react-pdf/renderer · SheetJS · Tailwind CSS

---

## PHASE 1 — Foundation
> Goal: Project runs locally, DB is connected, auth works end-to-end.

### E1 — Project Setup

| ID    | Story                                                        | Size | Status |
|-------|--------------------------------------------------------------|------|--------|
| E1-1  | ~~Initialize Next.js project~~ → kept existing Vite + React | S    | [x]    |
| E1-2  | ~~Configure Prisma~~ → Supabase JS client installed          | S    | [x]    |
| E1-3  | Set up Cloudinary upload utility (`src/lib/cloudinary.ts`)   | S    | [x]    |
| E1-4  | Create `.env.example` with all required variables            | S    | [x]    |
| E1-5  | Define folder structure (`lib/`, `types/`, `supabase/`)      | S    | [x]    |
| E1-6  | Configure ESLint + Prettier + TypeScript strict mode         | S    | [ ]    |

### E2 — Database & Data Models

| ID    | Story                                                        | Size | Status |
|-------|--------------------------------------------------------------|------|--------|
| E2-1  | SQL table: `users` (client)                                  | S    | [x]    |
| E2-2  | SQL table: `staff` (admin / manager)                         | S    | [x]    |
| E2-3  | SQL table: `cars` (all fields + images array)                | M    | [x]    |
| E2-4  | SQL table: `reservations` (with status enum + trigger)       | S    | [x]    |
| E2-5  | SQL table: `maintenance_records` (per car)                   | S    | [x]    |
| E2-6  | SQL table: `contracts` (linked to reservation)               | S    | [x]    |
| E2-7  | RLS policies for all tables                                  | M    | [x]    |
| E2-8  | Run migration in Supabase SQL editor + seed cars             | S    | [ ]    |
| E2-9  | TypeScript types matching schema (`src/types/database.ts`)   | S    | [x]    |

### E3 — Authentication & RBAC

| ID    | Story                                                        | Size | Status |
|-------|--------------------------------------------------------------|------|--------|
| E3-1  | `AuthProvider` + `useAuth` hook (`src/lib/auth.tsx`)         | M    | [x]    |
| E3-2  | `signUpClient` (creates auth.user + users row)               | M    | [x]    |
| E3-3  | `signIn` / `signOut` via Supabase Auth                       | S    | [x]    |
| E3-4  | Role resolution: check `staff` table → CLIENT fallback       | M    | [x]    |
| E3-5  | Wire `<AuthProvider>` into `App.tsx`                         | S    | [x]    |
| E3-6  | `ProtectedRoute` — guards `/admin/*` and `/account/*`        | M    | [x]    |

---

## PHASE 2 — Client-Facing Website
> Goal: A visitor can browse available cars, create an account, and submit a reservation.

### E4 — Browse & Search

| ID    | Story                                                        | Size | Status |
|-------|--------------------------------------------------------------|------|--------|
| E4-1  | Landing page hero section (placeholder brand name)           | M    | [x]    |
| E4-2  | Date range picker (start/end) — controlled via URL params    | M    | [x]    |
| E4-3  | `useAvailableCars` hook — real Supabase availability query   | M    | [x]    |
| E4-4  | Car listing grid with loading skeletons + empty state        | M    | [x]    |
| E4-5  | Filter bar by car type (client-side)                         | M    | [x]    |
| E4-6  | Car detail page `/cars/:id` (gallery, specs, total price)    | M    | [x]    |
| E4-7  | Language toggle: EN / FR / AR on landing page                | L    | [x]    |

### E5 — Reservation Flow

| ID    | Story                                                        | Size | Status |
|-------|--------------------------------------------------------------|------|--------|
| E5-1  | Reservation summary — inline dialog on car detail page       | M    | [x]    |
| E5-2  | `useCreateReservation` → inserts PENDING reservation         | M    | [x]    |
| E5-3  | Guard: redirect to `/login?redirect=...` if not authed       | S    | [x]    |
| E5-4  | Double-booking check before insert in mutation               | M    | [x]    |
| E5-5  | Success state in dialog + navigate to /account               | S    | [x]    |

### E6 — Client Account Dashboard

| ID    | Story                                                        | Size | Status |
|-------|--------------------------------------------------------------|------|--------|
| E6-1  | `/account` — real reservations with status badges            | M    | [x]    |
| E6-2  | Reservation history via `useMyReservations`                  | M    | [x]    |
| E6-3  | Reservation detail inline (car, dates, total, status)        | M    | [x]    |
| E6-4  | Cancel reservation (PENDING only) via `useCancelReservation` | M    | [x]    |
| E6-5  | Edit profile (name, phone, address) via `useUpdateProfile`   | S    | [x]    |

---

## PHASE 3 — Admin / Manager CRM
> Goal: Staff can manage cars and handle reservations end-to-end.

### E7 — Car Management

| ID    | Story                                                        | Size | Status |
|-------|--------------------------------------------------------------|------|--------|
| E7-1  | Car list page `/admin/cars` (search + filter)                | M    | [ ]    |
| E7-2  | Add car form `/admin/cars/new` (all fields + multi-image upload to Cloudinary) | L | [ ] |
| E7-3  | Edit car `/admin/cars/:id`                                   | M    | [ ]    |
| E7-4  | Delete car (confirmation modal)                              | S    | [ ]    |
| E7-5  | Toggle availability (one-click Available / Unavailable)      | S    | [ ]    |
| E7-6  | Car image gallery management (reorder, delete individual photos) | M | [ ]  |

### E8 — Reservation Management

| ID    | Story                                                        | Size | Status |
|-------|--------------------------------------------------------------|------|--------|
| E8-1  | Reservation list `/admin/reservations` (filter by status, date, car, client) | M | [ ] |
| E8-2  | Reservation detail page `/admin/reservations/:id`            | M    | [ ]    |
| E8-3  | Accept reservation → status `CONFIRMED`                      | M    | [ ]    |
| E8-4  | Reject reservation → status `REJECTED` (optional reason)     | M    | [ ]    |
| E8-5  | Mark reservation as `COMPLETED` (after car returned)         | S    | [ ]    |
| E8-6  | Mark reservation as `CANCELLED` (admin-side)                 | S    | [ ]    |

### E9 — Dashboard & Client Management

| ID    | Story                                                        | Size | Status |
|-------|--------------------------------------------------------------|------|--------|
| E9-1  | Admin dashboard `/admin` — stats cards (cars, reservations, pending, clients) | M | [ ] |
| E9-2  | Recent reservations widget on dashboard                      | S    | [ ]    |
| E9-3  | Alerts widget (upcoming returns, pending confirmations)      | M    | [ ]    |
| E9-4  | Client list `/admin/clients` with search                     | M    | [ ]    |
| E9-5  | Client profile `/admin/clients/:id` (info + reservation history) | M | [ ]  |

---

## PHASE 4 — Documents & Maintenance
> Goal: Generate PDF contracts and manage car maintenance sheets.

### E10 — Car Maintenance Sheet

| ID    | Story                                                        | Size | Status |
|-------|--------------------------------------------------------------|------|--------|
| E10-1 | Maintenance sheet page `/admin/cars/:id/maintenance`         | M    | [ ]    |
| E10-2 | Inline-editable table (add row / edit cell / delete row)     | L    | [ ]    |
| E10-3 | Save maintenance record to DB via API                        | M    | [ ]    |
| E10-4 | Export maintenance sheet to Excel (XLSX) — download to PC    | M    | [ ]    |

### E11 — Rental Contract (PDF)

| ID    | Story                                                        | Size | Status |
|-------|--------------------------------------------------------------|------|--------|
| E11-1 | Contract form: auto-filled fields (client, car, dates, total) | M   | [ ]    |
| E11-2 | Contract form: manual fields (fuel level, km at pickup, car condition, deposit, notes) | M | [ ] |
| E11-3 | Generate PDF with `@react-pdf/renderer` — download to PC     | L    | [ ]    |
| E11-4 | Store contract record in DB (no file upload needed)          | S    | [ ]    |

---

## PHASE 5 — Notifications & Manager Admin
> Goal: WhatsApp notifications live, manager accounts managed by admin.

### E12 — WhatsApp Notifications

| ID    | Story                                                        | Size | Status |
|-------|--------------------------------------------------------------|------|--------|
| E12-1 | WhatsApp service stub (console.log mock for now)             | S    | [ ]    |
| E12-2 | Trigger mock notification to admin on new reservation        | S    | [ ]    |
| E12-3 | Trigger mock notification to client on confirmation          | S    | [ ]    |
| E12-4 | Trigger mock notification to client on rejection             | S    | [ ]    |
| E12-5 | Replace mock with real WhatsApp API when owner number is ready | M  | [ ]    |

### E13 — Manager Management (Admin only)

| ID    | Story                                                        | Size | Status |
|-------|--------------------------------------------------------------|------|--------|
| E13-1 | Manager list `/admin/managers` (admin only)                  | S    | [ ]    |
| E13-2 | Add manager (name, email, password)                          | M    | [ ]    |
| E13-3 | Delete manager (confirmation modal)                          | S    | [ ]    |

---

## Story Size Reference

| Size | Effort |
|------|--------|
| S    | ~1–2 hours |
| M    | ~half day |
| L    | ~1 day |
| XL   | ~2+ days |

---

## Open Items (Blocked on client)

- [ ] Business name + logo + brand colors
- [ ] Exact fields for rental contract (contrat de location)
- [ ] Exact columns for maintenance sheet (fiche entretien)
- [ ] WhatsApp Business phone number
- [ ] Preferred hosting / domain

---

*Last updated: April 2026*
