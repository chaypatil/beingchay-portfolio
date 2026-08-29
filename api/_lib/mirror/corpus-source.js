// Where the Dialogue Lab gets Chay's corpus at request time.
//
// Codex's original design read it from DIALOGUE_PRIVATE_CORPUS_B64, a base64
// environment variable. That could never have worked: Vercel caps environment
// variables at roughly 64KB total and the corpus is about 700KB. The encrypted
// store replaces it. The env-var path is kept as a fallback purely so a tiny
// hand-made corpus still works for local testing.
//
// The corpus is fetched, decrypted and cached in module scope. Serverless
// functions reuse a warm instance across requests, so a returning conversation
// usually skips the fetch entirely. The cache is short: a stale corpus is worse
// than a slow one, because it means the mirror is working from a version of him
// that has already changed.

const { createStore } = require("./store");

const CACHE_TTL_MS = 5 * 60 * 1000;

let cached = null; // { text, fetchedAt, fingerprint }

function legacyEnvCorpus(env) {
  if (env.DIALOGUE_PRIVATE_CORPUS_APPROVED !== "true" || !env.DIALOGUE_PRIVATE_CORPUS_B64) return null;
  try {
    return Buffer.from(env.DIALOGUE_PRIVATE_CORPUS_B64, "base64").toString("utf8");
  } catch {
    return null;
  }
}

// The pipeline retrieves over records with {id, title, claim}. The corpus is one
// large markdown document, so split it on the <source path="..."> markers the
// builder emits. One record per source file keeps retrieval meaningful: a hit
// points at a real note rather than an arbitrary slice.
function toRecords(text) {
  const records = [];
  const pattern = /<source path="([^"]+)"[^>]*>\n([\s\S]*?)\n<\/source>/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const [, sourcePath, body] = match;
    const id = sourcePath.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
    const heading = body.match(/^#\s+(.+)$/m);
    records.push({
      id,
      title: heading ? heading[1].trim() : sourcePath.split("/").pop(),
      claim: body.trim(),
      content: body.trim(),
      approvalState: "approved",
      tags: []
    });
  }
  // No markers means someone supplied a plain document. Treat it as one record
  // rather than silently returning nothing.
  if (!records.length && text.trim()) {
    records.push({ id: "corpus", title: "Corpus", claim: text.trim(), content: text.trim(), approvalState: "approved", tags: [] });
  }
  return records;
}

async function loadCorpusText(env) {
  const now = Date.now();
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) return cached.text;

  let text = null;
  try {
    text = await createStore({ env }).getCorpus();
  } catch {
    // Store unreachable or unconfigured. Fall through to the legacy path rather
    // than failing the whole request; an empty corpus degrades to a mirror that
    // knows nothing, which is visible and recoverable.
    text = null;
  }
  if (!text) text = legacyEnvCorpus(env);
  if (!text) return null;

  cached = { text, fetchedAt: now };
  return text;
}

async function loadCorpusRecords(env) {
  const text = await loadCorpusText(env);
  return text ? toRecords(text) : [];
}

function clearCache() { cached = null; }

module.exports = { loadCorpusText, loadCorpusRecords, toRecords, clearCache, CACHE_TTL_MS };
