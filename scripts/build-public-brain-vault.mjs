// Builds a public, redacted reading layer from the canonical Chay OS vault.
// It never copies the private reference, private person pages, employer memory,
// clinical profiles, raw exports, or third-party transcript archives.
import crypto from "node:crypto";
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
const PRIVATE_RELATIONSHIP_LINE = /\b(first love|founding wound|how he loves|girlfriend|boyfriend|ex-girlfriend|relationship|romantic|breakup|monogam\w*|dating|attachment style|intimacy)\b/i;
const RESTRICTED_PATH = /(^|\/)(chatgpt-export|claude-export|\.claude|\.obsidian)(\/|$)|(^|\/)frameworks\/_(raw|pipeline)\/|consciousness-private-vault\.md$/i;
const PRIVATE_SECTION_PATH = /\/cognitive-mirror\//i;
const PRIVATE_NOTE_PATH = /$a/;
const PRIVATE_RELATIONSHIP_TITLE = /\b(love|monogam|relationship|romantic|breakup|dating|attachment|274)\b/i;
const PRIVATE_RELATIONSHIP_CONTENT = /\b(girlfriend|boyfriend|ex-girlfriend|relationship|romantic|breakup|monogam\w*|dating|attachment style|intimacy)\b/i;
const REDACTED_DOCUMENT = "[REDACTED_DOCUMENT]";
// Public bodies are allowlisted, never inferred safe merely because a blacklist
// happened not to match them. Everything else fails closed as an opaque record.
const PUBLIC_BODY_APPROVALS = new Map([
  ["entities/topics/Cloud Consciousness.md", "eafd28fa139a8cc413495323a56989a788a07aa1362642b63a6983a927e099e6"],
  ["entities/topics/Hermetic Philosophy.md", "6b47c4781a073a085fa5ed6506e2e5e81c1011f2a6cefca1605cf2059bfb895e"],
  ["entities/topics/Information Asymmetry.md", "b808a07883db03a5da180cdec0c9ae14efe42eca9a651950a114af00345bfa19"],
  ["entities/topics/Singularity.md", "b279bfa56d102022cb4264e04158ce23c03d770f24bb8580894e2e208d7c548a"],
  ["entities/topics/Synchronicity.md", "d810e203800dce54eda249b18b86f63d07dfdd15c60e3d6bbfe60145f2a83781"],
  ["frameworks/CREATOR-FORMAT-FRAMEWORKS.md", "71d87d2b0375540c3a2b1d5cb87d1caf81bf84358bd2a1d174ebab8737b11b26"],
  ["frameworks/emily_mcdonnell.md", "ba9e2be18e7cd7c808ca315e22b709bbe1309038f9a89234a3c8405e1c51fb39"],
  ["frameworks/jett_franzen.md", "bd1c531d7beecae10c7e0d463f51987fd40a085b04437ebe1c40ec130ef8e077"],
  ["frameworks/rawarxchives.md", "ce3d6de394c9230546ffc9d87ef13f07aadb38121dff21f1ac9be6d263313fc4"],
  ["gaps.md", "58d766a51deaf3c1dbfa7c39421bad58062c3d1e9ed231b591fdf485eaecd99f"],
  ["inbox/2026-05-09.md", "36a6aefd62f030bbf1ff5a9b54f7d33ec12e6ce3de62be990189dfa9aa9d9d95"],
  ["London.md", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
  ["README.md", "9c7444a1c235880513fe5010983dc68cc511c5f420fd9fc08630eee659123c81"],
  ["scripts/2026-05-09-001-adhd-scaffolding-dissolving.md", "580e6674023ebf53201c3959a9129eae61efdc015954a38e59b6e4e4d1d61fe5"]
]);

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
  "four-mahavakyas":"four-mahavakyas",
  "mahavakyas":"four-mahavakyas",
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
    if (HIGH_RISK_LINE.test(line) || PRIVATE_RELATIONSHIP_LINE.test(line)) {
      redactions += 1;
      return line.trim() ? "████████  [PRIVATE DETAIL REDACTED]" : "";
    }
    const replaced = replacePrivateTerms(line);
    if (replaced !== line) redactions += 1;
    return replaced;
  }).join("\n");
  return { content, redactions };
}

function publicPath(relativePath, privatePersonId, restricted = false) {
  if (privatePersonId) return `entities/people/${privatePersonId}.md`;
  if (restricted) {
    const section = /^frameworks\/_(raw|pipeline)\//i.test(relativePath)
      ? "frameworks/raw-source"
      : "restricted/source";
    return `${section}/redacted-${shortHash(relativePath)}.md`;
  }
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
  if (/aham brahmasmi/i.test(markdown)) ids.add("aham-brahmasmi");
  if (/mah[aā]v[aā]kya/i.test(markdown)) ids.add("four-mahavakyas");
  return [...ids];
}

const records = allFiles.map((filePath, index) => {
  const relativePath = slash(path.relative(VAULT, filePath));
  const privatePersonId = relativePath.startsWith("entities/people/")
    ? privatePersonByFile.get(path.basename(filePath))
    : null;
  const restrictedPath = RESTRICTED_PATH.test(relativePath);
  const neverRead = restrictedPath || Boolean(privatePersonId);
  const raw = neverRead ? "" : fs.readFileSync(filePath, "utf8");
  const rawTitle = neverRead ? "Private vault reference" : titleFrom(raw, path.basename(filePath, ".md"));
  const privateRelationshipRecord = relativePath.startsWith("sessions/") && (
    PRIVATE_RELATIONSHIP_TITLE.test(`${relativePath} ${rawTitle}`) ||
    PRIVATE_RELATIONSHIP_CONTENT.test(raw)
  );
  const fullyRestricted = Boolean(
    privatePersonId ||
    restrictedPath ||
    PRIVATE_SECTION_PATH.test(`/${relativePath}`) ||
    PRIVATE_NOTE_PATH.test(`/${relativePath}`) ||
    privateRelationshipRecord
  );
  const sourceForSanitizing = relativePath.startsWith("sessions/")
    ? raw.replace(/^---[\s\S]*?---\s*/m, "---\ntype: session\n---\n")
    : raw;
  const sanitizedCandidate = fullyRestricted
    ? { content:"", redactions:1 }
    : sanitizeMarkdown(sourceForSanitizing);
  const sourceHash = crypto.createHash("sha256").update(raw).digest("hex");
  const approvedPublicBody = PUBLIC_BODY_APPROVALS.get(relativePath) === sourceHash && sanitizedCandidate.redactions === 0;
  const withheld = !approvedPublicBody;
  const sanitized = withheld
    ? { content:REDACTED_DOCUMENT, redactions:1 }
    : sanitizedCandidate;
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
  const safeTitle = withheld ? "Private record" : replacePrivateTerms(rawTitle);
  const safePath = withheld
    ? `private/record-${String(index + 1).padStart(3, "0")}.md`
    : publicPath(relativePath, privatePersonId, restrictedPath);
  const linkedNodeIds = withheld ? [] : nodeIdsFor(relativePath, sanitized.content);
  if (!withheld) linkedNodeIds.push(CLUSTER_NODE_IDS[safeCluster]);
  return {
    id:`vault-${String(index + 1).padStart(3, "0")}-${slug(safePath).slice(-42)}`,
    path:safePath,
    title:safeTitle,
    type:withheld ? "private" : recordType(relativePath),
    cluster:withheld ? "Private" : safeCluster,
    privacy:withheld ? "redacted" : "public",
    privacyClass:"P0",
    sourcePrivacyClass:withheld ? "P3" : "P0",
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
    rule:"Every markdown record is represented. Only explicitly allowlisted P0 bodies are readable; all other records are opaque visual placeholders whose raw text, title, path, cluster and relations never enter the repository."
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
