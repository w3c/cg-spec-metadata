/**
 * Collector: Web Features, based on the data from the web-features dataset, which is maintained by the WebDX CG.
 */
import data from "web-features/data.json" with { type: "json" };
const { browsers, features, groups, snapshots } = data;

export async function collectWebFeatures(spec) {

  const data = features[spec.webFeaturesId];

  if (!data) {
    console.error(`[web-features] Error fetching web-features data for ${spec.repo}`);
  }
  return data || null;
}