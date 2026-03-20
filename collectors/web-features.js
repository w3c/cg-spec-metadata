import data from "web-features/data.json" with { type: "json" };
const { browsers, features, groups, snapshots } = data;

export async function collectWF(spec) {

  const data = features[spec.shortname] || features[spec.wfShortname];

  return data || null;
}