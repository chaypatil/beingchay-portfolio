// Builds a public, redacted reading layer from the canonical Chay OS vault.
// It never copies the private reference, private person pages, employer memory,
// clinical profiles, raw exports, or third-party transcript archives.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const VAULT = path.join(os.homedir(), "OneDrive", "Documents", "Chay OS", "vault");
const TARGET = path.join(process.cwd(), "consciousness", "vault", "public-vault-index.json");
const PUBLIC_PEOPLE = new Set([
  "Alexander the Great",
  "Harvey Specter",
  "Kanye West",
  "Klangkuenstler"
]);
const PUBLIC_PROJECT_TERMS = new Set(["anrxyst", "fallout", "cloud consciousness", "c2x"]);
const EMPLOYER_TERMS = [
  "everis", "prosp", "peoplebox", "settos", "intercom", "rob rawson"
];
const HIGH_RISK_LINE = /\b(rape|raped|assault|sexual|sex|hook[\s-]?up|ecstasy|acid trip|drug|weed|psychosis|jail|prison|diagnos|medicat|suicid|self-harm|clinical|salary|payroll|employer|client internals?|probation|job|meeting|manager|colleagues?|coworkers?|customers?|startup|revenue|trial|onboarding|linkedin|campaign|setter|deadline|asana|notion|company internals?|product roadmap)\b|[$₹]\s?\d/i;
const RESTRICTED_PATH = /(^|\/)(chatgpt-export|claude-export|\.claude|\.obsidian)(\/|$)|\/frameworks\/_raw\/|consciousness-private-vault\.md$/i;
const PRIVATE_SECTION_PATH = /\/cognitive-mirror\//i;
const PRIVATE_NOTE_PATH = /$a/;

const NODE_ALIASES = new Map(Object.entries({
  "pothos":"pothos",
  "glory":"glory",
  "manifestation":"manifestation",
  "synchronicity":"synchronicity",
  "singularity":"singularity",
  "schranz":"schranz",
  "suits":"harvey-specter",
  "harvey-specter":"harvey-specter",
  "kanye-west":"kanye",
  "klangkuenstler":"klangkuenstler",
  "information-asymmetry":"information-gap",
  "hermetic-philosophy":"hermetic-philosophy",
  "cloud-consciousness":"cloud-consciousness",
  "fallout":"fallout",
  "rejection-sensitive-dysphoria":"adhd",
  "274":"non-arrival",
  "aham-brahmasmi":"aham-brahmasmi",
  "multi-dimensional-self":"multidimensional-self",
  "multidimensional-self":"multidimensional-self",
  "god-as-ethos":"god-as-ethos",
  "information-theory-of-life":"information-theory-of-life",
  "emergence-vs-entropy":"emergence-entropy",
  "aristocrat-philosophy":"aristocrat-philosophy",
  "purple":"purple",
  "sound":"sound",
  "solitude":"solitude",
  "massive-action":"massive-action",
  "anrxyst-content-engine":"anrxyst",
  "cognitive-mirror":"consciousness",
  "brain-vault":"consciousness",
  "love":"love"
}));
const CLUSTER_NODE_IDS = {
  Self:"cluster-self",
  Work:"cluster-work",
  Creative:"cluster-creative",
  Knowledge:"cluster-knowledge",
  Systems:"cluster-systems"
};

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes:true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return entry.isFile() && entry.name.toLowerCase().endsWith(".md") ? [fullPath] : [];
  });
}

function slash(value) {
  return value.split(path.sep).join("/");
}

function slug(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function shortHash(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function frontmatterValue(markdown, key) {
  const match = markdown.match(new RegExp(`^${key}:\\s*(.+)$`, "mi"));
  return match?.[1]?.trim().replace(/^["']|["']$/g, "") || "";
}

function titleFrom(markdown, fallback) {
  return frontmatterValue(markdown, "title") || markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || fallback;
}

const allFiles = walk(VAULT).sort((a, b) => a.localeCompare(b));
const peopleDirectory = path.join(VAULT, "entities", "people");
const privatePersonFiles = fs.existsSync(peopleDirectory)
  ? fs.readdirSync(peopleDirectory).filter(name => name.endsWith(".md") && !PUBLIC_PEOPLE.has(path.basename(name, ".md"))).sort()
  : [];
const privatePersonByFile = new Map(privatePersonFiles.map((name, index) => [name, `private-person-${String(index + 1).padStart(2, "0")}`]));
const privateTerms = new Set();

for (const fileName of privatePersonFiles) {
  const base = path.basename(fileName, ".md");
  privateTerms.add(base);
  const raw = fs.readFileSync(path.join(peopleDirectory, fileName), "utf8");
  const title = titleFrom(raw, base).replace(/\s*\([^)]*\)\s*/g, " ").trim();
  if (title.length > 3) privateTerms.add(title);
  for (const token of title.split(/\s+/)) {
    if (token.length > 4 && !/^(first|love|school)$/i.test(token)) privateTerms.add(token);
  }
}

function replacePrivateTerms(value) {
  let output = value;
  const terms = [...privateTerms, ...EMPLOYER_TERMS].sort((a, b) => b.length - a.length);
  for (const term of terms) {
    if (PUBLIC_PROJECT_TERMS.has(term.toLowerCase())) continue;
    output = output.replace(new RegExp(`(?<![a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9])`, "gi"), "████████");
  }
  return output;
}

function sanitizeMarkdown(markdown) {
  let redactions = 0;
  const content = markdown.split(/\r?\n/).map(line => {
    if (HIGH_RISK_LINE.test(line)) {
      redactions += 1;
      return line.trim() ? "████████  [PRIVATE DETAIL REDACTED]" : "";
    }
    const replaced = replacePrivateTerms(line);
    if (replaced !== line) redactions += 1;
    return replaced;
  }).join("\n");
  return { content, redactions };
}

function publicPath(relativePath, privatePersonId) {
  if (privatePersonId) return `entities/people/${privatePersonId}.md`;
  if (relativePath.startsWith("sessions/")) {
    const match = path.basename(relativePath).match(/^(\d{4}-\d{2}-\d{2})-(\d{2})/);
    return `sessions/${match ? `${match[1]}-${match[2]}` : slug(relativePath)}.md`;
  }
  if (PRIVATE_SECTION_PATH.test(`/${relativePath}`)) {
    const section = relativePath.includes("/memory/") ? "memory" : "profile";
    return `cognitive-mirror/${section}/redacted-${shortHash(relativePath)}.md`;
  }
  return relativePath;
}

function recordType(relativePath) {
  if (relativePath.startsWith("sessions/")) return "session";
  if (relativePath.startsWith("entities/topics/")) return "topic";
  if (relativePath.startsWith("entities/people/")) return "person";
  if (relativePath.includes("/thematic-notes/")) return "thematic";
  if (relativePath.startsWith("frameworks/")) return "framework";
  if (relativePath.startsWith("_meta/")) return "meta";
  return "note";
}

function nodeIdsFor(relativePath, markdown) {
  const candidates = new Set([
    slug(path.basename(relativePath, ".md")),
    ...[...markdown.matchAll(/\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g)].map(match => slug(match[1]))
  ]);
  const ids = new Set();
  for (const candidate of candidates) {
    const mapped = NODE_ALIASES.get(candidate);
    if (mapped) ids.add(mapped);
  }
  if (/2026-05-29-00-monogamy/i.test(relativePath)) {
    ["love", "pothos", "non-arrival", "solitude"].forEach(id => ids.add(id));
  }
  if (/aham brahmasmi|mah[aā]v[aā]kya/i.test(markdown)) ids.add("aham-brahmasmi");
  return [...ids];
}

const records = allFiles.map((filePath, index) => {
  const relativePath = slash(path.relative(VAULT, filePath));
  const privatePersonId = relativePath.startsWith("entities/people/")
    ? privatePersonByFile.get(path.basename(filePath))
    : null;
  const neverRead = /consciousness-private-vault\.md$/i.test(relativePath);
  const raw = neverRead ? "" : fs.readFileSync(filePath, "utf8");
  const fullyRestricted = Boolean(
    privatePersonId ||
    RESTRICTED_PATH.test(relativePath) ||
    PRIVATE_SECTION_PATH.test(`/${relativePath}`) ||
    PRIVATE_NOTE_PATH.test(`/${relativePath}`)
  );
  const sourceForSanitizing = relativePath.startsWith("sessions/")
    ? raw.replace(/^---[\s\S]*?---\s*/m, "---\ntype: session\n---\n")
    : raw;
  const sanitized = fullyRestricted
    ? { content:"████████\n\n[PRIVATE RECORD — STRUCTURE VISIBLE, CONTENT WITHHELD]", redactions:1 }
    : sanitizeMarkdown(sourceForSanitizing);
  const rawTitle = neverRead ? "Private vault reference" : titleFrom(raw, path.basename(filePath, ".md"));
  const rawCluster = neverRead ? "Systems" : frontmatterValue(raw, "cluster");
  const inferredCluster = /\/memory\/project_anrxyst_/i.test(`/${relativePath}`)
    ? "Creative"
    : /\/memory\/project_cloud_/i.test(`/${relativePath}`)
      ? "Systems"
      : /\/memory\/project_|thematic-notes\/04_/i.test(`/${relativePath}`)
        ? "Work"
        : relativePath.startsWith("frameworks/")
          ? "Knowledge"
          : "Systems";
  const safeCluster = CLUSTER_NODE_IDS[rawCluster] ? rawCluster : inferredCluster;
  const safeTitle = privatePersonId
    ? "████████"
    : relativePath.startsWith("sessions/")
      ? `Session — ${path.basename(publicPath(relativePath)).replace(".md", "")}`
      : fullyRestricted
        ? "████████"
        : replacePrivateTerms(rawTitle);
  const safePath = publicPath(relativePath, privatePersonId);
  const linkedNodeIds = fullyRestricted ? [] : nodeIdsFor(relativePath, sanitized.content);
  linkedNodeIds.push(CLUSTER_NODE_IDS[safeCluster]);
  return {
    id:`vault-${String(index + 1).padStart(3, "0")}-${slug(safePath).slice(-42)}`,
    path:safePath,
    title:safeTitle,
    type:recordType(relativePath),
    cluster:safeCluster,
    privacy:fullyRestricted ? "redacted" : sanitized.redactions ? "redacted-extract" : "public",
    redactions:sanitized.redactions,
    nodeIds:[...new Set(linkedNodeIds)],
    content:sanitized.content
  };
});

const serialized = `${JSON.stringify({
  meta:{
    title:"Chay's Brain Vault — public redacted index",
    canonical:"Documents/Chay OS/vault",
    records:records.length,
    public:records.filter(record => record.privacy === "public").length,
    redacted:records.filter(record => record.privacy !== "public").length,
    rule:"Every markdown record is represented. Restricted records remain visible as redacted structure; raw private content never enters the repository."
  },
  records
}, null, 2)}\n`;

for (const term of privateTerms) {
  if (term.length > 3 && serialized.toLowerCase().includes(term.toLowerCase())) {
    throw new Error(`Privacy check failed: a private-person term survived output (${term.length} characters).`);
  }
}
for (const term of EMPLOYER_TERMS) {
  const pattern = new RegExp(`(?<![a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9])`, "i");
  if (pattern.test(serialized)) {
    throw new Error(`Privacy check failed: an employer term survived output (${term.length} characters).`);
  }
}

fs.mkdirSync(path.dirname(TARGET), { recursive:true });
fs.writeFileSync(TARGET, serialized, "utf8");
console.log(`wrote ${path.relative(process.cwd(), TARGET)} (${records.length} records, ${Buffer.byteLength(serialized)} bytes)`);
