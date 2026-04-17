import crypto from "crypto";

// Generate a random session token
export function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

// Session expiry (7 days)
export function getSessionExpiry() {
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return now + sevenDays;
}
