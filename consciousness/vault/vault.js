const vaultEl = document.querySelector("#vault");
const searchEl = document.querySelector("#search");
const filterEl = document.querySelector("#privacy-filter");
const countsEl = document.querySelector("#counts");
const contextEl = document.querySelector("#context");
const requestedNode = new URLSearchParams(location.search).get("node");
let records = [];
let showRedacted = true;

function normalize(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

function render() {
  const query = normalize(searchEl.value.trim());
  const filtered = records.filter(record => {
    if (requestedNode && !record.nodeIds.includes(requestedNode)) return false;
    if (!showRedacted && record.privacy !== "public") return false;
    if (!query) return true;
    return normalize(`${record.title} ${record.path} ${record.type} ${record.cluster} ${record.content}`).includes(query);
  });

  vaultEl.replaceChildren();
  filtered.forEach((record, index) => {
    const details = document.createElement("details");
    details.className = `record${record.privacy === "redacted" ? " is-private" : ""}`;
    const summary = document.createElement("summary");
    const number = document.createElement("span");
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    number.className = "record-index";
    title.className = "record-title";
    meta.className = "record-meta";
    number.textContent = String(index + 1).padStart(3, "0");
    title.textContent = record.title;
    meta.textContent = `${record.type} / ${record.cluster} / ${record.privacy}`;
    summary.append(number, title, meta);
    const body = document.createElement("pre");
    body.className = "record-body";
    body.textContent = record.content;
    details.append(summary, body);
    vaultEl.append(details);
  });

  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No public vault record matches that cut.";
    vaultEl.append(empty);
  }
  countsEl.textContent = `${filtered.length} visible / ${records.length} indexed`;
}

try {
  const response = await fetch("./public-vault-index.json", { cache:"force-cache" });
  if (!response.ok) throw new Error("Vault unavailable");
  const payload = await response.json();
  records = payload.records || [];
  if (requestedNode) {
    contextEl.textContent = `Source shelf for node: ${requestedNode}. This includes direct pages, sessions and backlinks that survived the public redaction boundary.`;
  } else {
    contextEl.textContent = `${payload.meta.records} records indexed from the canonical Chay OS vault. ${payload.meta.redacted} contain redactions or are fully withheld; their place in the notebook remains visible.`;
  }
  render();
} catch {
  contextEl.textContent = "The public vault index could not be loaded.";
}

searchEl.addEventListener("input", render);
filterEl.addEventListener("click", () => {
  showRedacted = !showRedacted;
  filterEl.setAttribute("aria-pressed", String(!showRedacted));
  filterEl.textContent = `show redacted / ${showRedacted ? "on" : "off"}`;
  render();
});
