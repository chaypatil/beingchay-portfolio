import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../consciousness/index.html", import.meta.url), "utf8");
const controller = await readFile(new URL("../consciousness/map-page.js", import.meta.url), "utf8");
const brain = await readFile(new URL("../codexmap/brain-net.js", import.meta.url), "utf8");

// Regression: the embedded brain became a passive wallpaper.
assert.doesNotMatch(controller, /interactive:false/, "Brain mode must accept drag and wheel input.");
assert.doesNotMatch(controller, /autoRotate:false/, "Brain mode should retain subtle autonomous depth.");
assert.match(brain, /interactionTarget/, "The brain renderer needs an external interaction surface above its canvas.");

// Regression: old transition ornament made the map/brain control visibly shake.
assert.doesNotMatch(page, /toggle-glitch/, "The map/brain control must not carry the retired glitch wiggle.");
assert.match(page, /class="mode-cue mode-cue-left"/, "Directional cues must flank the map/brain control.");
assert.match(page, /class="mode-cue mode-cue-right"/, "Directional cues must flank the map/brain control.");

// Regression: pre-playing a second Audio object leaked both tracks on iOS.
assert.doesNotMatch(controller, /primeTransitionMusic/, "The landing must never start the second track before transition.");

// The published copy is evidence, not an inline editor.
assert.doesNotMatch(page, /contenteditable="true"/, "Published node summaries must be read-only.");

// The voice must stay brief and sharp.
assert.match(controller, /conciseSummary\(value, limit = 112\)/, "Mirror answers need a strict short-copy ceiling.");
assert.doesNotMatch(controller, /const secondary = ranked\[1\]/, "The mirror must not concatenate a second node essay.");

// Every selected node needs an explicit provenance affordance.
assert.match(page, /id="source-open"/, "The detail panel needs a source-text button.");

console.log("consciousness interaction regression checks passed");
