// Exercises the Anthropic provider against the real pipeline validators, using a
// fake client. No API key, no network, no SDK install needed.
//
//   node scripts/test-anthropic-provider.mjs

import assert from "node:assert";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createAnthropicProvider } = require("../lib/dialogue-lab/anthropic-provider.js");
const { createDialogueLab, DialogueValidationError } = require("../lib/dialogue-lab/pipeline.js");

const CORPUS = [
  { id: "solitude-unlock", title: "Solitude", claim: "Best version at roughly 90% solitude.", approvalState: "approved", tags: ["solitude", "focus"] },
  { id: "preparation", title: "Preparation", claim: "Systems create leverage and can postpone the work.", approvalState: "approved", tags: ["preparation", "shipping"] }
];

// Captures what we send, returns what we tell it to.
function fakeClient(reply) {
  const calls = [];
  return {
    calls,
    messages: {
      async create(params) {
        calls.push(params);
        return { content: [{ type: "text", text: JSON.stringify(reply) }], usage: { input_tokens: 10, output_tokens: 5 } };
      }
    }
  };
}

const baseTurn = {
  response: "You are describing the shape of a decision, not a decision.",
  followUpQuestion: "What would have to be true for you to stop preparing?",
  mainThought: "Stuck between planning and shipping.",
  inferences: [],
  sourcesUsed: [{ recordId: "preparation", expressionType: "paraphrase", safeExcerpt: "Systems create leverage." }],
  inferredLinks: [],
  uncertainty: [],
  possibleModelUpdate: null
};

const store = () => {
  const map = new Map();
  let n = 0;
  return {
    async create({ mode }) {
      const s = { id: `s${++n}`, mode, messages: [], askedQuestions: [], observations: [], proposals: [], createdAt: new Date().toISOString(), endedAt: null };
      map.set(s.id, s); return s;
    },
    async get(id) { return map.get(id); },
    async save(s) { map.set(s.id, s); return s; }
  };
};

let passed = 0;
const check = (name, fn) => fn().then(() => { console.log("PASS ", name); passed++; })
  .catch(e => { console.log("FAIL ", name, "\n      ", e.message); process.exitCode = 1; });

await check("a normal turn survives the pipeline validators", async () => {
  const client = fakeClient(baseTurn);
  const lab = createDialogueLab({ provider: createAnthropicProvider({ env: {}, client }), store: store(), corpus: CORPUS });
  const s = await lab.start({ mode: "listen" });
  const out = await lab.turn({ sessionId: s.sessionId || s.id, text: "I keep building systems instead of shipping anything." });
  assert.ok(out.response.length > 0, "no response");
  assert.equal(out.followUpQuestion, baseTurn.followUpQuestion);
  assert.equal(out.evidence.relevantPastMaterial.length, 1, "source not surfaced");
});

await check("the corpus is sent as a cached system block", async () => {
  const client = fakeClient(baseTurn);
  const provider = createAnthropicProvider({ env: { MIRROR_CORPUS: "CORPUS BODY" }, client });
  await provider.respond({ mode: "listen", originalWording: "hi", retrieved: [], contradictions: [], priorQuestions: [] });
  const sys = client.calls[0].system;
  assert.ok(Array.isArray(sys), "system should be blocks, not a string");
  const cached = sys.find(b => b.cache_control);
  assert.ok(cached, "corpus block is not marked for caching, every turn would pay full price");
  assert.ok(cached.text.includes("CORPUS BODY"), "corpus missing from the cached block");
});

await check("a second question mark gets trimmed instead of failing the turn", async () => {
  const client = fakeClient({ ...baseTurn, followUpQuestion: "What is real here? And what is noise?" });
  const provider = createAnthropicProvider({ env: {}, client });
  const out = await provider.respond({ mode: "listen", originalWording: "x", retrieved: [], contradictions: [], priorQuestions: [] });
  assert.equal((out.followUpQuestion.match(/\?/g) || []).length, 1, "should be exactly one question mark");
});

await check("counter mode without a steelman is rejected", async () => {
  const client = fakeClient({ ...baseTurn, steelman: "", carryingPremise: "", counterargument: "", whyItMatters: "" });
  const lab = createDialogueLab({ provider: createAnthropicProvider({ env: {}, client }), store: store(), corpus: CORPUS });
  const s = await lab.start({ mode: "counter" });
  await assert.rejects(
    () => lab.turn({ sessionId: s.id, text: "This idea cannot fail.", mode: "counter" }),
    /missing steelman/i,
    "an unsteelmanned counter should never reach him"
  );
});

await check("a fabricated source id is rejected", async () => {
  const client = fakeClient({ ...baseTurn, sourcesUsed: [{ recordId: "invented-node", expressionType: "quotation", safeExcerpt: "nope" }] });
  const lab = createDialogueLab({ provider: createAnthropicProvider({ env: {}, client }), store: store(), corpus: CORPUS });
  const s = await lab.start({ mode: "listen" });
  await assert.rejects(() => lab.turn({ sessionId: s.id, text: "preparation and solitude" }), /unretrieved source/i);
});

await check("review drops proposals he did not actually say", async () => {
  const client = fakeClient({
    summary: "one real, one hallucinated",
    proposals: [
      { type: "new_claim", sourceWording: "I keep building systems", interpretation: "Real one.", relevantRecordIds: [], reason: "r", confidence: 0.7, uncertainty: "", privacy: "P1" },
      { type: "new_claim", sourceWording: "words he never typed", interpretation: "Fabricated.", relevantRecordIds: [], reason: "r", confidence: 0.9, uncertainty: "", privacy: "P1" }
    ]
  });
  const provider = createAnthropicProvider({ env: {}, client });
  const out = await provider.review({
    session: { messages: [{ role: "chay", text: "I keep building systems instead of shipping." }] }
  });
  assert.equal(out.proposals.length, 1, "the fabricated proposal should have been dropped");
  assert.equal(out.proposals[0].interpretation, "Real one.");
});

await check("model and effort are configurable, and default sanely", async () => {
  const c1 = fakeClient(baseTurn);
  await createAnthropicProvider({ env: {}, client: c1 }).respond({ mode: "listen", originalWording: "x", retrieved: [], contradictions: [], priorQuestions: [] });
  assert.equal(c1.calls[0].model, "claude-sonnet-5");
  assert.equal(c1.calls[0].thinking.type, "adaptive");

  const c2 = fakeClient(baseTurn);
  await createAnthropicProvider({ env: { DIALOGUE_MODEL: "claude-opus-5", DIALOGUE_EFFORT: "max" }, client: c2 })
    .respond({ mode: "listen", originalWording: "x", retrieved: [], contradictions: [], priorQuestions: [] });
  assert.equal(c2.calls[0].model, "claude-opus-5");
  assert.equal(c2.calls[0].output_config.effort, "max");
});

console.log(`\n${passed}/7 passed`);
if (process.exitCode) console.log("SOMETHING FAILED");
