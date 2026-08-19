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
assert.equal(publicNodes.length, 55, "The visual graph must contain 55 records.");
assert.equal(graphPublic.length, 47, "The visual graph must contain 47 semantic/index nodes.");
assert.equal(placeholders.length, 8, "The visual graph must contain 8 non-semantic privacy placeholders.");
assert.equal(model.auditLedger.length, 47, "Every semantic/index node needs exactly one audit verdict.");
assert.equal(model.nodes.length, 47, "Every semantic/index node needs a semantic node record.");
assert.equal(new Set(model.auditLedger.map(entry => entry.nodeId)).size, 47);
assert.deepEqual(
  [...new Set(model.auditLedger.map(entry => entry.nodeId))].sort(),
  graphPublic.map(node => node.id).sort(),
  "Semantic audit and public graph must account for the same IDs."
);
assert.equal(Object.keys(NODE_REGION).length, 47, "Brain mappings must remain compatible.");
assert.deepEqual(Object.keys(NODE_REGION).sort(), graphPublic.map(node => node.id).sort());
assert.equal(corpus.nodes.length, 36, "The retrieval corpus must include Mahāvākyas and the redacted Love shell, and must exclude every withheld record.");
assert.equal(publicEdges.length, 93, "The Library edge contract must exclude the withheld ADHD cluster and private Love context.");
assert.equal(model.auditLedger.filter(entry => entry.approvalState === "approved").length, 44);
assert.deepEqual(
  model.auditLedger.filter(entry => entry.approvalState === "proposed").map(entry => entry.nodeId).sort(),
  ["c2x", "love", "sound"],
  "Only the two source blockers and private Love review may remain proposed."
);
assert.equal(model.reviewQueue.length, 2, "Completed Phase 1.5 work must not remain in a review queue.");
assert(!model.reviewQueue.some(item => item.id === "review-remaining-semantic-proposals"));
assert.equal(new Set(model.relations.map(relation => relation.id)).size, model.relations.length);
for (const relation of model.relations) {
  assert.equal(relation.id, `relation-${relation.fromId}--${relation.toId}`, "Relation IDs must survive edge insertions.");
  assert.equal(
    relation.reviewDisposition,
    relation.status === "supported" ? "reviewed_supported" : "reviewed_deliberately_unknown"
  );
}
assert.equal(model.relations.filter(relation => relation.reviewDisposition === "reviewed_deliberately_unknown").length, 37);

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

const mahavakyaIds = new Set(["four-mahavakyas", "mahavakya-prajnanam", "mahavakya-aham", "mahavakya-tat-tvam", "mahavakya-ayam-atma"]);
for (const id of mahavakyaIds) {
  const node = model.nodes.find(candidate => candidate.id === id);
  const claim = model.claims.find(candidate => candidate.id === `claim-${id}`);
  assert.equal(node.claimIds.length, 1, `${id} must remain a distinct personal collection record.`);
  assert.equal(node.externalContextIds.length, 0, `${id} must not fabricate external sourcing.`);
  assert.equal(claim.status, "tentative", `${id} must remain tentative while source citations are pending.`);
  assert.equal(claim.approvalState, "approved", `${id} was explicitly approved as a personal node.`);
}
const ahamAudit = model.auditLedger.find(entry => entry.nodeId === "aham-brahmasmi");
assert.equal(ahamAudit.verdict, "split");
assert.match(ahamAudit.actualSourceClaim, /finite unit of consciousness/);
assert(!model.reviewQueue.some(item => item.id === "review-aham-semantic-split"));
const loveClaim = model.claims.find(claim => claim.id === "claim-love");
const loveEvidence = model.evidenceSpans.find(span => span.id === "evidence-love");
assert.equal(loveClaim.privacy, "P2");
assert.equal(loveEvidence.representation, "private_hash");
assert(!("safeExcerpt" in loveEvidence));

// Withheld on 2026-08-19. These ten child nodes were added on Chay's explicit
// request (audit origin "chay-decision-2026-07-30"). He reversed that decision:
// read together they form a clinical symptom inventory, and a stranger evaluating
// him professionally reads them as a reliability risk. The material is preserved in
// Chay OS. This test now guards the reversal so a future sync cannot quietly
// reintroduce them. To restore any of them, remove the id from withheldNodeIds in
// scripts/sync-public-source-corpus.js and move it back into this file's kept list.
const withheldChildIds = [
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
];
const withheldPatternIds = ["spiral", "movement", "voices"];
const adhdMother = model.nodes.find(node => node.id === "adhd");
assert.equal(adhdMother.graphRole, "thematic_mother", "ADHD must remain an explicit thematic mother.");
for (const id of [...withheldChildIds, ...withheldPatternIds]) {
  assert(!graphPublic.some(node => node.id === id), `${id} must stay out of the Library graph.`);
  assert(!model.nodes.some(node => node.id === id), `${id} must have no semantic node record.`);
  assert(!model.claims.some(claim => claim.id === `claim-${id}`), `${id} must have no claim record.`);
  assert(!model.auditLedger.some(entry => entry.nodeId === id), `${id} must have no audit verdict.`);
  assert(!model.evidenceSpans.some(span => span.id === `evidence-${id}`), `${id} must have no evidence span.`);
  assert(!NODE_REGION[id], `${id} must have no Brain mapping.`);
  assert(!corpus.nodes.some(node => node.id === id), `${id} must be unavailable to Mirror retrieval.`);
  assert(!publicEdges.some(edge => edge[0] === id || edge[1] === id), `${id} must have no public edge.`);
}
// The withheld quotes must not survive anywhere in the shipped semantic model.
const modelText = JSON.stringify(model).toLowerCase();
for (const phrase of ["renders me to sleepy mode", "rejection spike", "rsd", "hype-man", "catastrophiz"]) {
  assert(!modelText.includes(phrase), `Withheld phrase leaked back into the semantic model: ${phrase}`);
}
const adhdChildIds = withheldChildIds;
const publicAdhdArtifacts = JSON.stringify({
  graph:graphPublic.filter(node => node.id === "adhd" || adhdChildIds.includes(node.id)),
  corpus:corpus.nodes.filter(node => node.id === "adhd" || adhdChildIds.includes(node.id))
});
for (const forbidden of ["Dr Amen", "Ashmi", "Somil Savla", "6/6", "medication"]) {
  assert(
    !publicAdhdArtifacts.toLowerCase().includes(forbidden.toLowerCase()),
    `ADHD public output leaked forbidden clinical detail: ${forbidden}`
  );
}

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
