import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../consciousness/index.html", import.meta.url), "utf8");
const controller = await readFile(new URL("../consciousness/map-page.js", import.meta.url), "utf8");
const brain = await readFile(new URL("../codexmap/brain-net.js", import.meta.url), "utf8");
const graphData = await readFile(new URL("../consciousness/graph-data.js", import.meta.url), "utf8");

// Regression: the embedded brain became a passive wallpaper.
assert.doesNotMatch(controller, /interactive:false/, "Brain mode must accept drag and wheel input.");
assert.doesNotMatch(controller, /autoRotate:false/, "Brain mode should retain subtle autonomous depth.");
assert.match(brain, /interactionTarget/, "The brain renderer needs an external interaction surface above its canvas.");
assert.match(brain, /onProjectionFrame/, "Brain nodes must receive the renderer's live camera projection.");
assert.match(controller, /brainProjectionById/, "Map nodes must follow the rotating brain instead of remaining fixed.");

// Regression: old transition ornament made the map/brain control visibly shake.
assert.doesNotMatch(page, /toggle-glitch/, "The map/brain control must not carry the retired glitch wiggle.");
assert.match(page, /class="mode-cue mode-cue-left"/, "Directional cues must flank the map/brain control.");
assert.match(page, /class="mode-cue mode-cue-right"/, "Directional cues must flank the map/brain control.");
assert.match(
  page,
  /mode-cue-left[^>]*[^]*?&gt;&gt;&gt;[^]*?id="deep-toggle"[^]*?id="map-theme-toggle"[^]*?&lt;&lt;&lt;/,
  "Mode controls must read >>> [brain] [theme] <<< with one inward cue per side."
);
assert.doesNotMatch(page, /id="detail-toggle"|id="layout-reset"/, "INFO and RST must not return to the map dock.");
assert.doesNotMatch(page, /cue-from-left|cue-from-right/, "Mode cues must remain still.");

// Node movement is temporary deformation, not a persisted custom layout.
assert.match(controller, /const elasticField = /, "Node dragging must deform an elastic field.");
assert.match(controller, /function returnElasticField\(/, "Dragged nodes must spring back to canonical positions.");
assert.doesNotMatch(controller, /localStorage\.setItem\(positionStorageKey/, "Dragged positions must never persist.");
assert.match(controller, /function finishMapTap\(/, "A background tap must dismiss the mobile detail sheet.");
assert.match(controller, /shouldStart:canSwipeDetail/, "The whole detail sheet must support swipe-down dismissal at scroll top.");

// The old 20fps mobile throttle and flat single-shell brain are regressions.
assert.doesNotMatch(controller, /compactMap \? 50 : 33/, "The relationship graph must follow native refresh.");
assert.doesNotMatch(brain, /compact \? 50 : 33/, "Brain rendering must follow native refresh.");
assert.match(brain, /function sculptCerebrum\(/, "Brain geometry needs a volumetric cerebral sculpt.");
assert.match(brain, /function buildAnatomyLines\(/, "Brain silhouette needs cerebellum and brainstem wire volumes.");
assert.match(brain, /uTime \* 0\.31/, "Brain signals must retain the faster firing cadence.");

// Regression: pre-playing a second Audio object leaked both tracks on iOS.
assert.doesNotMatch(controller, /primeTransitionMusic/, "The landing must never start the second track before transition.");

// The published copy is evidence, not an inline editor.
assert.doesNotMatch(page, /contenteditable="true"/, "Published node summaries must be read-only.");

// The voice must stay brief and sharp.
assert.match(controller, /conciseSummary\(value, limit = 112\)/, "Mirror answers need a strict short-copy ceiling.");
assert.doesNotMatch(controller, /const secondary = ranked\[1\]/, "The mirror must not concatenate a second node essay.");

// Every selected node needs an explicit provenance affordance.
assert.match(page, /id="source-open"/, "The detail panel needs a source-text button.");
assert.match(page, /id="source-vault-link"/, "Each node source needs a route into its Brain Vault shelf.");
assert.match(controller, /public-vault-index\.json/, "The Mirror must consult the redacted Brain Vault corpus.");
assert.match(graphData, /THE FOUR MAHĀVĀKYAS/, "The Upanishadic mother node must keep its corrected title.");
assert.match(graphData, /id:"love".*status:"mother node"/s, "Love must exist as a mother node rather than a flat summary.");

console.log("consciousness interaction regression checks passed");
