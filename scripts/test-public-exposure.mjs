// What the site must never serve.
//
// Vercel serves everything outside api/ as a static file. That is how lib/ ended
// up publicly readable on 2026-08-20: the auth implementation, the dialogue
// pipeline, and (once merged) the encryption module were all fetchable at
// beingchay.com/lib/... No secrets were in them, since every secret comes from
// the environment, but publishing the origin allowlist, the failed-auth delay
// and the exact env var names is free reconnaissance for anyone probing the
// private layer.
//
// .vercelignore cannot fix it: excluding lib/ drops the files from the
// deployment entirely and breaks the api/ functions that require them. The fix
// is a rewrite in vercel.json that sends /lib/* to a path that does not exist.
//
// This test guards the config so the rule cannot be dropped by accident. Run
// with a URL to check a live deployment as well:
//
//   node scripts/test-public-exposure.mjs
//   node scripts/test-public-exposure.mjs https://beingchay.com

import assert from "node:assert";
import fs from "node:fs";

const config = JSON.parse(fs.readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));

let passed = 0;
const check = async (name, fn) => {
  try { await fn(); console.log("PASS ", name); passed++; }
  catch (e) { console.log("FAIL ", name, "\n      ", e.message); process.exitCode = 1; }
};

await check("no server-side code sits in the static root", () => {
  // Vercel serves everything outside api/ as a static file, and it resolves the
  // filesystem BEFORE applying rewrites, so a rewrite can never shadow a file
  // that exists. A /lib/* rewrite was tried on 2026-08-20 and did nothing: the
  // files stayed publicly readable. The only fix that works is keeping shared
  // server code out of the served root entirely, hence api/_lib. Paths under
  // api/ beginning with an underscore are bundled with the functions that
  // require them but are never routable.
  assert.ok(!fs.existsSync(new URL("../lib", import.meta.url)),
    "lib/ is back in the static root and would be publicly readable again");
  assert.ok(fs.existsSync(new URL("../api/_lib", import.meta.url)),
    "api/_lib is missing, so the functions cannot resolve their imports");
});

await check("api files import from _lib, not from a served path", () => {
  for (const file of ["dialogue-lab.js", "consciousness-private.js"]) {
    const src = fs.readFileSync(new URL(`../api/${file}`, import.meta.url), "utf8");
    assert.ok(!/require\(["']\.\.\/lib\//.test(src),
      `api/${file} still imports from the static root`);
  }
});

await check("vercel.json carries no keys Vercel would reject", () => {
  const allowed = { rewrites: ["source", "destination", "has", "missing"],
                    redirects: ["source", "destination", "permanent", "statusCode", "has", "missing"],
                    headers: ["source", "headers", "has", "missing"] };
  for (const [section, keys] of Object.entries(allowed)) {
    for (const entry of config[section] || []) {
      for (const key of Object.keys(entry)) {
        assert.ok(keys.includes(key),
          `"${key}" in ${section} is not a valid Vercel key and would fail the whole deploy`);
      }
    }
  }
});

await check("private surfaces are disallowed in robots.txt", () => {
  const robots = fs.readFileSync(new URL("../robots.txt", import.meta.url), "utf8");
  for (const path of ["/api/", "/consciousness/dialogue/", "/consciousness/semantic/"]) {
    assert.ok(robots.includes(`Disallow: ${path}`), `robots.txt does not disallow ${path}`);
  }
});

await check("internal docs and tooling are kept out of the deployment", () => {
  const ignore = fs.readFileSync(new URL("../.vercelignore", import.meta.url), "utf8");
  for (const entry of ["*.md", "consciousness/semantic", ".gstack", ".env*"]) {
    assert.ok(ignore.includes(entry), `.vercelignore is missing ${entry}`);
  }
  // The analytics init script is loaded by every page. Excluding scripts/ wholesale
  // would break analytics sitewide, which happened once already.
  assert.ok(!/^scripts\s*$/m.test(ignore), "scripts/ must not be excluded wholesale");
});

const target = process.argv[2];
if (target) {
  const base = target.replace(/\/+$/, "");
  const mustNotServe = [
    "/lib/private-auth.js",
    "/lib/dialogue-lab/pipeline.js",
    "/lib/dialogue-lab/provider-adapter.js",
    "/lib/mirror/crypto.js",
    "/lib/mirror/store.js",
    "/.env",
    "/package.json",
    "/vercel.json",
    "/debug.log"
  ];
  const mustServe = ["/", "/consciousness/", "/scripts/vercel-analytics-init.js"];

  await check(`${base} serves nothing it should not`, async () => {
    for (const path of mustNotServe) {
      const res = await fetch(`${base}${path}`);
      assert.ok(res.status === 404 || res.status === 403,
        `${path} returned ${res.status}, expected 404 — this is publicly readable`);
    }
  });

  await check(`${base} still serves what it should`, async () => {
    for (const path of mustServe) {
      const res = await fetch(`${base}${path}`);
      assert.equal(res.status, 200, `${path} returned ${res.status} — the block went too far`);
    }
  });
}

console.log(`\n${passed} passed${target ? "" : " (pass a URL to also check a live deployment)"}`);
