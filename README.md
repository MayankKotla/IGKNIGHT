# IgKnight

AI-powered study groups exclusively for UCF students.

## What it is

IgKnight connects UCF Knights through realtime study groups, session scheduling, and RetAIn — an AI study assistant powered by Claude. Access is restricted to `@ucf.edu` and `@knights.ucf.edu` email addresses.

## Stack

- **Frontend:** React + Tailwind CSS (Vite) — `/client`
- **Backend:** Node.js + Express — `/server`
- **Database / Auth / Realtime:** Supabase
- **AI:** Anthropic Claude API (RetAIn tutor feature)

## Features

- Study group discovery and creation (TAs only)
- Realtime group chat
- Session scheduling with Google Meet integration (hybrid/online sessions)
- RetAIn — AI study assistant for course questions
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

## UCF Email Enforcement

Registration is blocked for any email not matching `@ucf.edu` or `@knights.ucf.edu`, enforced at both the client and via a Supabase database trigger.
