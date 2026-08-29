const { scryptSync, timingSafeEqual } = require("node:crypto");

const ALLOWED_ORIGINS = new Set([
  "https://beingchay.com",
  "https://www.beingchay.com",
  "https://beingchay.vercel.app"
]);

function isAllowedOrigin(origin) {
  return !origin || ALLOWED_ORIGINS.has(origin);
}

function verifyPrivatePassword(password, configuredHash) {
  if (typeof password !== "string" || !password || password.length > 256) return false;
  if (typeof configuredHash !== "string") return false;
  const [saltHex, expectedHex] = configuredHash.split(":");
  if (!saltHex || !expectedHex) return false;
  try {
    const actual = scryptSync(password, Buffer.from(saltHex, "hex"), 32);
    const expected = Buffer.from(expectedHex, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

module.exports = { ALLOWED_ORIGINS, isAllowedOrigin, verifyPrivatePassword };
