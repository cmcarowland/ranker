# Ranker

Ranker is a SvelteKit app for maintaining coaster rankings.

## Auth model

- Passwordless login using emailed 6-digit code.
- Code expires after 5 minutes.
- Session expires after 48 hours.
- Each user gets a personal board at `/u/<handle>`.
- Any visitor can view any user board.
- Only the signed-in board owner can edit and save that board.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

```bash
cp .env.example .env
```

Set these values:

- `RESEND_API_KEY`: API key for Resend email delivery.
- `RESEND_FROM_EMAIL`: sender address accepted by your Resend account.

If these variables are missing in local development, OTP codes are logged to the server console.

3. Start the app:

```bash
npm run dev
```

## Development notes

- Auth/session/board persistence is file-backed in `data/ranker-auth.json`.
- This data directory is ignored by git.
- Restarting the app preserves users, sessions, OTP state, and boards while the local file remains.

## Main routes

- `/`: landing page
- `/login`: email code login
- `/u/<handle>`: public board page (owner can edit)
- `POST /auth/send-code`: request OTP
- `POST /auth/verify-code`: verify OTP and create session
- `POST /auth/logout`: clear session
- `GET /api/boards/<handle>`: fetch public board
- `PUT /api/boards/<handle>`: save board (owner only)

## Validate

```bash
npm run check
```
