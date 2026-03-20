/**
 * Collector: web-features-mapping data, which provides a mapping between external data and web features ids, which can then be used to correlate with other data sources like Chrome Status and WPT.
 * The data is fetched from the web-features-mapping repository, which is maintained by the web-platform-dx team.
 * The collector looks up the web feature ID for each spec and returns the corresponding data from the web-features-mapping dataset.
 */

const WEB_FEATURES_MAPPINGS_URL = "https://raw.githubusercontent.com/web-platform-dx/web-features-mappings/refs/heads/main/mappings/combined-data.json";

let cache = null;

async function fetchWebFeaturesMappingPositions() {
  if (!cache) {
    const res = await fetch(WEB_FEATURES_MAPPINGS_URL);
    if (!res.ok) {
      throw new Error(`Failed to fetch web-features-mapping data: HTTP ${res.status}`);
    }

    cache = await res.json();
  }
  return cache;
}

export async function collectWebFeaturesMapping(spec) {
  try {
    await fetchWebFeaturesMappingPositions();
    const entry = Object.entries(cache).find(([k, v]) => k === spec.webFeaturesId);

  return entry || {};
  } catch (err) {
    console.error(`[web-features-mapping] Error fetching web-features-mapping data for ${spec.repo}: ${err.message}`);
    return { error: err.message };
  }
}