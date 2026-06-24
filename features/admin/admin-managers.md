# Feature: Admin Manager Management

## Rating: 8 / 10

### What's solid
- Real Supabase data — all staff rows from the `staff` table are displayed
- Role badges: red "Admin" / blue "Manager" on every row
- "Vous" badge on the current admin's own row
- Self-remove is disabled with a tooltip — you can't accidentally lock yourself out
- Remove flow has an AlertDialog confirmation to prevent accidental revocation
- Revoking removes the `staff` row; `ProtectedRoute` checks for a staff row so the former employee loses CRM access on next load without needing to touch Supabase Auth
- Invite form: full validation (name ≥ 2 chars, valid email format, password ≥ 8 chars), inline error messages, pending state
- Role selector in the invite form (MANAGER or ADMIN)
- After a successful invite: a dialog shows the temp credentials the admin must communicate to the new manager
- A session-less Supabase client is used for `signUp` so the admin's own session is never replaced
- `ProtectedRoute` now supports `requireAdmin` — the `/admin/managers` route rejects MANAGER-role staff and redirects them to `/admin`

### What brings it down
- The invite flow relies on `supabase.auth.signUp` from the frontend — requires the Supabase project to have email confirmation **disabled**. If email confirmation is enabled, the new staff row gets inserted but the manager can't log in until they confirm their email (which they may not receive if the email is wrong). Option A (Edge Function with `auth.admin.inviteUserByEmail`) would handle this properly.
- No password-change prompt for the invited manager on first login
- No way to change a staff member's role after creation (promote/demote)

---

## Current state

| Item | Status |
|---|---|
| List real managers from DB | ✅ done |
| Invite manager (create account) | ✅ done — Option B (temp password) |
| Remove manager | ✅ done — with AlertDialog confirmation |
| Role badge (ADMIN vs MANAGER) | ✅ done |
| ADMIN-only page guard | ✅ done — `requireAdmin` in `ProtectedRoute` |
| Form validation | ✅ done — inline errors, pending state |

---

## Tasks

### 1. `useAllStaff`, `useRemoveStaff`, `useInviteStaff` hooks ✅
**File:** `src/hooks/use-staff.ts` (new file)
- `useAllStaff`: queries `staff` ordered by `created_at` desc
- `useRemoveStaff`: deletes the staff row by `id`, invalidates `["staff"]` cache
- `useInviteStaff`: calls `supabase.auth.signUp` on a session-less client, then inserts the staff row. Returns `{ name, email, password }` for the credentials dialog.

---

### 2. Wire up the manager list ✅
**File:** `AdminUI.tsx` — `AdminManagers`
Real staff from `useAllStaff()`. Per row: name, email, role badge, member-since date, "Vous" badge (self-row), disabled remove button (self-row), remove button with AlertDialog (other rows).

---

### 3. Wire up "Invite manager" ✅
**File:** `AdminUI.tsx` — `AdminManagers` + `src/hooks/use-staff.ts`
Option B implemented. Form: name, email, temp password, role selector. On success: credentials dialog. On error: toast.

---

### 4. Wire up "Remove manager" ✅
**File:** `AdminUI.tsx` — `AdminManagers`
AlertDialog: "Révoquer l'accès CRM à [name] ?" On confirm: `useRemoveStaff(id)`. Self-row button is disabled.

---

### 5. Role badge display ✅
**File:** `AdminUI.tsx` — `AdminManagers`
Red "Admin" badge / blue "Manager" badge derived from `staff.role`.

---

### 6. ADMIN-only page guard ✅
**Files:** `src/App.tsx`, `src/components/ProtectedRoute.tsx`
Added `requireAdmin` prop to `ProtectedRoute`. If `requireAdmin` is true and `user.role !== "ADMIN"`, redirects to `/admin`. Route changed to `<ProtectedRoute requireAdmin>`.

---

### 7. Form validation ✅
**File:** `AdminUI.tsx` — `AdminManagers`
Name ≥ 2 chars, valid email regex, password ≥ 8 chars. Inline error text below each field. Submit button disabled while `isPending`. Form clears on success.

---

## Future features

### A. Migrate invite to Supabase Edge Function (Option A)
**Why:** The current Option B flow requires email confirmation to be disabled in Supabase. If enabled, the new manager receives a confirmation email — but if the admin typed the email wrong, the staff row exists in the DB but no one can use it. Option A's `auth.admin.inviteUserByEmail` sends a magic-link invite and only creates the account when the manager accepts.
**How:** Create a Supabase Edge Function `invite-staff` that uses the service-role key. Frontend sends `{ name, email, role }`. Function calls `auth.admin.inviteUserByEmail`, inserts the staff row, returns success. Remove the session-less `anonClient` from `use-staff.ts`.

---

### B. Role change (promote / demote)
**Why:** An agency might promote a manager to admin, or demote an admin after a role change, without removing and re-inviting them.
**How:** Add a role selector on the staff row (or an "Éditer" dialog). On save: `UPDATE staff SET role = ? WHERE id = ?`. Invalidate `["staff"]` cache.

---

### C. Force password reset on first login
**Why:** The invited manager receives a temp password by word-of-mouth and should be required to change it immediately.
**How:** Add a `must_reset_password` boolean to the `staff` table. Set it `true` on invite. On login, `resolveRole` in `auth.tsx` checks this flag and redirects the manager to a "change password" page before they can access the CRM. Clear the flag after a successful password change via `supabase.auth.updateUser`.
