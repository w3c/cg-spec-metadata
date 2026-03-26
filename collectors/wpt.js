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
    const result = filtered.reduce(
      (acc, r) => {
        acc.count++;
        acc.total_combined += r.legacy_status.reduce((sum, s) => sum + s.total, 0);
        return acc;
      },
      { count: 0, total_combined: 0 }
    );

    return {
      hasResults: result.count > 0,
      tests: result.count,
      subtests: result.total_combined
    };
  } catch (err) {
    logger.error(`[WPT] Error fetching WPT data for ${spec.repo}: ${err.message}`);
    return { error: err.message };
  }
}