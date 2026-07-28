import assert from "node:assert/strict";
import fs from "node:fs";
import { publicNodes, publicEdges } from "../consciousness/graph-data.js";
import { NODE_REGION } from "../consciousness/brain/brain-mapping.js";
import {
  assertApprovalTransition,
  assertExternalContextSeparation,
  assertImmutableRevisions,
  canEnterPublicOutput,
  effectivePrivacy
} from "./lib/semantic-policy.mjs";

const readJson = relative => JSON.parse(fs.readFileSync(new URL(relative, import.meta.url), "utf8"));
const model = readJson("../consciousness/semantic/semantic-model.json");
const schema = readJson("../consciousness/semantic/semantic-schema.json");
const vault = readJson("../consciousness/vault/public-vault-index.json");
const corpus = readJson("../consciousness/sources/public-vault.json");
const contamination = readJson("./fixtures/tathagatagarbha-contamination.json");

const graphPublic = publicNodes.filter(node => !node.id.startsWith("locked-"));
const placeholders = publicNodes.filter(node => node.id.startsWith("locked-"));
assert.equal(vault.meta.records, 111, "The canonical public-vault inventory must reconcile to 111 records.");
assert.equal(vault.records.length, 111);
assert.equal(publicNodes.length, 57, "The visual graph must contain 57 records.");
assert.equal(graphPublic.length, 49, "The visual graph must contain 49 public nodes.");
assert.equal(placeholders.length, 8, "The visual graph must contain 8 non-semantic privacy placeholders.");
assert.equal(model.auditLedger.length, 49, "Every public node needs exactly one audit verdict.");
assert.equal(model.nodes.length, 49, "Every public node needs a semantic node record.");
assert.equal(new Set(model.auditLedger.map(entry => entry.nodeId)).size, 49);
assert.deepEqual(
  [...new Set(model.auditLedger.map(entry => entry.nodeId))].sort(),
  graphPublic.map(node => node.id).sort(),
  "Semantic audit and public graph must account for the same IDs."
);
assert.equal(Object.keys(NODE_REGION).length, 49, "Brain mappings must remain compatible.");
assert.deepEqual(Object.keys(NODE_REGION).sort(), graphPublic.map(node => node.id).sort());
assert.equal(corpus.nodes.length, 37, "The retrieval corpus contract must remain compatible.");
assert.equal(publicEdges.length, 102, "The Library edge contract must remain compatible.");

const expressionTypes = new Set(["direct_quote", "faithful_paraphrase", "synthesis", "inference"]);
const epistemicTypes = new Set(["memory", "belief", "value", "preference", "interpretation", "hypothesis", "plan", "external_factual_claim"]);
const statuses = new Set(["documented", "supported", "tentative", "disputed", "superseded", "unknown"]);
const approvals = new Set(["proposed", "approved", "rejected", "superseded"]);
const privacy = new Set(["P0", "P1", "P2", "P3"]);
assert.equal(schema.$defs.ExpressionType.enum.length, expressionTypes.size);
assert.equal(schema.$defs.EpistemicType.enum.length, epistemicTypes.size);
assert.equal(schema.$defs.ClaimStatus.enum.length, statuses.size);
assert.equal(schema.$defs.ApprovalValue.enum.length, approvals.size);
assert.equal(schema.$defs.PrivacyClass.enum.length, privacy.size);
for (const claim of model.claims) {
  assert(expressionTypes.has(claim.expressionType), `Bad expression type on ${claim.id}`);
  assert(epistemicTypes.has(claim.epistemicType), `Bad epistemic type on ${claim.id}`);
  assert(statuses.has(claim.status), `Bad status on ${claim.id}`);
  assert(approvals.has(claim.approvalState), `Bad approval on ${claim.id}`);
  assert(privacy.has(claim.privacy), `Bad privacy on ${claim.id}`);
  assert(Number.isFinite(claim.confidence) && Number.isFinite(claim.importance));
}

const evidenceById = new Map(model.evidenceSpans.map(span => [span.id, span]));
const approvalBySubject = new Map(model.approvalEvents.map(event => [event.subjectId, event]));
for (const claim of model.claims.filter(claim => claim.approvalState === "approved")) {
  const event = approvalBySubject.get(claim.id);
  assertApprovalTransition({
    previous:"proposed",
    next:"approved",
    event,
    claim,
    evidenceSpans:claim.evidenceSpanIds.map(id => evidenceById.get(id)).filter(Boolean)
  });
}
assert.throws(
  () => assertApprovalTransition(contamination),
  /explicit Chay approval|without evidence/,
  "An unsupported agent-introduced philosophical term must never become canonical automatically."
);
assert(!model.claims.some(claim => /tath[aā]gatagarbha/i.test(claim.text)), "The contaminated term must not survive the canonical model.");

for (const node of model.nodes) {
  assertExternalContextSeparation({ node, claims:model.claims, externalContexts:model.externalContexts });
}
assertImmutableRevisions(model.revisions);
assert.equal(effectivePrivacy(["P0", "P2", "P1"]), "P2", "Privacy inheritance must choose the most restrictive class.");
assert.equal(effectivePrivacy([]), "P3", "Missing privacy inputs must fail closed.");

const externalChildIds = new Set(["mahavakya-prajnanam", "mahavakya-tat-tvam", "mahavakya-ayam-atma"]);
for (const id of externalChildIds) {
  const node = model.nodes.find(candidate => candidate.id === id);
  assert.equal(node.claimIds.length, 0, `${id} must not be represented as a personal claim.`);
  assert.equal(node.externalContextIds.length, 1, `${id} must remain explicit external context.`);
}
const ahamAudit = model.auditLedger.find(entry => entry.nodeId === "aham-brahmasmi");
assert.equal(ahamAudit.verdict, "split");
assert.match(ahamAudit.actualSourceClaim, /explicitly invokes Aham Brahmāsmi/);
assert(model.reviewQueue.some(item => item.id === "review-aham-semantic-split"));

for (const claim of model.claims) {
  const event = approvalBySubject.get(claim.id);
  const publishable = canEnterPublicOutput({
    claim,
    evidenceSpans:model.evidenceSpans,
    approvalEvent:event,
    externalContexts:model.externalContexts
  });
  if (claim.privacy !== "P0" || claim.approvalState !== "approved") {
    assert.equal(publishable, false, `${claim.id} must fail closed.`);
  }
}

const historicalTen = model.auditLedger.filter(entry => entry.auditOrigin === "completed-ten-node-audit-reconciled");
assert.equal(historicalTen.length, 10);
assert.deepEqual(
  historicalTen.reduce((counts, entry) => (counts[entry.historicalVerdict] = (counts[entry.historicalVerdict] || 0) + 1, counts), {}),
  { rewrite:6, tighten:2, keep:2 },
  "The completed ten-node audit must retain its original verdicts."
);
assert.deepEqual(
  historicalTen.reduce((counts, entry) => (counts[entry.verdict] = (counts[entry.verdict] || 0) + 1, counts), {}),
  { rewrite:5, tighten:2, keep:2, split:1 },
  "The reconciled verdicts must elevate Aham Brahmāsmi to the pending split without rewriting history."
);

console.log("semantic integrity checks passed");
