import data from "web-features/data.json" with { type: "json" };
const { browsers, features, groups, snapshots } = data;

export async function collectWF(spec) {

  const data = features[spec.shortname] || features[spec.wfShortname];

  if (!data) {
    console.error(`[web-features] Error fetching web-features data for ${spec.repo}`);
  }
  return data || null;
}