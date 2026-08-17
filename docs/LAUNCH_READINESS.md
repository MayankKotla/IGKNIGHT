# Launch Readiness — target Aug 21, 2026

Audit date: Aug 17, 2026. Covers security, legal/privacy, and general polish, with everything prioritized against a 4-day runway.

## Fix this first — likely launch-blocking

**Supabase's default email sender will silently fail to reach real users.** Unless a custom SMTP provider is configured (Authentication → Emails → SMTP Settings in the Supabase dashboard), Supabase's built-in email service:

- Refuses to deliver to any address that isn't a member of your Supabase organization's **Team** tab — everyone else gets a silent `Email address not authorized` failure.
- Is capped at **2 emails/hour project-wide** even for addresses it will send to.
- Has no delivery/uptime guarantee and is explicitly documented as "not meant for production use."

Signup, password reset, and the new `/verify-email` flow all depend on this. If your friend's test signup worked, it's almost certainly because her address happened to be a team member on your Supabase org — that won't be true for real UCF students, so as configured today, most real signups would never receive a confirmation email at all.

**Fix (~30–45 min):** sign up for [Resend](https://resend.com) (free tier: 3,000 emails/month, 100/day — plenty for a launch this size), verify a sending domain, then plug the SMTP credentials into Supabase's SMTP settings. Supabase's own docs list Resend first for a reason — it's the path of least friction. AWS SES, Postmark, and Brevo also work if you'd rather use one of those.

**After setting it up:** test the full signup → confirmation email → `/verify-email` → login loop with a real `@ucf.edu` address that is *not* one of your Supabase team members, to confirm it actually reaches an inbox.

## Already solid

Worth saying explicitly, since it's easy to lose track of how much is already done: every one of the app's 12 database tables has row-level security enabled with policies scoped correctly (spot-checked the full set this session). CI/CD gates every deploy on tests passing. Rate limiting exists on the two Claude API endpoints. Password reset, self-service account deletion, group member caps, content reporting/blocking, and Sentry error monitoring are all live. The Privacy Policy and Terms of Service were already unusually thorough for a project this size before today's pass. Realtime updates now cover messages and sessions. Backups are documented and the script has been tested for real.

## Fixed during this audit

- Added `helmet` to the Express server for standard security headers (previously had none — X-Frame-Options, X-Content-Type-Options, etc. were all missing).
- Added a global request-timeout safety net on the server: if a route handler hangs on a downstream failure it doesn't catch (Express 4 doesn't auto-catch promise rejections in async handlers), the client now gets a 503 after 20s instead of hanging forever. This is the same failure class as the frozen "Create" button from earlier — that one turned out to be a CORS misconfig, but this closes the broader hole.
- Added `npm audit --audit-level=high` as a non-blocking CI step for ongoing dependency visibility.
- `npm audit` found one real fixable issue: `react-router-dom` has two moderate-severity advisories (open redirect, and an SSR hydration issue that doesn't apply to this app since it's client-only). The fix requires a major version bump (v6 → v7) with real breaking changes — **not worth the risk 4 days out**, especially since neither `navigate()` nor `<Link to>` anywhere in this codebase ever takes a raw user-controlled string (every dynamic target is a UUID from your own data), so the realistic exploitability here is low. Revisit after launch.
- Privacy Policy: added a Cookies & Local Storage section (the app never disclosed its `localStorage` usage for read-tracking/mute state), clarified that Anthropic's commercial API terms exclude your data from model training, added a data breach notification commitment, and noted encryption in transit.
- Terms of Service: added an explicit age/legal-capacity representation to the Eligibility section.

## Must-do before the 21st

1. **Custom SMTP** (above) — this is the one that actually blocks a real launch.
2. **Decide on Render's cold start.** The free tier spins down after inactivity; the first request after idling can take 30–60 seconds, which reads as "broken" to a first-time visitor. You hit this yourself earlier this week. Either upgrade to Render's Starter tier (~$7/mo) before launch, or budget for it as a known rough edge and consider a lightweight uptime-ping service to keep it warm (not a real fix, but cheaper).
3. **Check Supabase's Auth Rate Limits page** (Authentication → Rate Limits) isn't set so low that a real burst of signups around a launch moment gets throttled. Worth a quick look once custom SMTP is in.
4. **Run the backup script once right before launch**, and again a few days in. Free-plan Supabase still has zero automatic backups — that gap matters a lot more once it's real students' data and not test data. If this app is expected to stick around, budget for Supabase Pro ($25/mo, gets you daily automatic backups) sooner rather than later.
5. **Full manual smoke test on production**, end to end, since a lot changed this week: signup → verify email → login → create/join a group → chat (and confirm live updates work with a second account open) → schedule a Hybrid/Online session (confirm the Meet link doesn't require host approval) → KnightCheck quiz generation → report/block → account deletion.

## Should-do soon (not blocking)

- **Reports have no admin UI.** When someone files a report, it just sits in the `reports` table — you have to check it manually via the Supabase Table Editor. Fine at launch scale, but worth a simple internal view (or at minimum a habit of checking weekly) once there's real usage.
- **CAPTCHA on signup** (Supabase supports this natively) if bot signups or email-bombing ever becomes a problem — not needed on day one for a UCF-email-gated app.
- **Content-Security-Policy** on the Vercel-hosted client, as defense in depth. Not urgent since React already escapes rendered content by default and there's no `dangerouslySetInnerHTML` anywhere in the codebase (checked).
- **Custom domain** instead of the default `*.vercel.app`/`*.onrender.com` URLs — cosmetic and improves email deliverability/trust, but not required.
- The `react-router` v7 upgrade mentioned above.

## Explicitly not on this list

Accessibility, mobile responsiveness, and favicon/OG tags are known gaps but were already deliberately deferred in earlier conversations (accessibility skipped outright, mobile on hold until a mobile version exists, favicon on hold until the logo's done) — not re-raising them here since that's already a decision you made, not something you're missing.

## Privacy Policy & legal — what's actually required here

- **Florida Digital Bill of Rights**: doesn't apply — it only covers companies with $1B+ global annual revenue. Confirmed via current legal summaries, not assumed.
- **COPPA**: doesn't apply — the `@ucf.edu` gate means users are college students, not children under 13, and the policy already states this.
- **FERPA**: doesn't directly apply to IgKnight — FERPA governs education records maintained by the institution (or a "school official" under contract with it), and IgKnight is explicitly not affiliated with or operated by UCF, which the Privacy Policy and ToS both already state clearly.
- **Anthropic API data**: verified directly — commercial API terms (which is what this app uses, not the consumer product) exclude your data from model training by default, and Anthropic's API log retention is 7 days. The policy now states the training exclusion explicitly.
- None of this is a substitute for an actual lawyer if you want a fully bulletproof review, but for an app at this scale with no ad revenue, no data sales, and a narrow user base, the policy is now in solid shape.

## Sources

- [Florida Digital Bill of Rights small business applicability](https://www.flpatellaw.com/florida-digital-bill-of-rights-sb-262/)
- [Anthropic commercial API terms / training exclusion](https://anarlog.so/blog/anthropic-data-retention-policy/)
- [Supabase custom SMTP requirements and default rate limits](https://supabase.com/docs/guides/auth/auth-smtp)
- [Resend free tier limits](https://resend.com/blog/new-free-tier)
- [OWASP Top 10 2025](https://owasp.org/Top10/2025/)
- [react-router open redirect advisory (GHSA-wrjc-x8rr-h8h6)](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6)
- [react-router SSR hydration advisory (GHSA-337j-9hxr-rhxg)](https://github.com/advisories/GHSA-337j-9hxr-rhxg)
