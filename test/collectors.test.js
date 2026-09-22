import { test } from "node:test";
import assert from "node:assert/strict";

import { collectWPTFyi } from "../collectors/wpt.js";
import { collectContributions } from "../collectors/contributions.js";
import { collectW3CGroup } from "../collectors/w3c-group.js";
import { collectLastEdited } from "../collectors/last-edited.js";
import { collectChromiumPosition } from "../collectors/chromium.js";
import { stubFetch, wptTest } from "./helpers.js";

test("wpt: subtests is the largest total any run saw, not the sum", async () => {
  const fetch = stubFetch({
    "wpt.fyi": {
      json: {
        runs: [{ browser_name: "chrome" }, { browser_name: "edge" }, { browser_name: "firefox" }],
        results: [wptTest("/scheduler/a.html", [3, 3, 0]), wptTest("/scheduler/b.html", [0, 5, 5])],
      },
    },
  });

  try {
    const wpt = await collectWPTFyi({ shortname: "scheduling-apis", webFeaturesId: "scheduler" });
    assert.equal(wpt.tests, 2);
    assert.equal(wpt.subtests, 8, "3 + 5, not 6 + 10");
    assert.equal(wpt.runs, 3);
    assert.equal(wpt.hasResults, true);
  } finally {
    fetch.restore();
  }
});

test("wpt: results outside the queried path are ignored", async () => {
  const fetch = stubFetch({
    "wpt.fyi": {
      json: {
        runs: [{ browser_name: "chrome" }],
        results: [wptTest("/scheduler/a.html", [2]), wptTest("/other-spec/b.html", [99])],
      },
    },
  });

  try {
    const wpt = await collectWPTFyi({ shortname: "x", webFeaturesId: "scheduler" });
    assert.equal(wpt.tests, 1);
    assert.equal(wpt.subtests, 2);
  } finally {
    fetch.restore();
  }
});

test("contributions: counts changes and contributors, substantive apart from the rest", async () => {
  const recent = new Date();
  const old = new Date();
  old.setFullYear(old.getFullYear() - 3);

  const fetch = stubFetch({
    "repo-manager": {
      json: {
        substantiveContributors: {
          35662: { name: "Google LLC", prs: [{ lastUpdated: recent.toDateString() },
                                              { lastUpdated: old.toDateString() }] },
          62028: { name: "Igalia", prs: [{ lastUpdated: old.toDateString() }] },
        },
        nonSubstantiveContributors: {
          someone: { name: "someone", prs: [{ lastUpdated: recent.toDateString() }] },
        },
      },
    },
  });

  try {
    const c = await collectContributions({ repo: "WICG/test-contributions", shortname: "x" });
    assert.deepEqual(c.substantive, { contributions: 3, contributors: 2 });
    assert.deepEqual(c.nonSubstantive, { contributions: 1, contributors: 1 });
    // One pull request in the window, belonging to one contributor.
    assert.equal(c.substantiveChangesLastYear, 1);
    assert.equal(c.substantiveContributorsLastYear, 1);
  } finally {
    fetch.restore();
  }
});

test("w3c-group: reads the group from the repository's w3c.json", async () => {
  const fetch = stubFetch({
    "w3c.json": { json: { group: [80485], "repo-type": "cg-report" } },
    "api.w3.org": {
      json: {
        id: 80485,
        name: "Web Platform Incubator Community Group",
        shortname: "wicg",
        is_closed: false,
        _links: { homepage: { href: "https://www.w3.org/community/wicg/" },
                  join: { href: "https://www.w3.org/community/wicg/join" } },
      },
    },
  });

  try {
    const group = await collectW3CGroup({ repo: "WICG/test-group", shortname: "x" });
    assert.equal(group.isClosed, false);
    assert.equal(group.name, "Web Platform Incubator Community Group");
    assert.equal(group.joinUrl, "https://www.w3.org/community/wicg/join");
    // The id from w3c.json is what the API was asked about.
    assert.ok(fetch.calls.some((c) => c.url.endsWith("/groups/80485")), "looked the group up by id");
  } finally {
    fetch.restore();
  }
});

test("w3c-group: a group declared in specs.json skips the repository lookup", async () => {
  const fetch = stubFetch({
    "api.w3.org": { json: { id: 1, name: "Closed CG", shortname: "closed", is_closed: true, _links: {} } },
  });

  try {
    const group = await collectW3CGroup({ repo: "WICG/test-declared", shortname: "x", group: "closed" });
    assert.equal(group.isClosed, true);
    assert.ok(fetch.calls.every((c) => !c.url.includes("w3c.json")), "did not read w3c.json");
    assert.ok(fetch.calls.some((c) => c.url.endsWith("/groups/cg/closed")), "asked by shortname");
  } finally {
    fetch.restore();
  }
});

test("last-edited: a missing Last-Modified is reported rather than guessed", async () => {
  const fetch = stubFetch({ "example.org": { headers: {} } });

  try {
    const edited = await collectLastEdited({ url: "https://example.org/spec/", shortname: "x" });
    assert.deepEqual(edited, { date: null, source: "none" });
  } finally {
    fetch.restore();
  }
});

test("last-edited: a real Last-Modified becomes a date", async () => {
  const fetch = stubFetch({
    "example.org": {
      headers: { "last-modified": "Fri, 30 May 2025 20:42:26 GMT", date: new Date().toUTCString() },
    },
  });

  try {
    const edited = await collectLastEdited({ url: "https://example.org/spec/", shortname: "x" });
    assert.deepEqual(edited, { date: "2025-05-30", source: "http-last-modified" });
  } finally {
    fetch.restore();
  }
});

test("chromium: matches on webFeaturesId and takes the entry that shipped first", async () => {
  const fetch = stubFetch({
    chromestatus: {
      // The API prefixes its JSON with an XSSI guard line.
      text: ")]}'\n" + JSON.stringify({
        features: [
          { id: 1, web_feature: null, name: "unrelated" },
          { id: 2, web_feature: "scheduler", name: "scheduler.yield()", shipping_year: 2024,
            browsers: { webdev: { view: { text: "Positive" } } } },
          { id: 3, web_feature: "scheduler", name: "scheduler.postTask", shipping_year: 2021,
            browsers: { webdev: { view: { text: "Positive" } } } },
        ],
      }),
    },
  });

  try {
    // The shortname deliberately differs from the web-features id.
    const chromium = await collectChromiumPosition({ shortname: "scheduling-apis", webFeaturesId: "scheduler" });
    assert.equal(chromium.featureId, 3, "postTask shipped in 2021, yield in 2024");
    assert.equal(chromium.matches, 2);
    assert.equal(chromium.browsers.webdev.view.text, "Positive");
    assert.ok(fetch.calls[0].url.includes("q=scheduler"), "queried the web-features id");
  } finally {
    fetch.restore();
  }
});

test("chromium: no matching web_feature is no signal", async () => {
  const fetch = stubFetch({
    chromestatus: { text: ")]}'\n" + JSON.stringify({ features: [{ id: 1, web_feature: "something-else" }] }) },
  });

  try {
    const chromium = await collectChromiumPosition({ shortname: "x", webFeaturesId: "absent" });
    assert.deepEqual(chromium, { status: "no-signal" });
  } finally {
    fetch.restore();
  }
});
