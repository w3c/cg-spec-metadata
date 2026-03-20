/**
 * Collector: Mozilla's standards positions, based on the data from the standards-positions repository, which is maintained by the Mozilla web-platform team.
 * The collector looks up the position for each spec based on its URL and returns the corresponding data from the standards-positions dataset.
 */

const MOZILLA_JSON_URL =
  "https://mozilla.github.io/standards-positions/merged-data.json";

let cache = null;

async function fetchMozillaPositions() {
  if (!cache) {
    const res = await fetch(MOZILLA_JSON_URL);
    if (!res.ok) {
      throw new Error(`Failed to fetch Mozilla positions: HTTP ${res.status}`);
    }

    cache = await res.json();
  }
  return cache;
}

export async function collectMozillaPosition(spec) {
  try {
    await fetchMozillaPositions();
    const entry = Object.entries(cache).find(([k, v]) => v.url === spec.url);

  return {
    issue: entry ? `https://github.com/mozilla/standards-positions/issues/${entry[0]}` : "N/A",
    position: entry ? entry[1].position : "no-signal"
  };
  } catch (err) {
    console.error(`[mozilla] Error fetching Mozilla standards position for ${spec.repo}: ${err.message}`);
    return { error: err.message };
  }
}