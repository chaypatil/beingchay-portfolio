const { findContradictions, retrieveApprovedRecords } = require("./retrieval");

const MODES = new Set(["listen", "interrogate", "counter", "synthesize"]);
const PROPOSAL_ACTIONS = new Set(["accept", "edit", "reject", "supersede"]);
const UPDATE_TYPES = new Set([
  "new_claim", "refined_claim", "changed_belief", "contradiction", "new_relationship",
  "supporting_memory", "unresolved_question", "possible_supersession"
]);

class DialogueValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "DialogueValidationError";
    this.code = "DIALOGUE_VALIDATION_ERROR";
  }
}

function cleanMode(mode) {
  return MODES.has(mode) ? mode : "listen";
}

function primaryQuestionCount(value) {
  return (String(value || "").match(/\?/g) || []).length;
}

function validateProviderTurn(result, retrievedIds, mode) {
  if (!result || typeof result.response !== "string" || !result.response.trim()) {
    throw new DialogueValidationError("Provider returned no conversational response");
  }
  if (primaryQuestionCount(result.followUpQuestion) > 1) {
    throw new DialogueValidationError("Provider returned more than one primary follow-up question");
  }
  if (result.followUpQuestion && !String(result.followUpQuestion).trim().endsWith("?")) {
    throw new DialogueValidationError("Follow-up must be a question");
  }
  if (mode === "counter") {
    for (const field of ["steelman", "carryingPremise", "counterargument", "whyItMatters"]) {
      if (!String(result[field] || "").trim()) throw new DialogueValidationError(`Counter response is missing ${field}`);
    }
  }
  const allowed = new Set(retrievedIds);
  for (const source of result.sourcesUsed || []) {
    if (!allowed.has(source.recordId)) throw new DialogueValidationError("Provider cited an unretrieved source");
    if (!source.expressionType || !["quotation", "paraphrase", "inference"].includes(source.expressionType)) {
      throw new DialogueValidationError("Source use must distinguish quotation, paraphrase and inference");
    }
  }
  return result;
}

function visibleEvidence(result, records, contradictions) {
  const byId = new Map(records.map(record => [record.id, record]));
  return {
    relevantPastMaterial:(result.sourcesUsed || []).map(source => ({
      recordId:source.recordId,
      title:byId.get(source.recordId)?.title || "Untitled record",
      expressionType:source.expressionType,
      excerpt:source.safeExcerpt || ""
    })),
    exactSources:[...new Set((result.sourcesUsed || []).map(source => source.recordId))],
    inferredLinks:result.inferredLinks || [],
    contradictions,
    uncertainty:result.uncertainty || [],
    possibleModelUpdate:result.possibleModelUpdate || null
  };
}

function proposalFromCandidate(candidate, session, index, allowedRecordIds) {
  if (!UPDATE_TYPES.has(candidate.type)) throw new DialogueValidationError("Unknown proposal type");
  const sourceWording = String(candidate.sourceWording || "").trim();
  const sourceExists = session.messages.some(message => message.role === "chay" && message.text.includes(sourceWording));
  if (!sourceWording || !sourceExists) throw new DialogueValidationError("Proposal source wording is not present in Chay's conversation");
  if ((candidate.relevantRecordIds || []).some(id => !allowedRecordIds.has(id))) {
    throw new DialogueValidationError("Proposal references an unknown source record");
  }
  if (!Number.isFinite(candidate.confidence) || candidate.confidence < 0 || candidate.confidence > 1) {
    throw new DialogueValidationError("Proposal confidence must be between zero and one");
  }
  if (!["P0", "P1", "P2", "P3"].includes(candidate.privacy)) {
    throw new DialogueValidationError("Proposal privacy must be explicit");
  }
  return {
    id:`${session.id}-proposal-${session.proposals.length + index + 1}`,
    type:candidate.type,
    sourceWording,
    interpretation:candidate.interpretation,
    relevantRecordIds:candidate.relevantRecordIds || [],
    reason:candidate.reason,
    confidence:candidate.confidence,
    uncertainty:candidate.uncertainty || "",
    privacy:candidate.privacy,
    status:"proposed",
    editedInterpretation:null,
    supersedesId:null,
    decisionAt:null
  };
}

function createDialogueLab({ provider, store, corpus = [], clock = () => new Date() }) {
  async function requireSession(id) {
    const session = await store.get(id);
    if (!session) throw new DialogueValidationError("Unknown private session");
    return session;
  }

  return {
    async start({ mode = "listen" } = {}) {
      return store.create({ mode:cleanMode(mode) });
    },

    async turn({ sessionId, text, mode }) {
      const originalWording = String(text || "").trim();
      if (!originalWording || originalWording.length > 12000) throw new DialogueValidationError("Message is empty or too long");
      const session = await requireSession(sessionId);
      if (session.endedAt) throw new DialogueValidationError("Session has ended");
      session.mode = cleanMode(mode || session.mode);
      const retrieved = retrieveApprovedRecords(originalWording, corpus);
      const contradictions = findContradictions(retrieved);
      const context = {
        mode:session.mode,
        originalWording,
        history:session.messages.map(message => ({ role:message.role, text:message.text })),
        priorQuestions:[...session.askedQuestions],
        retrieved,
        contradictions,
        instruction:"Preserve ambiguity. Separate Chay's wording from inference. Ask at most one useful question."
      };
      const result = validateProviderTurn(await provider.respond(context), retrieved.map(record => record.id), session.mode);
      if (result.followUpQuestion && session.askedQuestions.includes(result.followUpQuestion)) {
        throw new DialogueValidationError("Provider repeated a previous question");
      }
      const now = clock().toISOString();
      session.messages.push({ role:"chay", text:originalWording, createdAt:now });
      session.messages.push({ role:"mirror", text:result.response, followUpQuestion:result.followUpQuestion || null, createdAt:now });
      if (result.followUpQuestion) session.askedQuestions.push(result.followUpQuestion);
      session.observations.push({
        turn:session.messages.length / 2,
        mainThought:result.mainThought || "",
        inferences:result.inferences || [],
        retrievedIds:retrieved.map(record => record.id),
        contradictionCount:contradictions.length,
        possibleModelUpdate:result.possibleModelUpdate || null
      });
      await store.save(session);
      return {
        sessionId:session.id,
        response:result.response,
        followUpQuestion:result.followUpQuestion || null,
        evidence:visibleEvidence(result, retrieved, contradictions)
      };
    },

    async end({ sessionId }) {
      const session = await requireSession(sessionId);
      const result = await provider.review({ session, corpus });
      const candidates = result?.proposals || [];
      const allowedRecordIds = new Set(corpus.map(record => record.id));
      const proposals = candidates.map((candidate, index) => proposalFromCandidate(candidate, session, index, allowedRecordIds));
      session.proposals.push(...proposals);
      session.endedAt = clock().toISOString();
      await store.save(session);
      return { sessionId:session.id, summary:result?.summary || "", proposals };
    },

    async decide({ sessionId, proposalId, action, editedInterpretation, supersedesId }) {
      if (!PROPOSAL_ACTIONS.has(action)) throw new DialogueValidationError("Unknown proposal action");
      const session = await requireSession(sessionId);
      const proposal = session.proposals.find(item => item.id === proposalId);
      if (!proposal || proposal.status !== "proposed") throw new DialogueValidationError("Proposal is not awaiting review");
      if (action === "edit" && !String(editedInterpretation || "").trim()) throw new DialogueValidationError("Edited interpretation is required");
      if (action === "supersede" && !String(supersedesId || "").trim()) throw new DialogueValidationError("Superseded claim ID is required");
      proposal.status = action === "edit" ? "accepted_edited" : action === "supersede" ? "accepted_supersession" : action;
      proposal.editedInterpretation = action === "edit" ? String(editedInterpretation).trim() : null;
      proposal.supersedesId = action === "supersede" ? String(supersedesId).trim() : null;
      proposal.decisionAt = clock().toISOString();
      await store.save(session);
      return { proposal };
    },

    async exportPrivateSource({ sessionId }) {
      const session = await requireSession(sessionId);
      const lines = [`# Dialogue Lab session ${session.createdAt.slice(0, 10)}`, "", `Privacy: P3`, `Session: ${session.id}`, ""];
      for (const message of session.messages) {
        lines.push(`## ${message.role === "chay" ? "Chay" : "Mirror"}`, "", message.text, "");
        if (message.followUpQuestion) lines.push(`Question: ${message.followUpQuestion}`, "");
      }
      lines.push("## Review proposals", "");
      for (const proposal of session.proposals) {
        lines.push(`- ${proposal.type} [${proposal.status}]: ${proposal.interpretation}`);
      }
      return { filename:`dialogue-${session.createdAt.slice(0, 10)}.md`, content:lines.join("\n") };
    }
  };
}

module.exports = { DialogueValidationError, MODES, createDialogueLab, primaryQuestionCount };
