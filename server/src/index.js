const express = require("express");
const crypto = require("node:crypto");
const { Pool } = require("pg");

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));
const port = Number(process.env.PORT || 3000);
const botToken = process.env.BOT_TOKEN;
const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
}) : null;

async function initializeDatabase() {
  if (!pool) return;
  await pool.query("CREATE TABLE IF NOT EXISTS players (telegram_id BIGINT PRIMARY KEY, username TEXT, balance BIGINT NOT NULL DEFAULT 1000 CHECK (balance >= 0), level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1), parcels_delivered BIGINT NOT NULL DEFAULT 0 CHECK (parcels_delivered >= 0), game_state JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
}

function validateTelegramInitData(initData, token, maxAgeSeconds = 86400) {
  if (!initData || !token) return null;
  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  const authDate = Number(params.get("auth_date"));
  if (!receivedHash || !Number.isFinite(authDate)) return null;
  const now = Math.floor(Date.now() / 1000);
  if (authDate > now + 30 || now - authDate > maxAgeSeconds) return null;
  params.delete("hash");
  const dataCheckString = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => key + "=" + value).join("\n");
  const secretKey = crypto.createHmac("sha256", "WebAppData").update(token).digest();
  const expectedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest();
  const supplied = Buffer.from(receivedHash, "hex");
  if (supplied.length !== expectedHash.length || !crypto.timingSafeEqual(supplied, expectedHash)) return null;
  try {
    const user = JSON.parse(params.get("user") || "null");
    if (!user || !Number.isSafeInteger(user.id)) return null;
    return user;
  } catch { return null; }
}

function requireTelegramUser(req, res, next) {
  if (!botToken) return res.status(503).json({ error: "Telegram authentication is not configured" });
  const header = req.get("authorization") || "";
  const user = validateTelegramInitData(header.startsWith("tma ") ? header.slice(4) : "", botToken);
  if (!user) return res.status(401).json({ error: "Invalid or expired Telegram initData" });
  req.telegramUser = user;
  next();
}

app.get("/health", async (_req, res) => {
  let database = "not_configured";
  if (pool) {
    try { await pool.query("SELECT 1"); database = "connected"; }
    catch { return res.status(503).json({ status: "degraded", database: "error" }); }
  }
  res.json({ status: "ok", service: "parcel-empire-api", database });
});

app.get("/api/me", requireTelegramUser, async (req, res, next) => {
  if (!pool) return res.status(503).json({ error: "Database is not configured" });
  try {
    const u = req.telegramUser;
    const result = await pool.query(
      "INSERT INTO players (telegram_id, username) VALUES ($1, $2) ON CONFLICT (telegram_id) DO UPDATE SET username = EXCLUDED.username, updated_at = NOW() RETURNING telegram_id, username, balance, level, parcels_delivered, game_state",
      [String(u.id), u.username || null]
    );
    res.json({ player: result.rows[0] });
  } catch (e) { next(e); }
});

app.post("/api/progress", requireTelegramUser, async (req, res, next) => {
  if (!pool) return res.status(503).json({ error: "Database is not configured" });
  if (!req.body || req.body.action !== "deliver_parcel") return res.status(400).json({ error: "Unsupported action" });
  try {
    const u = req.telegramUser;
    const result = await pool.query(
      "INSERT INTO players (telegram_id, username, balance, parcels_delivered) VALUES ($1, $2, 1025, 1) ON CONFLICT (telegram_id) DO UPDATE SET username = EXCLUDED.username, balance = players.balance + 25, parcels_delivered = players.parcels_delivered + 1, updated_at = NOW() RETURNING telegram_id, username, balance, level, parcels_delivered, game_state",
      [String(u.id), u.username || null]
    );
    res.json({ player: result.rows[0], reward: 25 });
  } catch (e) { next(e); }
});

app.use((error, _req, res, _next) => {
  console.error("Unhandled API error:", error.message);
  res.status(500).json({ error: "Internal server error" });
});

initializeDatabase().then(() => {
  app.listen(port, "0.0.0.0", () => console.log("PARCEL EMPIRE API listening on port " + port));
}).catch((error) => {
  console.error("Database initialization failed:", error.message);
  process.exit(1);
});
