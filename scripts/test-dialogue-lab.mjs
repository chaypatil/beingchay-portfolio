import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { scryptSync, randomBytes } from "node:crypto";

const require = createRequire(import.meta.url);
const { createDialogueLab, DialogueValidationError, primaryQuestionCount } = require("../lib/dialogue-lab/pipeline");
const { FixtureProvider, ProviderBoundaryError, createProvider } = require("../lib/dialogue-lab/provider-adapter");
const { MemorySessionStore, createSessionStore } = require("../lib/dialogue-lab/session-store");
const { createHandler } = require("../api/dialogue-lab");

const scenarios = JSON.parse(fs.readFileSync(new URL("./fixtures/dialogue-lab-scenarios.json", import.meta.url), "utf8"));
assert.equal(scenarios.length, 12, "Dialogue evaluation must stay in the requested 10-15 scenario range.");

const corpus = [
  {
    id:"preparation-current",
    title:"Preparation",
    claim:"Preparation creates leverage but can replace execution.",
    content:"Systems are useful only when they serve shipped work.",
    tags:["preparation","systems","action","shield","building","finishing","failure"],
    approvalState:"approved",
    contradictions:[{ text:"Preparation can become avoidance when it cannot name the next observable action.", sourceId:"preparation-later", temporalScope:"later refinement" }]
  },
  {
    id:"agency-current",
    title:"Agency",
    claim:"Action is preferred to circular strategizing when uncertainty blocks progress.",
    content:"Choose a workable move that generates evidence.",
    tags:["action","evidence","agency"],
    approvalState:"approved"
  },
  {
    id:"glory-current",
    title:"Glory and influence",
    claim:"Lasting influence matters more than status alone.",
    content:"The unresolved question is what remains valuable without recognition.",
    tags:["ambition","influence","recognition","status"],
    approvalState:"approved"
  },
  {
    id:"urgency-current",
    title:"Urgency focus",
    claim:"Urgency can flip diffuse attention into sharp short-term focus without becoming the ideal way to work.",
    content:"Pressure is a real activation mechanism and also carries a cost.",
    tags:["urgency","focus","work","pressure"],
    approvalState:"approved"
  },
  {
    id:"alexander-decoy",
    title:"Alexander",
    claim:"A historical story is an influence and cautionary anchor.",
    content:"The source mentions ambition but not Chay's current definition of useful influence.",
    tags:["history"],
    approvalState:"approved"
  },
  {
    id:"unapproved-private",
    title:"Private childhood record",
    claim:"This must never be retrieved.",
    content:"Fixture-only sealed content.",
    tags:["childhood","career"],
    approvalState:"proposed"
  }
];

function fixtureResponder(kind, context) {
  if (kind === "review") {
    const sourceWording = context.session.messages.findLast(message => message.role === "chay")?.text || "";
    return {
      summary:"One material refinement is ready for review; nothing has been approved.",
      proposals:[{
        type:"refined_claim",
        sourceWording,
        interpretation:"Preparation becomes avoidance when it cannot name the next observable action.",
        relevantRecordIds:["preparation-current","agency-current"],
        reason:"The session adds a boundary condition to the approved preparation claim.",
        confidence:0.81,
        uncertainty:"One conversation may not establish a stable rule.",
        privacy:"P2"
      }]
    };
  }
  const records = context.retrieved;
  const top = records[0];
  const sourcesUsed = top ? [{ recordId:top.id, expressionType:"paraphrase", safeExcerpt:top.claim }] : [];
  const uncertainty = records.length ? ["The connection is provisional until Chay confirms it."] : ["No approved record supports the autobiographical cause in this question."];
  if (!records.length) {
    return {
      response:"I do not have approved evidence for that causal story, so pretending to remember it would be fan fiction.",
      mainThought:context.originalWording,
      followUpQuestion:"What is the earliest concrete memory you would trust as evidence?",
      sourcesUsed:[], inferredLinks:[], inferences:[], uncertainty
    };
  }
  const modeLead = {
    listen:"The unfinished claim seems to be that",
    interrogate:"The premise doing most of the work is that",
    counter:"The strongest fair version is that",
    synthesize:"A provisional formulation is that"
  }[context.mode];
  const counter = context.mode === "counter"
    ? " The strongest counter is that a mechanism that works under pressure can still be too costly to make into an identity."
    : "";
  const followUpQuestion = context.mode === "counter"
    ? "What evidence would show that urgency is useful without being necessary?"
    : context.priorQuestions.includes("What changes when the system must name the next observable action?")
      ? "Which recent example best tests that boundary?"
      : "What changes when the system must name the next observable action?";
  return {
    response:`${modeLead} ${context.originalWording}.${counter}`,
    mainThought:context.originalWording,
    followUpQuestion,
    sourcesUsed,
    inferredLinks:top ? [{ from:"current thought", to:top.id, why:"shared claim, not mere keyword overlap" }] : [],
    inferences:["The boundary condition is inferred from this turn and is not yet Chay's approved belief."],
    uncertainty,
    possibleModelUpdate:{ type:"refined_claim", interpretation:"A possible boundary condition, pending review." },
    ...(context.mode === "counter" ? {
      steelman:"Urgency reliably activates focus in lived experience.",
      carryingPremise:"A mechanism that works is therefore necessary.",
      counterargument:"Reliable short-term activation can still be too costly to make into an identity.",
      whyItMatters:"Necessity would hide other activation conditions worth testing."
    } : {})
  };
}

const provider = new FixtureProvider(fixtureResponder);
const store = new MemorySessionStore({ clock:() => new Date("2026-08-01T12:00:00.000Z") });
const lab = createDialogueLab({ provider, store, corpus, clock:() => new Date("2026-08-01T12:00:00.000Z") });

const session = await lab.start({ mode:"listen" });
const firstWording = scenarios[0].input;
const first = await lab.turn({ sessionId:session.id, text:firstWording, mode:"listen" });
assert.match(first.response, new RegExp(firstWording.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), "Original ambiguity must survive the response.");
assert.equal(primaryQuestionCount(first.followUpQuestion), 1);
assert(first.evidence.exactSources.includes("preparation-current"));
assert(!first.evidence.exactSources.includes("alexander-decoy"), "Lexical ambition decoys must not outrank the actual concept.");
assert(first.evidence.relevantPastMaterial.every(item => ["quotation","paraphrase","inference"].includes(item.expressionType)));
assert(first.evidence.contradictions.some(item => /avoidance/.test(item.text)), "A genuine historical refinement must surface.");

const ambitionSession = await lab.start({ mode:"listen" });
const ambition = await lab.turn({ sessionId:ambitionSession.id, text:scenarios[2].input, mode:"listen" });
assert(ambition.evidence.exactSources.includes("glory-current"));
assert(!ambition.evidence.exactSources.includes("alexander-decoy"), "A lexical ambition decoy must not replace the direct record.");

const second = await lab.turn({ sessionId:session.id, text:scenarios[9].input, mode:"listen" });
assert.notEqual(second.followUpQuestion, first.followUpQuestion, "A session must not repeat its primary question.");
const stored = await store.get(session.id);
assert.equal(stored.messages.length, 4, "Session continuity must preserve both turns and replies.");
assert.equal(stored.observations.length, 2);
assert.equal(stored.messages[0].text, firstWording, "Source wording must remain verbatim.");

const counterSession = await lab.start({ mode:"counter" });
const counter = await lab.turn({ sessionId:counterSession.id, text:scenarios[7].input, mode:"counter" });
assert.match(counter.response, /strongest fair version/i, "Counter mode must steelman first.");
assert.match(counter.response, /strongest counter/i, "Counter mode must identify the carrying premise and challenge it.");
assert.equal(primaryQuestionCount(counter.followUpQuestion), 1);

const absentSession = await lab.start({ mode:"listen" });
const absent = await lab.turn({ sessionId:absentSession.id, text:scenarios[8].input, mode:"listen" });
assert.deepEqual(absent.evidence.exactSources, [], "Unapproved private material must not satisfy retrieval.");
assert.match(absent.response, /do not have approved evidence/i);

for (const [label, badResult, expected] of [
  ["ungrounded source", { response:"Invented citation.", sourcesUsed:[{ recordId:"not-retrieved", expressionType:"quotation" }] }, /unretrieved source/],
  ["question overflow", { response:"Too curious.", followUpQuestion:"First? Second?", sourcesUsed:[] }, /more than one primary/]
]) {
  const badStore = new MemorySessionStore();
  const badLab = createDialogueLab({ provider:new FixtureProvider(() => badResult), store:badStore, corpus });
  const badSession = await badLab.start({ mode:"listen" });
  await assert.rejects(
    () => badLab.turn({ sessionId:badSession.id, text:"Preparation and action", mode:"listen" }),
    expected,
    label
  );
}

const repeatingQuestion = "What changes when the system must name the next observable action?";
const repeatStore = new MemorySessionStore();
const repeatLab = createDialogueLab({
  provider:new FixtureProvider(() => ({ response:"Same question again.", followUpQuestion:repeatingQuestion, sourcesUsed:[] })),
  store:repeatStore,
  corpus:[]
});
const repeatSession = await repeatLab.start({ mode:"listen" });
await repeatLab.turn({ sessionId:repeatSession.id, text:"First thought", mode:"listen" });
await assert.rejects(
  () => repeatLab.turn({ sessionId:repeatSession.id, text:"Second thought", mode:"listen" }),
  /repeated a previous question/,
  "Repeated questions must be rejected using session memory."
);

const updateSession = await lab.start({ mode:"synthesize" });
await lab.turn({ sessionId:updateSession.id, text:scenarios[10].input, mode:"synthesize" });
const review = await lab.end({ sessionId:updateSession.id });
assert.equal(review.proposals.length, 1);
assert.equal(review.proposals[0].status, "proposed", "Provider interpretations cannot approve themselves.");
assert.equal(review.proposals[0].sourceWording, scenarios[10].input);
assert.equal(review.proposals[0].privacy, "P2");

for (const action of ["accept", "edit", "reject", "supersede"]) {
  const actionStore = new MemorySessionStore({ clock:() => new Date("2026-08-01T12:00:00.000Z") });
  const actionLab = createDialogueLab({ provider, store:actionStore, corpus, clock:() => new Date("2026-08-01T12:00:00.000Z") });
  const actionSession = await actionLab.start({ mode:"synthesize" });
  await actionLab.turn({ sessionId:actionSession.id, text:scenarios[10].input, mode:"synthesize" });
  const actionReview = await actionLab.end({ sessionId:actionSession.id });
  const payload = { sessionId:actionSession.id, proposalId:actionReview.proposals[0].id, action };
  if (action === "edit") payload.editedInterpretation = "Preparation needs an observable next action.";
  if (action === "supersede") payload.supersedesId = "claim-preparation-current";
  const decision = await actionLab.decide(payload);
  assert.notEqual(decision.proposal.status, "proposed", `${action} must resolve only the review proposal.`);
}

const exported = await lab.exportPrivateSource({ sessionId:session.id });
assert.match(exported.filename, /^dialogue-2026-08-01\.md$/);
assert.match(exported.content, /Privacy: P3/);
assert.match(exported.content, new RegExp(firstWording.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

const unavailableProvider = createProvider({ env:{} });
await assert.rejects(() => unavailableProvider.respond({}), ProviderBoundaryError);
const unavailableStore = createSessionStore({ env:{} });
await assert.rejects(() => unavailableStore.create({}), /not configured/);

const salt = randomBytes(16);
const password = "fixture-password";
const hash = `${salt.toString("hex")}:${scryptSync(password, salt, 32).toString("hex")}`;
const handler = createHandler({ env:{ CONSCIOUSNESS_PRIVATE_PASSWORD_HASH:hash } });
const req = { method:"POST", headers:{ origin:"https://beingchay.com" }, body:{ password, action:"start", payload:{ mode:"listen" } } };
const response = { statusCode:200, headers:{}, setHeader(k,v){this.headers[k]=v;}, status(code){this.statusCode=code;return this;}, json(value){this.body=value;return this;} };
await handler(req, response);
assert.equal(response.statusCode, 503, "Production must refuse private inference without approved provider/storage boundaries.");
assert.match(response.body.error, /PRIVATE_(SESSION_STORE|PROVIDER)_NOT_APPROVED/);

const publicMap = fs.readFileSync(new URL("../consciousness/map-page.js", import.meta.url), "utf8");
const publicMirror = fs.readFileSync(new URL("../consciousness/mirror-retrieval.js", import.meta.url), "utf8");
const labPage = fs.readFileSync(new URL("../consciousness/dialogue/index.html", import.meta.url), "utf8");
const labClient = fs.readFileSync(new URL("../consciousness/dialogue/dialogue.js", import.meta.url), "utf8");
assert(!publicMap.includes("DIALOGUE_PRIVATE_CORPUS"), "Public Mirror must not import the private corpus.");
assert(!publicMirror.includes("dialogue-lab"), "Public retrieval must remain separate from Dialogue Lab.");
assert(!labPage.includes("preparation-current") && !labClient.includes("preparation-current"), "Fixture corpus must not enter the browser bundle.");
assert(!labClient.includes("localStorage"), "Raw private dialogue must not be persisted in public browser storage.");

console.log("dialogue lab evaluation and boundary checks passed (12 scenarios)");
