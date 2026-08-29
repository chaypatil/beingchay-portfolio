const { isAllowedOrigin, verifyPrivatePassword } = require("./_lib/private-auth");
const { createProvider, ProviderBoundaryError } = require("./_lib/dialogue-lab/provider-adapter");
const { createSessionStore, SessionStoreBoundaryError } = require("./_lib/dialogue-lab/session-store");
const { createDialogueLab, DialogueValidationError } = require("./_lib/dialogue-lab/pipeline");
const { loadCorpusRecords, loadCorpusText } = require("./_lib/mirror/corpus-source");
const { createStore } = require("./_lib/mirror/store");

function deny(res, status, error, message) {
  return res.status(status).json({ error, message });
}

// Corpus now comes from the encrypted store. The old base64 env-var path could
// never have held it: Vercel caps env vars near 64KB and the corpus is ~700KB.
// loadCorpusRecords falls back to that env var if the store is unconfigured, so
// local testing with a small hand-made corpus still works.

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

    // The corpus is loaded before the provider so it can be handed to it as the
    // cached system prefix. Without this the mirror runs on retrieval alone and
    // knows only whatever four records matched a keyword.
    let corpusRecords = corpus;
    let corpusText = null;
    if (!corpusRecords) {
      try {
        corpusText = await loadCorpusText(env);
        corpusRecords = await loadCorpusRecords(env);
      } catch {
        corpusRecords = [];
      }
    }

    const activeProvider = provider || createProvider({
      env: corpusText ? { ...env, MIRROR_CORPUS: corpusText } : env
    });
    const activeStore = store || createSessionStore({ env });
    const lab = createDialogueLab({
      provider:activeProvider,
      store:activeStore,
      corpus:corpusRecords || []
    });

    try {
      const payload = body.payload || {};
      let result;
      switch (body.action) {
        case "start": result = await lab.start(payload); break;
        case "turn": result = await lab.turn(payload); break;
        case "end": {
          result = await lab.end(payload);
          // Hand the finished session to the encrypted store so the laptop can
          // pull it into the vault. Best effort on purpose: a store outage must
          // not cost him the conversation he just had, and the transcript is
          // still downloadable from the page either way.
          try {
            const session = await activeStore.get(payload.sessionId);
            if (session) await createStore({ env }).putSession(session.id, session);
          } catch {
            // Swallowed deliberately. Never surface store internals to the client.
          }
          break;
        }
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
