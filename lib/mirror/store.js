// Encrypted store for the Mirror. Upstash Redis over its REST API, so this works
// from a Vercel function and from a laptop with no client library and no
// dependency added to the site.
//
// Everything that could identify or expose Chay is encrypted before it gets here.
// This module never sees plaintext it did not encrypt itself, and never logs a
// value. Keys are opaque ids; the readable metadata is deliberately limited to
// timestamps, byte counts and fingerprints.
//
// Required env:
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN
//   MIRROR_ENCRYPTION_KEY

const { encrypt, decrypt, fingerprint } = require("./crypto");

const CORPUS_KEY = "mirror:corpus";
const CORPUS_META_KEY = "mirror:corpus:meta";
const SESSION_PREFIX = "mirror:session:";
const SESSION_INDEX = "mirror:sessions:pending";

// A pulled session sticks around this long before expiring, so a failed sync can
// be retried but nothing lingers in the cloud indefinitely.
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

class MirrorStoreError extends Error {
  constructor(message, code = "MIRROR_STORE_ERROR") {
    super(message);
    this.name = "MirrorStoreError";
    this.code = code;
  }
}

function createStore({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const url = (env.UPSTASH_REDIS_REST_URL || "").replace(/\/+$/, "");
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new MirrorStoreError("Upstash credentials are not configured", "MIRROR_STORE_UNCONFIGURED");
  // https everywhere, with one exception: plain http to loopback. That traffic
  // never leaves the machine so there is nothing to intercept, and without it the
  // sync path cannot be tested end to end against a local fake. Any other host
  // must be https — an http URL pointing anywhere else is either a mistake or an
  // attempt to redirect the corpus somewhere it can be read.
  const isLoopback = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(url);
  if (!/^https:\/\//i.test(url) && !isLoopback) {
    throw new MirrorStoreError("Store URL must be https", "MIRROR_STORE_INSECURE");
  }

  // Commands go in the POST body, never the URL. Query strings end up in access
  // logs and proxy caches; ciphertext does not belong there even encrypted.
  async function command(args) {
    let response;
    try {
      response = await fetchImpl(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(args)
      });
    } catch {
      throw new MirrorStoreError("Store is unreachable", "MIRROR_STORE_UNREACHABLE");
    }
    if (!response.ok) {
      // Never echo the body: it can contain the command, which contains ciphertext.
      throw new MirrorStoreError(`Store rejected the request (${response.status})`, "MIRROR_STORE_REJECTED");
    }
    const json = await response.json();
    if (json.error) throw new MirrorStoreError("Store returned an error", "MIRROR_STORE_REJECTED");
    return json.result;
  }

  return {
    // --- corpus: laptop pushes, site reads ---

    async putCorpus(plaintext) {
      if (typeof plaintext !== "string" || !plaintext.trim()) {
        throw new MirrorStoreError("Refusing to store an empty corpus", "MIRROR_STORE_EMPTY");
      }
      const meta = {
        fingerprint: fingerprint(plaintext),
        bytes: Buffer.byteLength(plaintext, "utf8"),
        pushedAt: new Date().toISOString()
      };
      await command(["SET", CORPUS_KEY, encrypt(plaintext, env)]);
      await command(["SET", CORPUS_META_KEY, JSON.stringify(meta)]);
      return meta;
    },

    async getCorpus() {
      const payload = await command(["GET", CORPUS_KEY]);
      if (!payload) return null;
      return decrypt(payload, env);
    },

    async getCorpusMeta() {
      const raw = await command(["GET", CORPUS_META_KEY]);
      if (!raw) return null;
      try { return JSON.parse(raw); } catch { return null; }
    },

    // --- sessions: site writes from the phone, laptop pulls into the vault ---

    async putSession(id, session) {
      if (!/^[a-zA-Z0-9_-]{1,64}$/.test(String(id || ""))) {
        throw new MirrorStoreError("Invalid session id", "MIRROR_STORE_BAD_ID");
      }
      const body = encrypt(JSON.stringify(session), env);
      await command(["SET", `${SESSION_PREFIX}${id}`, body, "EX", String(SESSION_TTL_SECONDS)]);
      await command(["SADD", SESSION_INDEX, id]);
      return { id, bytes: body.length };
    },

    async listPendingSessions() {
      const ids = await command(["SMEMBERS", SESSION_INDEX]);
      return Array.isArray(ids) ? ids : [];
    },

    async getSession(id) {
      const payload = await command(["GET", `${SESSION_PREFIX}${id}`]);
      if (!payload) return null;
      try {
        return JSON.parse(decrypt(payload, env));
      } catch {
        throw new MirrorStoreError(`Session ${id} could not be decrypted`, "MIRROR_STORE_UNDECRYPTABLE");
      }
    },

    // Only ever called after the laptop has written the session to disk and
    // verified it. Losing a conversation is worse than keeping ciphertext a
    // little longer, so deletion is the last step and never the first.
    async deleteSession(id) {
      await command(["DEL", `${SESSION_PREFIX}${id}`]);
      await command(["SREM", SESSION_INDEX, id]);
    }
  };
}

module.exports = { createStore, MirrorStoreError, SESSION_TTL_SECONDS };
