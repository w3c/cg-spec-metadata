import fs from "fs";
import specs from "./specs.json" with { type: "json" };

import { collectGithubMetadata } from "./collectors/github.js";
import { collectMozillaPosition } from "./collectors/mozilla.js";
import { collectWebkitPosition } from "./collectors/webkit.js";
import { collectChromiumPosition } from "./collectors/chromium.js";
import { collectWF } from "./collectors/web-features.js";
import { collectWPTFyi } from "./collectors/wpt.js";
import { collectRecentSubstantiveContributions } from "./collectors/substantive-contributions.js";

async function run() {
  const results = [];

  for (const spec of specs) {
    console.log(`Collecting metadata for ${spec.shortname}`);

    const metadata = {
      shortname: spec.shortname,
      specUrl: spec.specUrl,
      feature: spec.feature
    };

    metadata.github = await collectGithubMetadata(spec);
    metadata.mozilla = await collectMozillaPosition(spec);
    metadata.webkit = await collectWebkitPosition(spec);
    metadata.chromium = await collectChromiumPosition(spec);
    metadata.web_features = await collectWF(spec);
    metadata.wpt = await collectWPTFyi(spec);
    metadata.substantiveContributionsLastYear = await collectRecentSubstantiveContributions(spec);

    results.push(metadata);
  }

  fs.writeFileSync(
    "./data.json",
    JSON.stringify(results, null, 2)
  );

  console.log("Metadata collection complete.");
}

run();