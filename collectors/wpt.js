/**
 * Collector: WPT results from wpt.fyi, based on the data from the wpt.fyi API.
 */
import { logger } from '../logger.js';
const WPT_FYI_URL = "https://wpt.fyi/api/search";

export async function collectWPTFyi(spec) {
  try {
    const query = spec.feature
      ? spec.shortname + (spec.feature ? `/${spec.feature}` : "")
      : spec.webFeaturesId;
    const url = `${WPT_FYI_URL}?label=master&q=${encodeURIComponent(query)}`;

    const res = await fetch(url);
    if (!res.ok) {
      return { error: `HTTP ${res.status}` };
    }

    const data = await res.json();

    const filtered = data.results.filter(r => r.test.startsWith(`/${query}/`));

    // legacy_status holds one entry per browser run, in the order of data.runs,
    // and a run that did not execute a test reports a total of 0. The number of
    // subtests is a property of the test, so it is the largest total any run
    // saw -- summing across runs multiplies it by however many browsers happened
    // to have results that day.
    const subtests = filtered.reduce((total, r) => {
      const totals = (r.legacy_status || []).map(s => s.total || 0);
      return total + (totals.length ? Math.max(...totals) : 0);
    }, 0);

    return {
      hasResults: filtered.length > 0,
      tests: filtered.length,
      subtests: subtests,
      runs: Array.isArray(data.runs) ? data.runs.length : null
    };
  } catch (err) {
    logger.error(`[WPT] Error fetching WPT data for ${spec.repo}: ${err.message}`);
    return { error: err.message };
  }
}