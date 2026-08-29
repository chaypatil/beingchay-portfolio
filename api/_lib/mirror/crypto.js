// Encryption for everything the Mirror stores outside this machine.
//
// Threat model, stated plainly so future edits do not quietly weaken it:
//
//   Defended against:
//     - The storage provider reading Chay's vault. They hold ciphertext only.
//     - A dump of the store leaking anything readable.
//     - Silent tampering. GCM authenticates; a modified blob fails to decrypt
//       rather than returning altered plaintext.
//     - Key reuse across records. Every record gets a fresh random IV.
//
//   NOT defended against, and no code here pretends otherwise:
//     - Someone who holds MIRROR_ENCRYPTION_KEY. That key lives in Vercel's
//       environment and nowhere else. It is never in git, never in a client
//       bundle, never in a log line, never in argv.
//     - A compromise of the Vercel runtime itself, which necessarily sees
//       plaintext at the moment it calls the model.
//
// True end-to-end encryption is not possible here: the server must hand the
// corpus to Anthropic, so it must be able to read it. Encrypting in the browser
// instead would mean shipping the API key to the browser, which is worse. This
// is the strongest design that does not trade one leak for a bigger one.
//
// AES-256-GCM. Layout: [12-byte IV][ciphertext][16-byte auth tag], base64.

const { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual, createHash } = require("node:crypto");

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

class MirrorCryptoError extends Error {
  constructor(message) {
    super(message);
    this.name = "MirrorCryptoError";
    // Deliberately generic on the wire. Detailed crypto failures are a probing
    // oracle; the caller logs the category, never the cause.
    this.code = "MIRROR_CRYPTO_ERROR";
  }
}

function loadKey(env = process.env) {
  const raw = env.MIRROR_ENCRYPTION_KEY;
  if (!raw) throw new MirrorCryptoError("MIRROR_ENCRYPTION_KEY is not set");
  if (!/^[0-9a-f]{64}$/i.test(raw.trim())) {
    throw new MirrorCryptoError("MIRROR_ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
  }
  const key = Buffer.from(raw.trim(), "hex");
  if (key.length !== KEY_BYTES) throw new MirrorCryptoError("Key is the wrong length");
  return key;
}

function encrypt(plaintext, env = process.env) {
  if (typeof plaintext !== "string") throw new MirrorCryptoError("Can only encrypt a string");
  const key = loadKey(env);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, body, cipher.getAuthTag()]).toString("base64");
}

function decrypt(payload, env = process.env) {
  if (typeof payload !== "string" || !payload) throw new MirrorCryptoError("Nothing to decrypt");
  const key = loadKey(env);
  let raw;
  try {
    raw = Buffer.from(payload, "base64");
  } catch {
    throw new MirrorCryptoError("Payload is not valid base64");
  }
  if (raw.length <= IV_BYTES + TAG_BYTES) throw new MirrorCryptoError("Payload is too short to be valid");

  const iv = raw.subarray(0, IV_BYTES);
  const tag = raw.subarray(raw.length - TAG_BYTES);
  const body = raw.subarray(IV_BYTES, raw.length - TAG_BYTES);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
  } catch {
    // Wrong key, or the blob was tampered with. Same error either way, on purpose.
    throw new MirrorCryptoError("Decryption failed");
  }
}

// Integrity check that does not require decrypting. Lets the sync script ask
// "is what I already pushed still current?" without pulling the whole corpus.
function fingerprint(plaintext) {
  return createHash("sha256").update(plaintext, "utf8").digest("hex");
}

function fingerprintsMatch(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function generateKey() {
  return randomBytes(KEY_BYTES).toString("hex");
}

module.exports = {
  MirrorCryptoError,
  encrypt,
  decrypt,
  fingerprint,
  fingerprintsMatch,
  generateKey,
  loadKey
};
