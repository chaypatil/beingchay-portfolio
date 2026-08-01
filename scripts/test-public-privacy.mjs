import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VAULT = path.join(os.homedir(), "OneDrive", "Documents", "Chay OS", "vault");
const INDEX = path.join(ROOT, "consciousness", "vault", "public-vault-index.json");
const CORPUS = path.join(ROOT, "consciousness", "sources", "public-vault.json");
const hashFile = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const run = file => {
  const result = spawnSync(process.execPath, [file], { cwd:ROOT, encoding:"utf8" });
  assert.equal(result.status, 0, `${file} failed:\n${result.stderr || result.stdout}`);
};

run("scripts/build-public-brain-vault.mjs");
const firstVaultHash = hashFile(INDEX);
run("scripts/build-public-brain-vault.mjs");
assert.equal(hashFile(INDEX), firstVaultHash, "Public-vault generation must be deterministic.");
run("scripts/sync-public-source-corpus.js");
const firstCorpusHash = hashFile(CORPUS);
run("scripts/sync-public-source-corpus.js");
assert.equal(hashFile(CORPUS), firstCorpusHash, "Public source-corpus generation must be deterministic.");

const index = JSON.parse(fs.readFileSync(INDEX, "utf8"));
const corpus = JSON.parse(fs.readFileSync(CORPUS, "utf8"));
assert.equal(index.records.length, 111);
assert.equal(index.meta.records, 111);
assert.equal(index.records.filter(record => record.privacy === "public").length, index.meta.public);
assert.equal(index.records.filter(record => record.privacy !== "public").length, index.meta.redacted);
assert(index.records.every(record => record.privacyClass === "P0"), "Every emitted record must contain P0 output only.");
assert.equal(index.meta.public, 14, "Only explicitly allowlisted P0 bodies may be readable.");
assert.equal(index.meta.redacted, 97, "Every unapproved record must fail closed.");
const builder = fs.readFileSync(path.join(ROOT, "scripts", "build-public-brain-vault.mjs"), "utf8");
assert.match(builder, /PUBLIC_BODY_APPROVALS = new Map/);
assert.match(builder, /PUBLIC_BODY_APPROVALS\.get\(relativePath\) === sourceHash/);

const allowedRecordKeys = new Set(["id", "path", "title", "type", "cluster", "privacy", "privacyClass", "sourcePrivacyClass", "redactions", "nodeIds", "content"]);
for (const record of index.records) {
  assert.deepEqual(Object.keys(record).filter(key => !allowedRecordKeys.has(key)), [], `Forbidden public-vault fields on ${record.id}`);
  if (record.sourcePrivacyClass !== "P0") {
    assert(record.privacy !== "public", `${record.id} inherits private source material but was emitted as public.`);
  }
}
const redactedRecords = index.records.filter(record => record.privacy === "redacted");
assert.equal(redactedRecords.length, 97);
assert.equal(index.records.filter(record => record.privacy === "redacted-extract").length, 0);
for (const record of redactedRecords) {
  assert.equal(record.privacy, "redacted");
  assert.equal(record.sourcePrivacyClass, "P3");
  assert.equal(record.content, "[REDACTED_DOCUMENT]");
  assert.equal(record.title, "Private record");
  assert.equal(record.type, "private");
  assert.equal(record.cluster, "Private");
  assert.deepEqual(record.nodeIds, []);
  assert.match(record.path, /^private\/record-\d{3}\.md$/);
}

const peopleDir = path.join(VAULT, "entities", "people");
const publicPeople = new Set(["Alexander the Great", "Harvey Specter", "Kanye West", "Klangkuenstler"]);
const privateTerms = [];
for (const name of fs.readdirSync(peopleDir).filter(name => name.endsWith(".md"))) {
  const base = path.basename(name, ".md");
  if (publicPeople.has(base)) continue;
  privateTerms.push(base);
  const raw = fs.readFileSync(path.join(peopleDir, name), "utf8");
  const title = raw.match(/^title:\s*(.+)$/mi)?.[1]?.trim().replace(/^["']|["']$/g, "") || base;
  privateTerms.push(title.replace(/\s*\([^)]*\)\s*/g, " ").trim());
}
const employerTerms = ["everis", "prosp", "peoplebox", "settos", "intercom", "rob rawson"];
const deployedTextFiles = [
  "index.html",
  "cloud-consciousness.html",
  "consciousness/index.html",
  "consciousness/graph-data.js",
  "consciousness/map-page.js",
  "consciousness/brain/brain-mapping.js",
  "consciousness/vault/index.html",
  "consciousness/vault/vault.js",
  "consciousness/vault/public-vault-index.json",
  "consciousness/sources/public-vault.json",
  "consciousness/semantic/semantic-model.json",
  "consciousness/dialogue/index.html",
  "consciousness/dialogue/dialogue.js",
  "consciousness/dialogue/dialogue.css",
  "api/dialogue-lab.js",
  "lib/dialogue-lab/pipeline.js",
  "lib/dialogue-lab/provider-adapter.js",
  "lib/dialogue-lab/retrieval.js",
  "lib/dialogue-lab/session-store.js",
  "codexmap/index.html",
  "codexmap/brain-net.js"
].map(relative => path.join(ROOT, relative)).filter(fs.existsSync);
const publicText = deployedTextFiles.map(file => fs.readFileSync(file, "utf8")).join("\n");
assert.doesNotMatch(publicText, /[A-Za-z]:[\\/]+Users[\\/]+/i, "Absolute private paths must not enter public artifacts.");
assert.doesNotMatch(publicText, /frameworks[\\/]_(raw|pipeline)/i, "Raw archive and pipeline placement must not enter public artifacts.");
assert.doesNotMatch(publicText, /\[PRIVATE DETAIL REDACTED\]/i, "Private records must be opaque instead of shipping sanitized prose.");
assert.doesNotMatch(
  publicText,
  /first love|founding wound|pothos is not only his drive toward truth|monogamy confusion/i,
  "Public artifacts must not expose Love stories or their editorial framing."
);
for (const term of [...new Set([...privateTerms, ...employerTerms])].filter(term => term.length > 3)) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert(!new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, "i").test(publicText), `A private term survived generated public output (${term.length} characters).`);
}

const loveNode = corpus.nodes.find(node => node.id === "love");
assert.equal(loveNode.one_line, "████████");
assert.deepEqual(loveNode.quotes, []);
assert.deepEqual(loveNode.connections, []);

const allowedCorpusKeys = new Set(["id", "label", "cluster", "star_core", "one_line", "synthesis", "quotes", "connections"]);
for (const node of corpus.nodes) {
  assert.deepEqual(Object.keys(node).filter(key => !allowedCorpusKeys.has(key)), [], `Forbidden retrieval-corpus field on ${node.id}`);
}
assert(!("generated_at" in corpus.meta), "Nondeterministic generation timestamps must not enter the corpus.");

const vaultClient = fs.readFileSync(path.join(ROOT, "consciousness", "vault", "vault.js"), "utf8");
assert.match(vaultClient, /record\.privacy === "redacted"\s*\?\s*redactionDocument\(record\)/);
assert.match(vaultClient, /document\.createElement\("span"\)/);
assert.match(vaultClient, /cache:"no-store"/);

const mapClient = fs.readFileSync(path.join(ROOT, "consciousness", "map-page.js"), "utf8");
assert.doesNotMatch(mapClient, /localStorage\.setItem\(questionDraftKey/);
assert.match(mapClient, /localStorage\.removeItem\(questionDraftKey\)/);

const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8"));
const consciousnessHeaders = vercel.headers.find(rule => rule.source === "/consciousness/:path*")?.headers || [];
const headerValue = key => consciousnessHeaders.find(header => header.key === key)?.value || "";
assert.match(headerValue("Content-Security-Policy"), /default-src 'self'/);
assert.match(headerValue("Content-Security-Policy"), /frame-ancestors 'none'/);
assert.equal(headerValue("X-Frame-Options"), "DENY");
assert.equal(headerValue("Referrer-Policy"), "no-referrer");
const dialogueHeaders = vercel.headers.find(rule => rule.source === "/consciousness/dialogue/:path*")?.headers || [];
const dialogueHeader = key => dialogueHeaders.find(header => header.key === key)?.value || "";
assert.match(dialogueHeader("Cache-Control"), /private, no-store/);
assert.match(dialogueHeader("X-Robots-Tag"), /noindex/);
const robots = fs.readFileSync(path.join(ROOT, "robots.txt"), "utf8");
assert.match(robots, /Disallow: \/consciousness\/vault\//);
assert.match(robots, /Disallow: \/consciousness\/sources\//);

console.log("public privacy and deterministic generation checks passed");
