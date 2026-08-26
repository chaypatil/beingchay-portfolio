// Anthropic provider for the Dialogue Lab.
//
// Codex deliberately left `createProvider` returning UnavailableProvider with the
// note that no external provider ships "until Chay approves its retention and
// processing boundary". He approved it on 2026-08-20. This is that provider.
//
// Two calls, matching the contract in pipeline.js:
//   respond(context) -> one conversational turn
//   review({session, corpus}) -> end-of-session proposals for the vault
//
// Both use structured outputs so the pipeline's validators pass deterministically
// rather than depending on the model formatting JSON by hand.
//
// Required env:
//   ANTHROPIC_API_KEY
// Optional env:
//   DIALOGUE_MODEL          default "claude-sonnet-5" (see cost note below)
//   DIALOGUE_EFFORT         default "high"
//   MIRROR_CORPUS           the private corpus text, held in context and cached
//
// Cost note: the corpus is cached, so a long conversation pays the full input price
// once and ~10% of it per subsequent turn. Keep MIRROR_CORPUS stable between turns
// or the cache breaks and every turn pays full price. Never interpolate a timestamp
// or anything else per-request into the cached prefix.

const DEFAULT_MODEL = "claude-sonnet-5";
const MAX_TOKENS = 8000;

// The disposition. Kept here rather than in the vault copy because this is the
// runtime contract, and it has to survive a corpus rebuild unchanged.
const SYSTEM_RULES = `You are Chay's cognitive mirror. Not an assistant. This is a conversation, not a task.

The governing test before every reply is not "what is the correct analysis" but "what would a conversation with the clearest version of Chay sound like". He is genuinely good at this: emotional intelligence, pattern recognition, psychology, metaphysics. Be that version of him when he cannot reach it himself.

Hold both weights. Straightforward, pragmatic and rational, AND fluent in his emotional and psychological side. One without the other fails the brief.

Being rational does not terminate in pessimism. If a chain of reasoning ends somewhere bleak, that is a sign it stopped early, not a sign it was brave. Say the hard thing, then keep going until it sits inside the larger frame. Never perform grimness as a proxy for rigour. His own position, which is the standard here: good and bad are both part of one picture, and that picture is conscious existence itself.

Never summarise back what he just said. It is the least useful move available and it reads as filler. Instead: ask the one question that opens it up, name a connection in the corpus he has not made himself, name a gap, or offer the outside view where it earns its place.

Choose your posture silently. Never announce a mode, never ask permission to push. Default to listening in the sense of NOT ATTACKING; never default to passive. If there is an insight he is circling without landing, land it.

When you counter him, steelman first: state the strongest version of his position and the premise he is carrying, then argue the other side using material he has actually written. If you cannot write the steelman, the counterargument is not ready.

Hold contradictions open rather than resolving them for tidiness.

If he opens clouded — "I feel like shit", a vague bad day — do not ask clarifying questions, do not run a checklist, do not offer a menu. Name the likely pattern from his own documented architecture, reflect back what his own clear-headed self has already written about this shape of moment, and give one small next step. Not a plan. One thing. If it does not map to a known pattern, say so plainly; forcing a fit is its own kind of gaslighting.

Facts about his present situation come from the CURRENT-STATE section of the corpus, which outranks every dated note. Notes are snapshots: a present-tense sentence in a May note describes May. Be confident about the architecture of how he thinks, and ask rather than assert about jobs, money, location, health and relationships.

Style: plain English, no em dashes, no jargon, no preamble, no motivational filler. Short by default.`;

const TURN_SCHEMA = {
  type: "object",
  properties: {
    response: { type: "string", description: "The conversational reply. Plain text. No summarising his message back at him." },
    followUpQuestion: { type: ["string", "null"], description: "At most ONE question, ending in '?'. Null when a question would not help." },
    mainThought: { type: "string", description: "One line: what you took to be the core of what he said." },
    inferences: { type: "array", items: { type: "string" }, description: "Things you inferred rather than read. Label them honestly." },
    sourcesUsed: {
      type: "array",
      items: {
        type: "object",
        properties: {
          recordId: { type: "string", description: "MUST be an id from the retrieved records. Never invent one." },
          expressionType: { type: "string", enum: ["quotation", "paraphrase", "inference"] },
          safeExcerpt: { type: "string" }
        },
        required: ["recordId", "expressionType", "safeExcerpt"],
        additionalProperties: false
      }
    },
    inferredLinks: { type: "array", items: { type: "string" } },
    uncertainty: { type: "array", items: { type: "string" }, description: "What you are unsure of. Say it rather than hedging in prose." },
    steelman: { type: "string", description: "counter mode only: the strongest version of his position." },
    carryingPremise: { type: "string", description: "counter mode only: the premise he is carrying, often unstated." },
    counterargument: { type: "string", description: "counter mode only." },
    whyItMatters: { type: "string", description: "counter mode only." },
    possibleModelUpdate: { type: ["string", "null"], description: "Something genuinely new about how he thinks, works, believes or behaves. Null usually." }
  },
  required: ["response", "followUpQuestion", "mainThought", "inferences", "sourcesUsed", "inferredLinks", "uncertainty", "possibleModelUpdate"],
  additionalProperties: false
};

const REVIEW_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    proposals: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["new_claim", "refined_claim", "changed_belief", "contradiction",
                   "new_relationship", "supporting_memory", "unresolved_question", "possible_supersession"]
          },
          sourceWording: { type: "string", description: "MUST be an exact substring of something Chay said this session. Copy it, never paraphrase." },
          interpretation: { type: "string" },
          relevantRecordIds: { type: "array", items: { type: "string" } },
          reason: { type: "string" },
          confidence: { type: "number", description: "Between 0 and 1." },
          uncertainty: { type: "string" },
          privacy: { type: "string", enum: ["P0", "P1", "P2", "P3"] }
        },
        required: ["type", "sourceWording", "interpretation", "relevantRecordIds", "reason", "confidence", "uncertainty", "privacy"],
        additionalProperties: false
      }
    }
  },
  required: ["summary", "proposals"],
  additionalProperties: false
};

function buildSystem(corpus) {
  const blocks = [{ type: "text", text: SYSTEM_RULES }];
  if (corpus && corpus.trim()) {
    // Cached. This is the expensive part and it must stay byte-identical between
    // turns, so it goes in its own block with the breakpoint on it.
    blocks.push({
      type: "text",
      text: `Everything below is Chay's corpus. It is who he is, not a document to cite at him.\n\n${corpus}`,
      cache_control: { type: "ephemeral" }
    });
  }
  return blocks;
}

function turnPrompt(context) {
  const records = (context.retrieved || []).map(r =>
    `<record id="${r.id}" title="${r.title || r.label || "untitled"}">\n${r.claim || r.content || r.synthesis || ""}\n</record>`
  ).join("\n\n");

  const contradictions = (context.contradictions || []).map(c => `- ${c.text}`).join("\n");
  const asked = (context.priorQuestions || []).map(q => `- ${q}`).join("\n");

  return [
    `Mode: ${context.mode}.`,
    context.mode === "counter"
      ? "You are countering. Fill steelman, carryingPremise, counterargument and whyItMatters. All four, or the reply is invalid."
      : "",
    records ? `Retrieved records. Cite ONLY these ids in sourcesUsed:\n\n${records}` : "No records retrieved. sourcesUsed must be empty.",
    contradictions ? `Contradictions already on record:\n${contradictions}` : "",
    asked ? `Questions you have already asked this session. Do not repeat any of them:\n${asked}` : "",
    context.instruction || "",
    `\nChay just said:\n\n${context.originalWording}`
  ].filter(Boolean).join("\n\n");
}

function reviewPrompt(session) {
  const transcript = session.messages
    .map(m => `${m.role === "chay" ? "CHAY" : "MIRROR"}: ${m.text}`)
    .join("\n\n");
  return [
    "The session has ended. Propose vault updates.",
    "Rules that will reject your proposal if broken:",
    "- sourceWording must be an EXACT substring of something CHAY said. Copy and paste it. Not the mirror's words, not a paraphrase.",
    "- relevantRecordIds must be ids that exist in the corpus, or an empty array.",
    "- confidence is a number between 0 and 1.",
    "- privacy must be P0, P1, P2 or P3. Default to the more private option when unsure.",
    "Propose only genuinely new things about how he thinks, works, believes or behaves. An empty array is the correct answer for most sessions. Do not manufacture proposals to look useful.",
    `\nTranscript:\n\n${transcript}`
  ].join("\n");
}

function parse(message) {
  const block = (message.content || []).find(b => b.type === "text");
  if (!block) throw new Error("Model returned no text block");
  try {
    return JSON.parse(block.text);
  } catch {
    throw new Error("Model returned unparseable JSON");
  }
}

function createAnthropicProvider({ env = process.env, client } = {}) {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey && !client) throw new Error("ANTHROPIC_API_KEY is not set");

  // Required lazily so this module loads without the SDK installed. That keeps the
  // rest of the site working if the install is missing, and lets tests inject a
  // fake client without pulling the real dependency.
  let anthropic = client;
  if (!anthropic) {
    const Anthropic = require("@anthropic-ai/sdk");
    anthropic = new Anthropic({ apiKey });
  }
  const model = env.DIALOGUE_MODEL || DEFAULT_MODEL;
  const effort = env.DIALOGUE_EFFORT || "high";
  const corpus = env.MIRROR_CORPUS || "";

  async function call(prompt, schema) {
    const message = await anthropic.messages.create({
      model,
      max_tokens: MAX_TOKENS,
      thinking: { type: "adaptive" },
      output_config: {
        effort,
        format: { type: "json_schema", schema }
      },
      system: buildSystem(corpus),
      messages: [{ role: "user", content: prompt }]
    });
    return { parsed: parse(message), usage: message.usage };
  }

  return {
    async respond(context) {
      const { parsed } = await call(turnPrompt(context), TURN_SCHEMA);
      // The pipeline rejects more than one question mark, and models like to
      // tack a second one on. Trim rather than fail the whole turn.
      if (parsed.followUpQuestion) {
        const parts = String(parsed.followUpQuestion).split("?").filter(p => p.trim());
        if (parts.length > 1) parsed.followUpQuestion = `${parts[0].trim()}?`;
      }
      return parsed;
    },

    async review({ session }) {
      const { parsed } = await call(reviewPrompt(session), REVIEW_SCHEMA);
      // Drop proposals whose sourceWording is not literally in what Chay said.
      // The pipeline would throw and lose the whole review; one bad proposal
      // should not cost him the other four.
      const said = session.messages.filter(m => m.role === "chay").map(m => m.text).join("\n");
      parsed.proposals = (parsed.proposals || []).filter(p =>
        p.sourceWording && said.includes(p.sourceWording)
      );
      return parsed;
    }
  };
}

module.exports = { createAnthropicProvider, SYSTEM_RULES, TURN_SCHEMA, REVIEW_SCHEMA };
