// Copies the explicitly public-safe portable vault extract into the site.
// Raw notes and the private-only reference are never read by this script.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const source = path.join(
  os.homedir(),
  "OneDrive",
  "Documents",
  "Chay OS",
  "vault",
  "cognitive-mirror",
  "consciousness-site",
  "consciousness-dataset-portable.json"
);
const target = path.join(__dirname, "..", "consciousness", "sources", "public-vault.json");
const allowedNodeKeys = new Set([
  "id", "label", "cluster", "star_core", "one_line", "synthesis", "quotes", "connections"
]);

const sourceData = JSON.parse(fs.readFileSync(source, "utf8"));
if (!sourceData?.meta?.description?.includes("public-safe")) {
  throw new Error("Refusing to sync a source corpus that is not explicitly marked public-safe.");
}

for (const node of sourceData.nodes || []) {
  const unexpected = Object.keys(node).filter(key => !allowedNodeKeys.has(key));
  if (unexpected.length) {
    throw new Error(`Refusing unexpected fields on ${node.id}: ${unexpected.join(", ")}`);
  }
}

const publicCorpus = {
  meta:{
    title:sourceData.meta.title,
    description:sourceData.meta.description,
    source_note:sourceData.meta.source_note,
    generated_at:new Date().toISOString()
  },
  nodes:sourceData.nodes
};

fs.mkdirSync(path.dirname(target), { recursive:true });
fs.writeFileSync(target, `${JSON.stringify(publicCorpus, null, 2)}\n`, "utf8");
console.log(`wrote ${path.relative(path.join(__dirname, ".."), target)} (${publicCorpus.nodes.length} public-safe records)`);
