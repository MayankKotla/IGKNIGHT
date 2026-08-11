# IgKnight

AI-powered study groups exclusively for UCF students.

## What it is

IgKnight connects UCF Knights through realtime study groups, session scheduling, and KnightCheck — AI-generated quizzes powered by Claude. Access is restricted to `@ucf.edu` email addresses.

## Stack

- **Frontend:** React + Tailwind CSS (Vite) — `/client`
- **Backend:** Node.js + Express — `/server`
- **Database / Auth / Realtime:** Supabase
- **AI:** Anthropic Claude API (KnightCheck quiz generation)

## Features

- Study group discovery and creation (TAs only)
- Realtime group chat
- Session scheduling with Google Meet integration (hybrid/online sessions)
- KnightCheck — quiz generation from session content
- Session detail pages with notes and file sharing

## Development

```bash
# Install dependencies
npm install

# Set up env files (see below), then:
npm run dev   # starts both client (port 5173) and server (port 3001)
```

Copy `client/.env.example` → `client/.env` and `server/.env.example` → `server/.env`, then fill in real values. See the comments in each file for where to get them (Supabase dashboard, Anthropic console, Google Cloud console) and what changes for a production deploy.

## Testing

```bash
npm test              # runs both client and server test suites
npm run test:client   # client only — Vitest, pure/testable logic (validators, password rules)
npm run test:server   # server only — Jest, auth middleware + course code normalization
```

Coverage is intentionally scoped to logic that's cheap to test in isolation — validation rules, auth gating, string normalization — rather than full request/response integration tests against a real Supabase instance.

## CI/CD

`.github/workflows/ci.yml` runs on every push and pull request against `main`:

1. **`test`** — installs both workspaces, runs the server (Jest) and client (Vitest) suites, and does a production client build. This always runs, including on PRs, so a broken PR shows a failing check before it can be merged.
2. **`deploy-server`** — only runs after `test` passes, and only on a push to `main` (never on a PR). It triggers a Render deploy via a Deploy Hook URL — see Deployment below for one-time setup.

The client isn't deployed from this workflow — Vercel's own GitHub integration handles that directly (see below).

## Deployment

**Client (Vercel):**
1. In the Vercel dashboard, import this repo as a new project.
2. Set the project's root directory to `client`.
3. Add the client env vars from `client/.env.example` (Supabase URL/anon key, `VITE_API_URL` pointing at the deployed server, `VITE_SENTRY_DSN` if used) in Vercel's Environment Variables settings.
4. That's it — Vercel auto-deploys `main` to production and creates a preview deployment for every pull request automatically. No GitHub Actions step needed for this side.

**Server (Render):**
1. In the Render dashboard, create a new Web Service pointed at this repo, with root directory `server`, build command `npm install`, and start command `npm start`.
2. Add the server env vars from `server/.env.example` (Supabase URL/service role key, Anthropic key, Google API credentials, `CLIENT_URL` pointing at the deployed Vercel URL, `SENTRY_DSN` if used) in Render's Environment settings.
3. In the service's Settings, turn **Auto-Deploy off**. Deploys are triggered by CI instead, so a deploy can never happen from code that hasn't passed the test suite.
4. In Settings → Deploy Hook, copy the hook URL, then add it as a GitHub repo secret named `RENDER_DEPLOY_HOOK_URL` (Settings → Secrets and variables → Actions in the GitHub repo). Once that secret is set, every push to `main` that passes CI will trigger a Render deploy automatically.

## UCF Email Enforcement

Registration is blocked for any email not matching `@ucf.edu`, enforced at both the client and via a Supabase database trigger.
