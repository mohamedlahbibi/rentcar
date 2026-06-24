# DriveEasy Rentals — CLAUDE.md

## Stack (locked)
Vite + React, React Router v6, Supabase (DB + Auth), Cloudinary (images), TanStack Query v5, Tailwind + shadcn/ui, SheetJS (Excel), WhatsApp: mocked

## Roles
- ADMIN / MANAGER → `/admin/*` (staff table)
- CLIENT → `/account/*`

## Language
- Client site: FR / EN / AR (toggle)
- Admin CRM: FR only

## How we work
- **One feature at a time.** Finish it completely before moving on.
- Be concise. No summaries of what was just done. No narration.
- Short updates only when direction changes or something is found.
- Minimal tokens — say less, do more.

## Features & status
| Feature | Status |
|---|---|
| Car CRUD (admin) | working — image mgmt, AlertDialog delete |
| Reservation management | working |
| Contract | working — print disabled until saved |
| Client booking flow | working — no pre-filled dates without URL params |
| Fleet page | working — type filter + price sort (asc/desc) |
| Client account | partial — can't cancel confirmed |
| Auth | working — 8-char min enforced |
| Maintenance sheet | working |
| WhatsApp | mocked |

## Known bugs
— None. All known bugs resolved.
