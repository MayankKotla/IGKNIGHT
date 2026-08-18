# Custom SMTP setup runbook (Resend + Supabase)

Reference for finishing the #1 launch-blocking item from `LAUNCH_READINESS.md`. Written so this can be executed quickly once a domain is registered — no research needed at that point, just follow the steps.

## Why this is needed

Supabase's default email sender only delivers to addresses that are members of your Supabase organization's Team tab, and is capped at 2 emails/hour project-wide. Every real signup, password reset, and email-verification link depends on this working for arbitrary `@ucf.edu` addresses, so it has to be replaced before real students can use the app.

## Step 1 — Register a domain

Any registrar works (Cloudflare Registrar is at-cost and has the simplest DNS UI; Namecheap is fine too). Something like `igknight.app`, `igknight.com`, or similar. This step is already in progress.

## Step 2 — Create a Resend account and verify the domain

1. Sign up at [resend.com](https://resend.com) (free tier: 3,000 emails/month, 100/day — plenty for launch).
2. In the Resend dashboard, go to **Domains → Add Domain**, enter the domain from Step 1.
3. Resend will show a set of DNS records to add (typically an MX record, a couple of TXT records for SPF/DKIM, and often a DMARC TXT record). Add each one exactly as shown, in the domain's DNS settings at the registrar.
4. Back in Resend, click **Verify**. DNS propagation is usually fast (minutes) but can occasionally take longer — if it doesn't verify immediately, wait 15–30 min and try again.

## Step 3 — Get SMTP credentials from Resend

Once the domain is verified: Resend dashboard → **API Keys** → create a new key (full access, or scoped to "Sending" if offered). Resend's SMTP details are:

- Host: `smtp.resend.com`
- Port: `587` (or `465` for implicit TLS)
- Username: `resend`
- Password: the API key you just created

## Step 4 — Wire it into Supabase

1. Supabase Dashboard → your project → **Authentication → Emails → SMTP Settings**.
2. Toggle on **Enable Custom SMTP**.
3. Fill in:
   - **Sender email**: something like `no-reply@yourdomain.com` (must be on the verified domain)
   - **Sender name**: `IgKnight`
   - **Host**: `smtp.resend.com`
   - **Port**: `587`
   - **Username**: `resend`
   - **Password**: the Resend API key
4. Save.

## Step 5 — Raise the rate limit (optional but recommended)

Supabase Dashboard → **Authentication → Rate Limits**. Once custom SMTP is on, the default cap moves to 30/hour — worth checking this page isn't set lower than expected for a launch-day signup burst, and bumping it if needed.

## Step 6 — Test with a real, non-team-member address

This is the part that actually confirms the fix worked. Use a real `@ucf.edu` address that is **not** already a member of your Supabase organization (ask a friend, or use a secondary personal UCF account if you have one) and run through:

1. Sign up on the production site.
2. Confirm the email actually arrives (check spam too, first send from a new domain sometimes lands there until reputation builds).
3. Click the confirmation link → should land on `/verify-email`, show "Email verified!", then redirect to `/login`.
4. Log in successfully.

If all four steps work for an address that was never a team member, the fix is confirmed.

## Nice-to-have follow-up (not required for launch)

Once the domain exists, you could also point the app itself at it (custom domain on Vercel + Render) instead of the default `*.vercel.app`/`*.onrender.com` URLs — cleaner links in emails, slightly better trust/deliverability. Separate task, not needed to unblock signups.
