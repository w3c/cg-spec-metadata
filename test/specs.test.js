import { test } from "node:test";
import assert from "node:assert/strict";

import webSpecs from "web-specs" with { type: "json" };

import { githubRepo, resolveSpec } from "../specs.js";

test("specs: a shortname resolves to the nightly URL and owner/name", () => {
  const resolved = resolveSpec({ shortname: "scheduling-apis", webFeaturesId: "scheduler" });
  assert.equal(resolved.url, "https://wicg.github.io/scheduling-apis/");
  assert.equal(resolved.repo, "WICG/scheduling-apis");
  assert.equal(resolved.webFeaturesId, "scheduler");
  assert.equal(resolved.shortname, "scheduling-apis");
});

test("specs: a former shortname still resolves, to the spec that has it now", () => {
  const renamed = webSpecs.find((spec) => spec.formerNames?.length);
  const resolved = resolveSpec({ shortname: renamed.formerNames[0] });
  assert.equal(resolved.url, renamed.nightly.url);
});

test("specs: an unknown shortname does not resolve", () => {
  assert.equal(resolveSpec({ shortname: "dummy-spec" }), null);
});