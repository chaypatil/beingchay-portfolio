const { isAllowedOrigin, verifyPrivatePassword } = require("../lib/private-auth");
const { createProvider, ProviderBoundaryError } = require("../lib/dialogue-lab/provider-adapter");
const { createSessionStore, SessionStoreBoundaryError } = require("../lib/dialogue-lab/session-store");
const { createDialogueLab, DialogueValidationError } = require("../lib/dialogue-lab/pipeline");

function deny(res, status, error, message) {
  return res.status(status).json({ error, message });
}

function privateCorpus(env) {
  if (env.DIALOGUE_PRIVATE_CORPUS_APPROVED !== "true" || !env.DIALOGUE_PRIVATE_CORPUS_B64) return [];
  try {
    const records = JSON.parse(Buffer.from(env.DIALOGUE_PRIVATE_CORPUS_B64, "base64").toString("utf8"));
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

function createHandler({ env = process.env, provider, store, corpus } = {}) {
  return async function dialogueLabHandler(req, res) {
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");

    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return deny(res, 405, "METHOD_NOT_ALLOWED", "Method not allowed");
    }
    if (!isAllowedOrigin(req.headers.origin)) return deny(res, 403, "FORBIDDEN", "Forbidden");
    if (!env.CONSCIOUSNESS_PRIVATE_PASSWORD_HASH) {
      return deny(res, 503, "PRIVATE_AUTH_UNAVAILABLE", "Dialogue Lab unavailable");
    }

    let body;
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      if (JSON.stringify(body).length > 65536) throw new Error("too large");
    } catch {
      return deny(res, 400, "INVALID_REQUEST", "Invalid request");
    }
    if (!verifyPrivatePassword(body.password, env.CONSCIOUSNESS_PRIVATE_PASSWORD_HASH)) {
      await new Promise(resolve => setTimeout(resolve, 650));
      res.setHeader("Retry-After", "1");
      return deny(res, 401, "ACCESS_DENIED", "Access denied");
    }

    const activeProvider = provider || createProvider({ env });
    const activeStore = store || createSessionStore({ env });
    const lab = createDialogueLab({
      provider:activeProvider,
      store:activeStore,
      corpus:corpus || privateCorpus(env)
    });

    try {
      const payload = body.payload || {};
      let result;
      switch (body.action) {
        case "start": result = await lab.start(payload); break;
        case "turn": result = await lab.turn(payload); break;
        case "end": result = await lab.end(payload); break;
        case "decide": result = await lab.decide(payload); break;
        case "export": result = await lab.exportPrivateSource(payload); break;
        default: return deny(res, 400, "UNKNOWN_ACTION", "Unknown Dialogue Lab action");
      }
      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof ProviderBoundaryError || error instanceof SessionStoreBoundaryError) {
        return deny(
          res,
          503,
          error.code,
          "Private inference is built but inactive until a provider, retention policy and encrypted session store are approved."
        );
      }
      if (error instanceof DialogueValidationError) return deny(res, 400, error.code, error.message);
      return deny(res, 500, "DIALOGUE_LAB_ERROR", "Dialogue Lab could not complete the request");
    }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
