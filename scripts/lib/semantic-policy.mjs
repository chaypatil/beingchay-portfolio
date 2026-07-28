const PRIVACY_RANK = Object.freeze({ P0:0, P1:1, P2:2, P3:3 });

export function effectivePrivacy(classes) {
  if (!classes.length) return "P3";
  return classes.reduce((highest, value) => {
    if (!(value in PRIVACY_RANK)) throw new Error(`Unknown privacy class: ${value}`);
    return PRIVACY_RANK[value] > PRIVACY_RANK[highest] ? value : highest;
  }, "P0");
}

export function assertApprovalTransition({ previous = "proposed", next, event, claim, evidenceSpans = [] }) {
  if (!["proposed", "approved", "rejected", "superseded"].includes(next)) {
    throw new Error(`Invalid approval state: ${next}`);
  }
  if (previous === "rejected" && next === "approved") {
    throw new Error("A rejected claim needs a new immutable revision before approval.");
  }
  if (next !== "approved") return true;
  if (event?.actor !== "chay" || !event?.evidence?.trim()) {
    throw new Error("Only an explicit Chay approval event can approve a semantic claim.");
  }
  if (!claim?.evidenceSpanIds?.length && claim?.epistemicType !== "external_factual_claim") {
    throw new Error("A personal claim cannot be approved without evidence.");
  }
  const available = new Set(evidenceSpans.map(span => span.id));
  for (const id of claim.evidenceSpanIds || []) {
    if (!available.has(id)) throw new Error(`Approval references missing evidence: ${id}`);
  }
  return true;
}

export function canEnterPublicOutput({ claim, evidenceSpans, approvalEvent, externalContexts = [] }) {
  if (claim.privacy !== "P0" || claim.approvalState !== "approved") return false;
  if (approvalEvent?.actor !== "chay") return false;
  const usedEvidence = evidenceSpans.filter(span => claim.evidenceSpanIds.includes(span.id));
  if (usedEvidence.length !== claim.evidenceSpanIds.length) return false;
  if (usedEvidence.some(span => span.privacy !== "P0")) return false;
  if (
    claim.epistemicType !== "external_factual_claim" &&
    (claim.externalContextIds || []).some(id => externalContexts.some(context => context.id === id))
  ) {
    return false;
  }
  return true;
}

export function assertExternalContextSeparation({ node, claims, externalContexts }) {
  const externalIds = new Set(externalContexts.map(context => context.id));
  const claimIds = new Set(claims.map(claim => claim.id));
  for (const id of node.externalContextIds) {
    if (!externalIds.has(id)) throw new Error(`Node ${node.id} references missing external context ${id}`);
    if (claimIds.has(id)) throw new Error(`External context ${id} was collapsed into a personal claim.`);
  }
  return true;
}

export function assertImmutableRevisions(revisions) {
  const ids = new Set();
  for (const revision of revisions) {
    if (ids.has(revision.id)) throw new Error(`Duplicate revision: ${revision.id}`);
    ids.add(revision.id);
    if (revision.immutable !== true) throw new Error(`Revision ${revision.id} is not immutable.`);
  }
  for (const revision of revisions) {
    if (revision.previousRevisionId && !ids.has(revision.previousRevisionId)) {
      throw new Error(`Revision ${revision.id} references a missing predecessor.`);
    }
  }
  return true;
}
