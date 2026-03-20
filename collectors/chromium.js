/**
 * Collector: Chromium's feature status, based on the data from the Chrome Status API, which is maintained by the Chrome team.
 * The collector looks up the status for each spec based on its shortname and returns the corresponding data from the Chrome Status dataset.
 */
const CHROME_STATUS_URL = "https://chromestatus.com/api/v0/features";

export async function collectChromiumPosition(spec) {
  try {
    const res = await fetch(`${CHROME_STATUS_URL}?q=${encodeURIComponent(spec.shortname)}`);

    if (!res.ok) {
      throw new Error(`Failed to fetch Chromium positions: HTTP ${res.status}`);
    }

    const body = await res.text();

    // remove XSSI prefix and parse JSON
    const data = JSON.parse(body.substring(body.indexOf('\n') + 1));

    const match = data.features.find(f =>
      f.web_feature.toLowerCase() === spec.shortname
    );

    if (!match) {
      return { status: "no-signal" };
    }

    return {
      featureId: match.id,
      name: match.name,
      intentStage: match.intent_stage, // what are the different intent stages?
      shipping_year: match.shipping_year,
      browsers: match.browsers
    };

  } catch (err) {
    console.error(`[chromium] Error fetching chrome status data for ${spec.repo}: ${err.message}`);
    return { error: err.message };
  }
}