import { writeFile } from 'node:fs/promises';
import { logger } from './logger.js';
import { mergeResultsWithOverride } from "./utils.js";

import { collectGithubMetadata } from "./collectors/github.js";
import { collectMozillaPosition } from "./collectors/mozilla.js";
import { collectWebkitPosition } from "./collectors/webkit.js";
import { collectChromiumPosition } from "./collectors/chromium.js";
import { collectWebFeatures } from "./collectors/web-features.js";
import { collectWebFeaturesMapping } from "./collectors/web-features-mapping.js";
import { collectWPTFyi } from "./collectors/wpt.js";
import { collectRecentSubstantiveContributions } from "./collectors/substantive-contributions.js";

import specs from "./specs.json" with { type: "json" };
import data from "./data.json" with { type: "json" };
import override from "./override.json" with { type: "json" };

const collectors = [
  { key: "github",                          fn: collectGithubMetadata },
  { key: "mozilla",                         fn: collectMozillaPosition },
  { key: "webkit",                          fn: collectWebkitPosition },
  { key: "chromium",                        fn: collectChromiumPosition },
  { key: "web_features",                    fn: collectWebFeatures },
  { key: "web_features_mapping",            fn: collectWebFeaturesMapping },
  { key: "wpt",                             fn: collectWPTFyi },
  { key: "substantiveContributionsLastYear", fn: collectRecentSubstantiveContributions },
];

const args = process.argv;

if (args.includes('--help') || args.includes('-h')) {
    console.log("Usage: node index.js [shortname1] [shortname2] ...\n\
Example: node index.js\n\
         node index.js file-system-access\n\
\n\
If no shortnames are provided, metadata for all specs will be collected.");
    process.exit(0);
}

// Update data.json with new results, merging with existing data
async function updateDataFile(results) {
  const dataMap = new Map(data.map(item => [item.shortname, item]));

  results.forEach(result => {
    dataMap.set(result.shortname, result);
  });

  // Apply the override data to the merged results before writing to file
  const finalData = mergeResultsWithOverride(Array.from(dataMap.values()), override);

  try {
    await writeFile('./data.json', JSON.stringify(finalData, null, 2), 'utf8');
    logger.success(`data.json updated. Total specs: ${finalData.length}`);
  } catch (err) {
    logger.error("Failed to write to data.json", err.message);
  }
}

async function run() {

  // Get arguments starting from the 3rd index (node index.js shortname1 shortname2)
  const targetShortnames = args.slice(2);

  // Filter specs: if no args provided, process all. Otherwise, filter by shortname.
  const specsToProcess = targetShortnames.length > 0
      ? specs.filter(s => targetShortnames.includes(s.shortname))
      : specs;

  if (targetShortnames.length > 0 && specsToProcess.length === 0) {
      logger.error(`No specs found matching ${targetShortnames.join(', ')}`);
      process.exit(1);
  }

  const results = await Promise.all(
    specsToProcess.map(async (spec) => {
      logger.info(`Collecting metadata for ${spec.shortname}`);

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
  updateDataFile(results);
  logger.success("Metadata collection complete.");
}

run();