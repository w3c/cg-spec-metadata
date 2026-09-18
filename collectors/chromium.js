/**
 * Collector: Chromium's feature status, from the Chrome Status API.
 *
 * Chrome Status tags its features with a `web_feature` id from the web-features
 * dataset, so the lookup is keyed on `webFeaturesId`, not on the shortname --
 * those differ often enough to matter (`scheduling-apis` is `scheduler` there,
 * and matching on the shortname found nothing at all).
 *
 * One web feature usually covers several Chrome Status entries; `scheduler`
 * covers both `scheduler.postTask` and `scheduler.yield()`. The entry that
 * shipped first is taken as the primary one, since that is the one that
 * established the API, and `matches` records how many there were.
 */
import { logger } from '../logger.js';
const CHROME_STATUS_URL = "https://chromestatus.com/api/v0/features";

export async function collectChromiumPosition(spec) {
  try {
    const query = spec.webFeaturesId || spec.shortname;
    const res = await fetch(`${CHROME_STATUS_URL}?q=${encodeURIComponent(query)}`);

    if (!res.ok) {
      throw new Error(`Failed to fetch Chromium positions: HTTP ${res.status}`);
    }

    const body = await res.text();

    // remove XSSI prefix and parse JSON
    const data = JSON.parse(body.substring(body.indexOf('\n') + 1));

    const matches = (data.features || []).filter(f =>
      typeof f.web_feature === "string" &&
      f.web_feature.toLowerCase() === query.toLowerCase()
    );

    if (!matches.length) {
      return { status: "no-signal" };
    }

    // Earliest shipping year first, then whatever order the API gave.
    const [match] = [...matches].sort((a, b) =>
      (a.shipping_year ?? Infinity) - (b.shipping_year ?? Infinity)
    );

    return {
      featureId: match.id,
      name: match.name,
      intentStage: match.intent_stage,
      shipping_year: match.shipping_year,
      browsers: match.browsers,
      matches: matches.length
    };

  } catch (err) {
    logger.error(`[chromium] Error fetching chrome status data for ${spec.repo}: ${err.message}`);
    return { error: err.message };
  }
}