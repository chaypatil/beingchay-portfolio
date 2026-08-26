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

await check("vercel.json blocks /lib from being served", () => {
  const rule = (config.rewrites || []).find(r => r.source === "/lib/:path*");
  assert.ok(rule, "the /lib block is missing from vercel.json rewrites");
  assert.ok(!/^\/(lib|api)\b/.test(rule.destination), "block must not resolve back into real files");
});

await check("the /lib block is first, so nothing shadows it", () => {
  assert.equal((config.rewrites || [])[0].source, "/lib/:path*",
    "a rewrite ahead of the block could match /lib first and serve it");
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
