const { isAllowedOrigin, verifyPrivatePassword } = require("../lib/private-auth");

function deny(res, status, message) {
  res.status(status).json({ error: message });
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("X-Content-Type-Options", "nosniff");

  const configuredHash = process.env.CONSCIOUSNESS_PRIVATE_PASSWORD_HASH;
  if (!configuredHash) return deny(res, 503, "Private layer unavailable");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return deny(res, 405, "Method not allowed");
  }

  const origin = req.headers.origin;
  if (!isAllowedOrigin(origin)) return deny(res, 403, "Forbidden");

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

  const accepted = verifyPrivatePassword(password, configuredHash);

  if (!accepted) {
    await new Promise(resolve => setTimeout(resolve, 650));
    res.setHeader("Retry-After", "1");
    return deny(res, 401, "Access denied");
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64").toString("utf8"));
    return res.status(200).json(payload);
  } catch {
    return deny(res, 503, "Private layer unavailable");
  }
};
