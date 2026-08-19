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
  ["mahavakya-prajnanam", "Prajñānam Brahma", "Consciousness is Brahman."],
  ["mahavakya-aham", "Aham Brahmāsmi", "I am Brahman."],
  ["mahavakya-tat-tvam", "Tat Tvam Asi", "You are That."],
  ["mahavakya-ayam-atma", "Ayam Ātmā Brahma", "This Self is Brahman."]
].map(([id, label, meaning]) => ({
  id,
  label,
  cluster:"Knowledge",
  one_line:meaning,
  synthesis:`${meaning} One declaration inside Chay's personal Mahāvākyas collection. Source citation pending.`,
  quotes:[meaning],
  connections:["four-mahavakyas"]
}));

// Withheld from the public corpus on 2026-08-19. These records read as a clinical
// symptom inventory or as reliability risk when seen out of context by someone
// evaluating Chay professionally. They remain in Chay OS; they do not ship here.
// Adding an id here is the supported way to withhold a record from the public site.
const withheldNodeIds = new Set([
  "voices",
  "spiral",
  "movement",
  "activation-model",
  "preparation-execution-paradox",
  "adhd-initiation-fog",
  "adhd-urgency-focus",
  "adhd-burst-rhythm",
  "adhd-forced-shutdown",
  "adhd-context-switching",
  "adhd-visible-progress",
  "adhd-novelty-decay",
  "adhd-sleep-window",
  "adhd-rejection-spike",
  "adhd-restless-current"
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

const nodes = sourceData.nodes.filter(node => !withheldNodeIds.has(node.id)).map(node => {
  if (node.id === "love") {
    return {
      id:"love",
      label:"Love",
      cluster:node.cluster,
      star_core:node.star_core,
      one_line:"████████",
      synthesis:"Private layer. Stories, names, instances and source notes are withheld pending review.",
      quotes:[],
      connections:[]
    };
  }
  if (node.id !== "aham-brahmasmi") {
    return {
      ...node,
      connections:(node.connections || []).filter(id => id !== "love" && !withheldNodeIds.has(id))
    };
  }
  return {
    ...node,
    label:"Slice / Whole",
    one_line:"A finite unit of consciousness is a slice of the same larger whole.",
    synthesis:"Chay's personal model: one finite perspective is a slice of the ocean without becoming separate from the ocean.",
    quotes:["I am the universe. I am the Brahma. I am a slice of that entire ocean."],
    connections:[...new Set([...(node.connections || []).filter(id => id !== "love" && !withheldNodeIds.has(id)), "four-mahavakyas"])]
  };
});
if (!nodes.some(node => node.id === "love")) {
  nodes.push({
    id:"love",
    label:"Love",
    cluster:"Self",
    one_line:"████████",
    synthesis:"Private layer. Stories, names, instances and source notes are withheld pending review.",
    quotes:[],
    connections:[]
  });
}

const mahavakyaParent = {
  id:"four-mahavakyas",
  label:"The Four Mahāvākyas",
  cluster:"Knowledge",
  one_line:"Four declarations held together as one personal philosophical frame.",
  synthesis:"Prajñānam Brahma — consciousness is Brahman. Aham Brahmāsmi — I am Brahman. Tat Tvam Asi — you are That. Ayam Ātmā Brahma — this Self is Brahman. Source citations remain pending.",
  quotes:[],
  connections:["aham-brahmasmi", ...mahavakyaChildren.map(child => child.id)]
};

const publicCorpus = {
  meta:{
    title:sourceData.meta.title,
    description:sourceData.meta.description,
    source_note:sourceData.meta.source_note,
    generator_version:"1.1.0"
  },
  nodes:[...nodes, mahavakyaParent, ...mahavakyaChildren]
};

fs.mkdirSync(path.dirname(target), { recursive:true });
fs.writeFileSync(target, `${JSON.stringify(publicCorpus, null, 2)}\n`, "utf8");
console.log(`wrote ${path.relative(path.join(__dirname, ".."), target)} (${publicCorpus.nodes.length} public-safe records)`);
