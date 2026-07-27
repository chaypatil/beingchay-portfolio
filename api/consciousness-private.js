const { createHmac, scryptSync, timingSafeEqual } = require("node:crypto");

const ALLOWED_ORIGINS = new Set([
  "https://beingchay.com",
  "https://www.beingchay.com",
  "https://beingchay.vercel.app"
]);

function deny(res, status, message) {
  res.status(status).json({ error: message });
}

function codexmapToken(configuredHash) {
  return createHmac("sha256", configuredHash)
    .update("beingchay-codexmap-access-v1")
    .digest("base64url");
}

function readCookie(req, name) {
  const source = req.headers.cookie || "";
  for (const part of source.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return "";
}

function tokensMatch(actual, expected) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");

  const configuredHash = process.env.CONSCIOUSNESS_PRIVATE_PASSWORD_HASH;
  if (!configuredHash) return deny(res, 503, "Private layer unavailable");

  if (req.method === "GET") {
    const accepted = tokensMatch(readCookie(req, "codexmap_access"), codexmapToken(configuredHash));
    if (!accepted) return deny(res, 401, "Access denied");
    const encodedPayload = process.env.CONSCIOUSNESS_PRIVATE_DATA_B64;
    if (!encodedPayload) return deny(res, 503, "Private layer unavailable");
    try {
      const payload = JSON.parse(Buffer.from(encodedPayload, "base64").toString("utf8"));
      return res.status(200).json({ ok:true, payload });
    } catch {
      return deny(res, 503, "Private layer unavailable");
    }
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return deny(res, 405, "Method not allowed");
  }

  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.has(origin)) return deny(res, 403, "Forbidden");

  const encodedPayload = process.env.CONSCIOUSNESS_PRIVATE_DATA_B64;
  if (!configuredHash || !encodedPayload) return deny(res, 503, "Private layer unavailable");

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  } catch {
    return deny(res, 400, "Invalid request");
  }
  const password = typeof body.password === "string" ? body.password : "";
  if (!password || password.length > 256) {
    await new Promise(resolve => setTimeout(resolve, 650));
    return deny(res, 401, "Access denied");
  }

  const [saltHex, expectedHex] = configuredHash.split(":");
  if (!saltHex || !expectedHex) return deny(res, 503, "Private layer unavailable");

  let accepted = false;
  try {
    const actual = scryptSync(password, Buffer.from(saltHex, "hex"), 32);
    const expected = Buffer.from(expectedHex, "hex");
    accepted = actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return deny(res, 503, "Private layer unavailable");
  }

  if (!accepted) {
    await new Promise(resolve => setTimeout(resolve, 650));
    res.setHeader("Retry-After", "1");
    return deny(res, 401, "Access denied");
  }

  if (body.intent === "codexmap") {
    const token = codexmapToken(configuredHash);
    res.setHeader(
      "Set-Cookie",
      `codexmap_access=${token}; Path=/; Max-Age=28800; HttpOnly; Secure; SameSite=Strict`
    );
    return res.status(200).json({ ok: true });
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64").toString("utf8"));
    return res.status(200).json(payload);
  } catch {
    return deny(res, 503, "Private layer unavailable");
  }
};
