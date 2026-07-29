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
const adhdChildren = [
  {
    id:"adhd-initiation-fog",
    label:"Initiation Fog",
    one_line:"Knowing a task matters does not reliably make it possible to start.",
    synthesis:"A documented gap between knowing and ignition: required tasks can produce fog even when their importance is understood, while attention defects toward something immediately stimulating.",
    quotes:[],
    connections:["adhd","adhd-forced-shutdown","preparation"]
  },
  {
    id:"adhd-urgency-focus",
    label:"Urgency Focus",
    one_line:"Real stakes can flip diffuse attention into sharp short-term focus.",
    synthesis:"Urgency and approaching deadlines are recorded as powerful ignition conditions. This explains a recurring pattern without claiming crisis is the ideal or only way to work.",
    quotes:["I explode under pressure and my focus becomes laser sharp."],
    connections:["adhd","adhd-burst-rhythm"]
  },
  {
    id:"adhd-burst-rhythm",
    label:"Burst Rhythm",
    one_line:"Output arrives in intense windows followed by genuine recovery needs.",
    synthesis:"The documented work rhythm is episodic rather than linear: concentrated periods of unusually high output, then low-activation recovery. It is a lived pattern, not a productivity prescription.",
    quotes:[],
    connections:["adhd","adhd-urgency-focus","adhd-visible-progress"]
  },
  {
    id:"adhd-forced-shutdown",
    label:"Forced-Effort Shutdown",
    one_line:"More force through the fog can produce sleepiness instead of usable effort.",
    synthesis:"Chay reports that forcing effort through initiation fog can end in cognitive shutdown or sleepiness rather than steady compliance. The public record does not generalize that response to every episode of fatigue.",
    quotes:["If I force myself to do things even if my brain fog is there, my body literally renders me to sleepy mode."],
    connections:["adhd","adhd-initiation-fog"]
  },
  {
    id:"adhd-context-switching",
    label:"Context-Switch Cost",
    one_line:"Changing mental frames carries a disproportionate activation cost.",
    synthesis:"Switching domains, tools or task frames is documented as a major drain. Transition support and a clear opening move often matter more than adding another large plan.",
    quotes:[],
    connections:["adhd","solitude-unlock"]
  },
  {
    id:"adhd-visible-progress",
    label:"Visible Progress",
    one_line:"Attention holds longer when forward motion can be seen.",
    synthesis:"Tangible output such as a sent message, saved file, visible count or working artifact helps engagement persist. Invisible work can remain valuable while still costing more activation.",
    quotes:[],
    connections:["adhd","adhd-burst-rhythm"]
  },
  {
    id:"adhd-novelty-decay",
    label:"Novelty Decay",
    one_line:"A new system can stop activating attention once it stops feeling new.",
    synthesis:"Plans and scaffolds are documented as working briefly before novelty fades. The recorded three-to-seven-day range is a working estimate, not a measured constant.",
    quotes:[],
    connections:["adhd","preparation-execution-paradox"]
  },
  {
    id:"adhd-sleep-window",
    label:"Sleep Window",
    one_line:"Missing the first sleepy window can make sleep initiation much harder.",
    synthesis:"A narrow sleepiness window is documented as part of Chay's lived timing sensitivity. This is a personal observation, not a public sleep-disorder claim.",
    quotes:[],
    connections:["adhd","solitude-unlock"]
  },
  {
    id:"adhd-rejection-spike",
    label:"Rejection Spike",
    one_line:"Perceived failure can trigger a fast crash, perfectionism and an exit urge.",
    synthesis:"The public-safe loop preserves the pattern without its incidents: perceived criticism, rejection or falling short can produce sudden avoidance, restart impulses and inconsistency. RSD is experiential vocabulary here, not a standalone DSM claim.",
    quotes:[],
    connections:["adhd","preparation-execution-paradox"]
  },
  {
    id:"adhd-restless-current",
    label:"Restless Current",
    one_line:"Inattentiveness can coexist with fidgeting and loud internal debate.",
    synthesis:"The record describes inner restlessness, physical fidgeting and several lines of thought arguing at once. It overlaps with the Two Voices synthesis without implying literal separate selves.",
    quotes:[],
    connections:["adhd","voices"]
  }
].map(node => ({ ...node, cluster:"Self" }));

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
      connections:(node.connections || []).filter(id => id !== "love")
    };
  }
  return {
    ...node,
    label:"Slice / Whole",
    one_line:"A finite unit of consciousness is a slice of the same larger whole.",
    synthesis:"Chay's personal model: one finite perspective is a slice of the ocean without becoming separate from the ocean.",
    quotes:["I am the universe. I am the Brahma. I am a slice of that entire ocean."],
    connections:[...new Set([...(node.connections || []).filter(id => id !== "love"), "four-mahavakyas"])]
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
  nodes:[...nodes, mahavakyaParent, ...mahavakyaChildren, ...adhdChildren]
};

fs.mkdirSync(path.dirname(target), { recursive:true });
fs.writeFileSync(target, `${JSON.stringify(publicCorpus, null, 2)}\n`, "utf8");
console.log(`wrote ${path.relative(path.join(__dirname, ".."), target)} (${publicCorpus.nodes.length} public-safe records)`);
