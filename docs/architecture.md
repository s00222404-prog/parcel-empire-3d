# Architecture

## Components
- **Client:** Vite + Three.js renders the city and responsive Telegram Mini App UI. Browser preview mode is local-only.
- **API:** Express exposes a health check and authenticated player/progress routes.
- **Database:** PostgreSQL stores the Telegram ID, balance, level, delivery count and JSON game state.
- **Hosting:** Render Blueprint describes a Node web service, static site and PostgreSQL database.

## Authentication and state
The client sends Telegram's raw `initData` in the `Authorization: tma ...` header. The API validates the HMAC signature with the bot token, checks `auth_date`, and derives the player identity from the signed user object. The browser never submits a balance or reward amount. The server awards a fixed reward for the `deliver_parcel` action.

## Production hardening
- Add request rate limiting and structured audit logs.
- Add database migrations and backup/restore procedures.
- Implement delivery cooldowns and idempotency to prevent repeated rewards.
- Add a real route/delivery simulation and inventory/building upgrades.
- Configure Telegram BotFather with the deployed HTTPS Mini App URL.
