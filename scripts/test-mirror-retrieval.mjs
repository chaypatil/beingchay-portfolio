import assert from "node:assert/strict";
import {
  asksForVaultEvidence,
  mirrorConceptReply,
  rankMirrorNodes,
  rankVaultRecords
} from "../consciousness/mirror-retrieval.js";
import { publicNodes } from "../consciousness/graph-data.js";

const ambition = mirrorConceptReply("what is ambition for chay?");
assert.deepEqual(ambition.nodes, ["pothos", "glory", "agency"]);
assert.match(ambition.text, /pothos given agency/i);
assert.match(ambition.text, /status alone/i);

const ambitionNodes = rankMirrorNodes("ambition for chay", publicNodes);
assert.deepEqual(
  ambitionNodes.map(entry => entry.node.id),
  ["pothos", "glory", "agency"],
  "Broad ambition questions must resolve to the approved ambition cluster."
);

const misleadingRecord = {
  path:"entities/people/alexander-the-great.md",
  title:"Alexander the Great",
  privacy:"public",
  nodeIds:["alexander"],
  content:"Ambition appears once here. Alexander believed himself a descendant of Zeus."
};
assert.deepEqual(
  rankVaultRecords("ambition for chay", [misleadingRecord], { alignedNodeIds:["pothos","glory","agency"] }),
  [],
  "A single content occurrence cannot hijack a broad conceptual answer."
);

const alignedRecord = {
  path:"entities/topics/Cloud Consciousness.md",
  title:"Cloud Consciousness",
  privacy:"public",
  nodeIds:["cloud-consciousness","consciousness"],
  content:"Cloud Consciousness is a long-horizon external mirror."
};
assert.equal(
  rankVaultRecords(
    "what is written about cloud consciousness in the vault?",
    [alignedRecord],
    { alignedNodeIds:["cloud-consciousness","consciousness"] }
  )[0]?.record,
  alignedRecord
);
assert.equal(asksForVaultEvidence("what did the vault say exactly?"), true);
assert.equal(asksForVaultEvidence("what does this mean?"), false);

console.log("mirror retrieval checks passed");
