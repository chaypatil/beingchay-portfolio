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
const mahavakyaChildren = [
  ["mahavakya-prajnanam", "Prajñānam Brahma", "Consciousness is Brahman.", "Aitareya Upanishad"],
  ["mahavakya-aham", "Aham Brahmāsmi", "I am Brahman.", "Bṛhadāraṇyaka Upanishad"],
  ["mahavakya-tat-tvam", "Tat Tvam Asi", "You are That.", "Chāndogya Upanishad"],
  ["mahavakya-ayam-atma", "Ayam Ātmā Brahma", "This Self is Brahman.", "Māṇḍūkya Upanishad"]
].map(([id, label, meaning, sourceLabel]) => ({
  id,
  label,
  cluster:"Knowledge",
  one_line:meaning,
  synthesis:`${meaning} One of the four Mahāvākyas used here as Upanishadic context. Source frame: ${sourceLabel}.`,
  quotes:[meaning],
  connections:["aham-brahmasmi"]
}));

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

const nodes = sourceData.nodes.map(node => {
  if (node.id !== "aham-brahmasmi") return node;
  return {
    ...node,
    label:"The Four Mahāvākyas",
    one_line:"Four Upanishadic declarations about Brahman, consciousness and the self.",
    synthesis:"Prajñānam Brahma — consciousness is Brahman. Aham Brahmāsmi — I am Brahman. Tat Tvam Asi — you are That. Ayam Ātmā Brahma — this Self is Brahman. Chay's canonical note explicitly invokes only Aham Brahmāsmi for his slice-and-whole model; the other three are contextual parallels rather than retroactive claims about what he wrote.",
    quotes:["I am the universe. I am the Brahma. I am a slice of that entire ocean."],
    connections:[...new Set([...(node.connections || []), ...mahavakyaChildren.map(child => child.id)])]
  };
});

const publicCorpus = {
  meta:{
    title:sourceData.meta.title,
    description:sourceData.meta.description,
    source_note:sourceData.meta.source_note,
    generated_at:new Date().toISOString()
  },
  nodes:[...nodes, ...mahavakyaChildren]
};

fs.mkdirSync(path.dirname(target), { recursive:true });
fs.writeFileSync(target, `${JSON.stringify(publicCorpus, null, 2)}\n`, "utf8");
console.log(`wrote ${path.relative(path.join(__dirname, ".."), target)} (${publicCorpus.nodes.length} public-safe records)`);
