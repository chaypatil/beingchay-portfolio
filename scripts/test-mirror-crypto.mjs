// Security properties of the Mirror store. These are the assertions that matter
// if the store is ever dumped, so they test attacks, not just happy paths.
//
//   node scripts/test-mirror-crypto.mjs

import assert from "node:assert";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { encrypt, decrypt, fingerprint, generateKey, MirrorCryptoError } = require("../api/_lib/mirror/crypto.js");
const { createStore, MirrorStoreError } = require("../api/_lib/mirror/store.js");

const KEY = generateKey();
const env = { MIRROR_ENCRYPTION_KEY: KEY };
const SECRET = "Atendate 28mg. Fired 24 June. ₹1.7L banked. Lives in Mumbai.";

let passed = 0;
const check = async (name, fn) => {
  try { await fn(); console.log("PASS ", name); passed++; }
  catch (e) { console.log("FAIL ", name, "\n      ", e.message); process.exitCode = 1; }
};

await check("round trips", () => {
  assert.equal(decrypt(encrypt(SECRET, env), env), SECRET);
});

await check("ciphertext contains no plaintext fragment", () => {
  const blob = encrypt(SECRET, env);
  const raw = Buffer.from(blob, "base64").toString("latin1");
  for (const needle of ["Atendate", "28mg", "Mumbai", "Fired", "1.7L", "June"]) {
    assert.ok(!blob.includes(needle), `"${needle}" visible in base64`);
    assert.ok(!raw.includes(needle), `"${needle}" visible in raw bytes`);
  }
});

await check("same plaintext encrypts differently every time", () => {
  const a = encrypt(SECRET, env), b = encrypt(SECRET, env);
  assert.notEqual(a, b, "identical ciphertexts means a reused IV, which leaks equality");
  assert.equal(decrypt(a, env), decrypt(b, env));
});

await check("a wrong key cannot decrypt", () => {
  const blob = encrypt(SECRET, env);
  assert.throws(() => decrypt(blob, { MIRROR_ENCRYPTION_KEY: generateKey() }), MirrorCryptoError);
});

await check("tampering is detected, not silently accepted", () => {
  const raw = Buffer.from(encrypt(SECRET, env), "base64");
  raw[30] = raw[30] ^ 0xff; // flip a bit in the ciphertext body
  assert.throws(() => decrypt(raw.toString("base64"), env), MirrorCryptoError);
});

await check("a truncated blob is rejected", () => {
  const raw = Buffer.from(encrypt(SECRET, env), "base64");
  assert.throws(() => decrypt(raw.subarray(0, 20).toString("base64"), env), MirrorCryptoError);
});

await check("errors never echo the key or the plaintext", () => {
  try { decrypt("not-real-ciphertext", env); assert.fail("should have thrown"); }
  catch (e) {
    assert.ok(!e.message.includes(KEY), "error leaked the key");
    assert.ok(!e.message.includes("Atendate"), "error leaked plaintext");
  }
});

await check("a missing or malformed key fails closed", () => {
  assert.throws(() => encrypt("x", {}), /not set/);
  assert.throws(() => encrypt("x", { MIRROR_ENCRYPTION_KEY: "tooshort" }), /64 hex/);
  assert.throws(() => encrypt("x", { MIRROR_ENCRYPTION_KEY: "z".repeat(64) }), /64 hex/);
});

await check("store refuses a non-https endpoint, loopback excepted", () => {
  for (const bad of ["http://evil.local", "http://192.168.1.9", "http://store.example.com", "http://localhost.evil.com"]) {
    assert.throws(
      () => createStore({ env: { ...env, UPSTASH_REDIS_REST_URL: bad, UPSTASH_REDIS_REST_TOKEN: "t" } }),
      /https/, `accepted ${bad}`
    );
  }
  // Loopback over http is fine: the traffic never leaves the machine.
  for (const good of ["http://localhost:1234", "http://127.0.0.1:9999"]) {
    createStore({ env: { ...env, UPSTASH_REDIS_REST_URL: good, UPSTASH_REDIS_REST_TOKEN: "t" } });
  }
});

await check("store fails closed with no credentials", () => {
  assert.throws(() => createStore({ env }), MirrorStoreError);
});

await check("nothing readable reaches the wire, and never via the URL", async () => {
  const sent = [];
  const fetchImpl = async (url, init) => {
    sent.push({ url, body: init.body, auth: init.headers.Authorization });
    return { ok: true, json: async () => ({ result: "OK" }) };
  };
  const store = createStore({
    env: { ...env, UPSTASH_REDIS_REST_URL: "https://store.example", UPSTASH_REDIS_REST_TOKEN: "tok" },
    fetchImpl
  });
  await store.putCorpus(SECRET + " ".repeat(10));

  for (const call of sent) {
    assert.ok(!call.url.includes("Atendate"), "plaintext in the URL");
    assert.equal(call.url, "https://store.example", "commands must go in the body, not the query string");
    assert.ok(!call.body.includes("Atendate"), "plaintext in the request body");
    assert.ok(!call.body.includes("Mumbai"), "plaintext in the request body");
  }
  // The metadata call is allowed to carry a fingerprint and byte count, nothing else.
  const meta = JSON.parse(JSON.parse(sent[1].body)[2]);
  assert.equal(meta.fingerprint, fingerprint(SECRET + " ".repeat(10)));
  assert.ok(!JSON.stringify(meta).includes("Atendate"));
});

await check("store refuses to overwrite the corpus with nothing", async () => {
  const store = createStore({
    env: { ...env, UPSTASH_REDIS_REST_URL: "https://store.example", UPSTASH_REDIS_REST_TOKEN: "tok" },
    fetchImpl: async () => ({ ok: true, json: async () => ({ result: "OK" }) })
  });
  await assert.rejects(() => store.putCorpus(""), /empty/i);
  await assert.rejects(() => store.putCorpus("   "), /empty/i);
});

await check("session ids are validated, so no key-path injection", async () => {
  const store = createStore({
    env: { ...env, UPSTASH_REDIS_REST_URL: "https://store.example", UPSTASH_REDIS_REST_TOKEN: "tok" },
    fetchImpl: async () => ({ ok: true, json: async () => ({ result: "OK" }) })
  });
  for (const bad of ["../corpus", "a b", "x".repeat(65), "", "a:b"]) {
    await assert.rejects(() => store.putSession(bad, {}), /Invalid session id/, `accepted "${bad}"`);
  }
  await store.putSession("valid-id_123", { messages: [] });
});

await check("a store error never echoes the request body back", async () => {
  const store = createStore({
    env: { ...env, UPSTASH_REDIS_REST_URL: "https://store.example", UPSTASH_REDIS_REST_TOKEN: "tok" },
    fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) })
  });
  try { await store.putCorpus(SECRET + " ".repeat(10)); assert.fail("should have thrown"); }
  catch (e) {
    assert.ok(!e.message.includes("Atendate"), "error echoed plaintext");
    assert.ok(!e.message.includes("tok"), "error echoed the token");
  }
});

console.log(`\n${passed}/14 passed`);
