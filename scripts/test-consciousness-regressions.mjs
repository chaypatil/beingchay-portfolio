import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../consciousness/map-page.js", import.meta.url), "utf8");
const shell = await readFile(new URL("../consciousness/index.html", import.meta.url), "utf8");
const portfolioShell = await readFile(new URL("../c2x/index.html", import.meta.url), "utf8");
const vercelConfig = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));

assert.match(
  source,
  /history\.pushState\([^)]*["']\/consciousness\//,
  "The landing must remain in history so mobile Back returns to it."
);
assert.match(portfolioShell, /<base href=["']\/portfolio\/["']>/, "The extensionless /portfolio route must resolve relative assets safely.");
assert(
  vercelConfig.rewrites.some(route => route.source === "/portfolio/:path*" && route.destination === "/c2x/:path*"),
  "The public /portfolio route must serve the existing C2X page tree."
);
assert.doesNotMatch(
  source,
  /history\.replaceState\([^)]*["']\/consciousness\//,
  "Entering the map must not erase the landing from browser history."
);
assert.match(
  source,
  /PROJECT_DESTINATIONS[\s\S]*fallout[\s\S]*https:\/\/fall0ut\.in[\s\S]*c2x[\s\S]*\/portfolio\//,
  "FALLØUT and C2X need explicit direct destinations."
);
assert.match(
  source,
  /bindNativeTouchSwipe\(libraryRail[\s\S]*direction:"left"[\s\S]*setPanelCollapsed\("rail", true\)/,
  "The mobile library must observe native touch swipes instead of fighting browser scrolling."
);
assert.match(
  source,
  /bindNativeTouchSwipe\(detailPanel[\s\S]*direction:"down"[\s\S]*setPanelCollapsed\("detail", true\)/,
  "The mobile detail sheet must close with a native downward swipe."
);
assert.match(
  source,
  /if \(!compactMap\)[\s\S]*width:1000[\s\S]*return \{ width:1000, height:650/,
  "Mobile must retain the desktop map geometry instead of stretching it vertically."
);
assert.doesNotMatch(
  shell,
  /id=["']depth-(?:back|forward)["']/,
  "Retired Z controls must not be present in the current shell."
);
assert.match(
  source,
  /setBrainMode\(!brainMode\)/,
  "The central switch must rearrange the current map in place."
);
assert.doesNotMatch(
  source,
  /openPrivateDialog\(["']codexmap["']\)/,
  "The artistic head index must not be behind the private password."
);
assert.doesNotMatch(
  source,
  /public model does not have enough evidence/i,
  "The public mirror must not answer every ordinary message with the old canned refusal."
);
assert.match(
  source,
  /you found the part that talks/,
  "The public mirror needs a conversational greeting path."
);

console.log("consciousness regression checks passed");
