# PARCEL EMPIRE 3D

A browser-based 3D parcel logistics tycoon designed as a Telegram Mini App, built with Three.js, Vite, Node.js, Express and PostgreSQL.

## Project layout
- `client/` — Three.js game client and Telegram Mini App UI
- `server/` — Express API, Telegram Web App initData validation and PostgreSQL persistence
- `render.yaml` — Render Blueprint for API, static client and PostgreSQL
- `docs/` — architecture and deployment notes

## Local development
Requirements: Node.js 20+ and PostgreSQL (optional for the initial client preview).

1. Start the API:
   ```sh
   cd server
   npm install
   DATABASE_URL=postgres://localhost/parcel_empire npm start
   ```
   Set `BOT_TOKEN` to your Telegram bot token to enable authenticated Telegram sessions. Never commit the token.
2. Start the client in another terminal:
   ```sh
   cd client
   npm install
   npm run dev
   ```
   Vite prints the local preview URL. The game can be previewed in browser mode; server-backed saving requires valid Telegram Mini App data and a configured API.

## Render deployment
1. Connect this repository to Render and create the services from `render.yaml`.
2. Set the secret `BOT_TOKEN` on the API service in Render's Environment page.
3. Set the Telegram bot's Mini App URL to the deployed static-site HTTPS URL using BotFather.
4. Verify `/health`, `/api/me` inside Telegram, and database persistence after deployment.

The Blueprint defines a free PostgreSQL instance for initial testing. Free database instances have plan-specific limitations and expiry; use a suitable paid plan for production persistence.

## Security
- Telegram `initData` is validated server-side using Telegram's HMAC procedure.
- Game state is stored server-side; the client never supplies its own trusted balance.
- Secrets belong in Render environment variables, not in Git.
- Browser preview mode is not authenticated and does not save progress to the server.
