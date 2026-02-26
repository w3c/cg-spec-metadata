import axios from "axios";

const CHROME_STATUS_URL = "https://chromestatus.com/api/v0/features";

export async function collectChromiumPosition(spec) {
  try {
    const response = await axios.get(`${CHROME_STATUS_URL}?q=${encodeURIComponent(spec.shortname)}`);
    // remove XSSI prefix and parse JSON
    const data = JSON.parse(response.data.substring(response.data.indexOf('\n') + 1));

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

  } catch (e) {
    return { error: e.message };
  }
}