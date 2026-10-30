# LMS staging module inventory

Inventory is based on the rendered staging UI at `https://lms-stag.xminds.in`.
Only Login and Password Recovery were directly inspectable without authentication.
The `/dashboard` route redirected unauthenticated visitors to Login. Dashboard
content and other authenticated modules remain unverified until a working
staging account can reach them; they are intentionally not inferred here.

| Module | Page | Feature | User action | Positive scenarios | Negative scenarios | Boundary scenarios | Validation scenarios | Priority |
|---|---|---|---|---|---|---|---|---|
| Authentication | Login (`/login`) | Email/password sign-in | Enter credentials and select Sign In | Configured valid account reaches `/dashboard` (requires a working account) | Invalid credentials show “These credentials do not match our records.” | Empty/maximum-length credential behavior not established; email field is HTML `type=email` | Malformed email is blocked by browser email validation; login page exposes Email, Password and Remember Me | P0 |
| Authentication | Login (`/login`) | Remember Me | Toggle the Remember Me checkbox | Checkbox is visible and operable | Persistence effect not verified | Persistence duration not verified | Checkbox has accessible label “Remember Me” | P2 |
| Authentication | Login (`/login`) | Password recovery navigation | Select “I forgot my password” | Opens `/password/reset` | N/A | N/A | Link is exposed by its visible accessible name | P1 |
| Authentication | Login (`/login`) | Google sign-in navigation | Select “Sign in with Google” | Navigates to `/auth/google` (external authentication outcome not verified) | Provider errors not verified | N/A | Link target observed in rendered DOM | P2 |
| Authentication | Password Recovery (`/password/reset`) | Request a password reset link | Enter email and select Send Password Reset Link | Successful delivery not verified (would send an email) | Unknown-account and delivery errors not verified | Empty and maximum-length behavior not established; input is HTML `type=email` | Malformed email is blocked by browser email validation; Login link returns to `/login` | P1 |
| Dashboard | Dashboard/Home (`/dashboard`) | Authenticated landing page | Open the dashboard after signing in | Route target is `/dashboard`; post-login content requires working authenticated access | Unauthenticated visit redirects to `/login` | Dashboard data and empty/loading states not accessible anonymously | Session guard behavior verified by the unauthenticated redirect | P0 |

## Discovery notes

- Login and password recovery both render the Laravel debug toolbar in staging.
- Password recovery exposed Email, “Send Password Reset Link,” and Login.
- A controlled invalid-credential login returned a 302 to `/login` with the
  visible message “These credentials do not match our records.”
- No dashboard navigation or feature claims are made without an authenticated
  page to inspect.
