# Feature: Auth Page (Login + Register)

## Rating: 9 / 10

### What's solid
- Login and register share one component — clean, no duplication
- Register form collects all required fields: name, email, phone, CIN (numeric, max 8 digits), permis number, address, password, confirm password
- CIN input is constrained: `replace(/\D/g, "").slice(0, 8)` — only digits, max 8 characters
- Show/hide password toggle on the password field
- Password match check client-side before submit: "Les mots de passe ne correspondent pas"
- After register: Supabase sends a confirmation email; the page shows an "email sent" confirmation screen
- After login: redirects to the intended destination (`?redirect=…` param) or `/account`
- Staff (ADMIN/MANAGER) who log in are redirected to `/admin` automatically
- Error messages display below the form
- Loading state on the submit button (`disabled` + "…")

### What brings it down
- **No forgot password flow** — if a client forgets their password, there is no way to reset it from the UI. They are permanently locked out
- **Error messages are raw Supabase strings** — on a wrong password, the client sees "Invalid login credentials" in English. These should be translated and user-friendly
- **No validation on login form** — submitting empty email/password shows a Supabase error rather than an inline field error
- The register form has no inline field errors — if `name` is blank and the user submits, the error appears at the top of the form, not next to the field
- No strength indicator on the password field for registration

---

## Current state

| Item | Status |
|---|---|
| Login with email + password | ✅ done |
| Register with full profile | ✅ done |
| CIN digit-only constraint | ✅ done |
| Password confirmation check | ✅ done |
| Show/hide password toggle | ✅ done |
| Email confirmation screen | ✅ done |
| Redirect after login | ✅ done |
| Staff → /admin redirect | ✅ done |
| Forgot password flow | ✅ done — inline email form + `/reset-password` page |
| Translated / friendly error messages | ✅ done — `translateAuthError()` maps to French |
| Inline field validation | ✅ done — per-field errors, red borders, clears on type |

---

## Future features

### A. Forgot password flow
**Why:** The most common auth support request. Without it, a client who forgets their password has to contact the agency and ask them to reset it manually in Supabase.
**How:**
1. Add a "Mot de passe oublié ?" link below the login form that shows a single email input
2. Call `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`
3. Show "Un email de réinitialisation vous a été envoyé."
4. Create a `/reset-password` page that reads the `#access_token` from the URL (Supabase magic link) and calls `supabase.auth.updateUser({ password: newPassword })`

---

### B. Translate Supabase error messages
**Why:** "Invalid login credentials" is English, technical, and confusing. The whole site is in French.
**How:** Map known Supabase error strings to French in a helper:
```ts
function translateAuthError(msg: string) {
  if (msg.includes("Invalid login credentials")) return "Email ou mot de passe incorrect.";
  if (msg.includes("Email not confirmed")) return "Veuillez confirmer votre email avant de vous connecter.";
  if (msg.includes("User already registered")) return "Un compte existe déjà avec cet email.";
  return "Une erreur est survenue. Réessayez.";
}
```

---

### C. Inline field validation on register
**Why:** Showing one generic error at the top makes the client guess which field is wrong.
**How:** Validate each field on submit and set per-field error strings. Show them below each `<FieldInput>`. Required fields, email format, CIN length, permis format (if known), password min length.
