import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { loadOverrides, mergeResultsWithOverride } from "../utils.js";

/** An overrides directory laid out from { filename: contents }. */
async function overridesDir(files) {
  const dir = await mkdtemp(join(tmpdir(), "cg-overrides-"));
  await mkdir(dir, { recursive: true });
  for (const [name, contents] of Object.entries(files)) {
    await writeFile(join(dir, name),
      typeof contents === "string" ? contents : JSON.stringify(contents), "utf8");
  }
  return dir;
}

test("loadOverrides: one file per spec, keyed by filename", async () => {
  const dir = await overridesDir({
    "file-system-access.json": { github: { stars: 800 } },
    "scheduling-apis.json": { cgStatus: "Closed" },
  });

  const overrides = await loadOverrides(dir);
  assert.deepEqual([...overrides.keys()].sort(), ["file-system-access", "scheduling-apis"]);
  assert.deepEqual(overrides.get("file-system-access"), { github: { stars: 800 } });
});

test("loadOverrides: an empty object, a non-JSON file and a missing directory are all no-ops", async () => {
  const dir = await overridesDir({
    "empty.json": {},
    "README.md": "# not an override",
  });

  const overrides = await loadOverrides(dir);
  assert.equal(overrides.size, 0, "{} is the same as no file, and only .json is read");

  const absent = await loadOverrides(join(dir, "does-not-exist"));
  assert.equal(absent.size, 0);
});

test("loadOverrides: a malformed file is skipped rather than failing the run", async () => {
  const dir = await overridesDir({
    "broken.json": "{ not json ,,",
    "good.json": { github: { stars: 1 } },
  });

  const overrides = await loadOverrides(dir);
  assert.deepEqual([...overrides.keys()], ["good"], "the good file still loads");
});

test("mergeResultsWithOverride: deep-merges, leaving sibling keys alone", async () => {
  const results = [
    { shortname: "a", github: { stars: 10, forks: 2 }, wpt: { tests: 5 } },
    { shortname: "b", github: { stars: 20 } },
  ];
  const overrides = new Map([["a", { github: { stars: 800 } }]]);

  const [a, b] = mergeResultsWithOverride(results, overrides);
  assert.equal(a.github.stars, 800);
  assert.equal(a.github.forks, 2, "untouched sibling survives");
  assert.deepEqual(a.wpt, { tests: 5 }, "untouched branch survives");
  assert.equal(b.github.stars, 20, "a spec with no override is unchanged");
});

test("mergeResultsWithOverride: adds fields no collector produces, and replaces arrays whole", async () => {
  const results = [{ shortname: "a", web_features: { spec: ["one", "two"] } }];
  const overrides = new Map([["a", {
    standardizationPlan: { text: "Migrating", url: "https://example.org/1" },
    web_features: { spec: ["only"] },
  }]]);

  const [a] = mergeResultsWithOverride(results, overrides);
  assert.deepEqual(a.standardizationPlan, { text: "Migrating", url: "https://example.org/1" });
  assert.deepEqual(a.web_features.spec, ["only"], "arrays are replaced, never merged");
});

test("mergeResultsWithOverride: an override for an unknown spec changes nothing", async () => {
  const results = [{ shortname: "a", github: { stars: 10 } }];
  const overrides = new Map([["no-such-spec", { github: { stars: 999 } }]]);

  const merged = mergeResultsWithOverride(results, overrides);
  assert.deepEqual(merged, results);
});
