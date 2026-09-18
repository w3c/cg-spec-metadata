import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import { logger } from './logger.js';
import { loadOverrides, mergeResultsWithOverride } from "./utils.js";

import { collectGithubMetadata } from "./collectors/github.js";
import { collectMozillaPosition } from "./collectors/mozilla.js";
import { collectWebkitPosition } from "./collectors/webkit.js";
import { collectChromiumPosition } from "./collectors/chromium.js";
import { collectWebFeatures } from "./collectors/web-features.js";
import { collectWebFeaturesMapping } from "./collectors/web-features-mapping.js";
import { collectWPTFyi } from "./collectors/wpt.js";
import { collectContributions, collectRecentSubstantiveContributions } from "./collectors/contributions.js";
import { collectLastEdited } from "./collectors/last-edited.js";
import { collectW3CGroup } from "./collectors/w3c-group.js";
import { project } from "./projection.js";

import specs from "./specs.json" with { type: "json" };
import data from "./data.json" with { type: "json" };

const collectors = [
  { key: "github",                           fn: collectGithubMetadata },
  { key: "mozilla",                          fn: collectMozillaPosition },
  { key: "webkit",                           fn: collectWebkitPosition },
  { key: "chromium",                         fn: collectChromiumPosition },
  { key: "web_features",                     fn: collectWebFeatures },
  { key: "web_features_mapping",             fn: collectWebFeaturesMapping },
  { key: "wpt",                              fn: collectWPTFyi },
  { key: "substantiveContributionsLastYear", fn: collectRecentSubstantiveContributions },
  { key: "contributions",                    fn: collectContributions },
  { key: "lastEdited",                       fn: collectLastEdited },
  { key: "w3cGroup",                         fn: collectW3CGroup },
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

// Shortnames become filenames, so keep them to something obviously safe.
const SAFE_SHORTNAME = /^[a-z0-9][a-z0-9-]*$/;
const SPECS_DIR = './specs';

// Write one projected file per spec for documents to read, and remove the files
// of specs that are no longer in specs.json.
async function updateSpecFiles(finalData) {
  const written = new Set();
  const inputs = new Map(specs.map(spec => [spec.shortname, spec]));

  await mkdir(SPECS_DIR, { recursive: true });

  for (const spec of finalData) {
    if (!SAFE_SHORTNAME.test(spec.shortname ?? "")) {
      logger.error(`Refusing to write a file for the shortname "${spec.shortname}"`);
      continue;
    }
    const name = `${spec.shortname}.json`;
    try {
      const projected = project(spec, inputs.get(spec.shortname));
      await writeFile(`${SPECS_DIR}/${name}`, JSON.stringify(projected, null, 2) + "\n", 'utf8');
      written.add(name);
    } catch (err) {
      logger.error(`Failed to write ${SPECS_DIR}/${name}`, err.message);
    }
  }

  for (const name of await readdir(SPECS_DIR)) {
    if (name.endsWith('.json') && !written.has(name)) {
      await unlink(`${SPECS_DIR}/${name}`);
      logger.info(`Removed ${SPECS_DIR}/${name}, which is no longer in specs.json`);
    }
  }

  logger.success(`${SPECS_DIR}/ updated. Total specs: ${written.size}`);
}

// Update data.json with new results, merging with existing data
async function updateDataFile(results) {
  const dataMap = new Map(data.map(item => [item.shortname, item]));

  results.forEach(result => {
    dataMap.set(result.shortname, result);
  });

  // Apply the overrides to the merged results before writing to file
  const overrides = await loadOverrides();
  const finalData = mergeResultsWithOverride(Array.from(dataMap.values()), overrides);

  try {
    await writeFile('./data.json', JSON.stringify(finalData, null, 2), 'utf8');
    logger.success(`data.json updated. Total specs: ${finalData.length}`);
  } catch (err) {
    logger.error("Failed to write to data.json", err.message);
  }

  await updateSpecFiles(finalData);
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
        specUrl: spec.url,
        repo: spec.repo,
        feature: spec.feature,
        collectedAt: new Date().toISOString(),
        ...Object.fromEntries(collectedEntries),
      };
    })
  );
  await updateDataFile(results);
  logger.success("Metadata collection complete.");
}

run();