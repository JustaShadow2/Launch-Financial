import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "4137", 10),
  jwtSecret: process.env.JWT_SECRET || "insecure-dev-secret",
  jwtExpiresIn: "7d" as const,
  finnhubApiKey: process.env.FINNHUB_API_KEY || "",
  twelveDataApiKey: process.env.TWELVE_DATA_API_KEY || "",
  quoteRefreshMs: parseInt(process.env.QUOTE_REFRESH_MS || "15000", 10),
  // Crypto quotes refresh less often to respect Twelve Data's 8 req/min free tier.
  cryptoRefreshMs: parseInt(process.env.CRYPTO_REFRESH_MS || "30000", 10),
  // How long real historical series are cached before refetching.
  historyCacheMs: parseInt(process.env.HISTORY_CACHE_MS || "3600000", 10),
  // In production the backend also serves the built frontend as static files.
  // Set to the absolute path of frontend/dist. Empty in dev (Vite serves it).
  serveStaticDir: process.env.SERVE_STATIC_DIR || "",
  // Email (password-reset OTP) via Resend. If RESEND_API_KEY is unset, OTP
  // codes are logged to the server console instead (dev fallback).
  resendApiKey: process.env.RESEND_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "Launch Financial <onboarding@resend.dev>",
  // Public app name used in email copy.
  appName: "Launch Financial",
};
