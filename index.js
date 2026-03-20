import fs from "fs";
import specs from "./specs.json" with { type: "json" };

import { collectGithubMetadata } from "./collectors/github.js";
import { collectMozillaPosition } from "./collectors/mozilla.js";
import { collectWebkitPosition } from "./collectors/webkit.js";
import { collectChromiumPosition } from "./collectors/chromium.js";
import { collectWF } from "./collectors/web-features.js";
import { collectWPTFyi } from "./collectors/wpt.js";
import { collectRecentSubstantiveContributions } from "./collectors/substantive-contributions.js";

const collectors = [
  { key: "github",                          fn: collectGithubMetadata },
  { key: "mozilla",                         fn: collectMozillaPosition },
  { key: "webkit",                          fn: collectWebkitPosition },
  { key: "chromium",                        fn: collectChromiumPosition },
  { key: "web_features",                    fn: collectWF },
  { key: "wpt",                             fn: collectWPTFyi },
  { key: "substantiveContributionsLastYear", fn: collectRecentSubstantiveContributions },
];

async function run() {
  const results = await Promise.all(
    specs.map(async (spec) => {
      console.log(`Collecting metadata for ${spec.shortname}`);

      const collectedEntries = await Promise.all(
        collectors.map(async ({ key, fn }) => [key, await fn(spec)])
      );

      return {
        shortname: spec.shortname,
        specUrl: spec.specUrl,
        feature: spec.feature,
        ...Object.fromEntries(collectedEntries),
      };
    })
  );

  fs.writeFileSync("./data.json", JSON.stringify(results, null, 2));
  console.log("Metadata collection complete.");
}

run();