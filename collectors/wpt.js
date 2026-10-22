/**
 * Collector: WPT results from wpt.fyi, based on the data from the wpt.fyi API.
 */
import { logger } from '../logger.js';
const WPT_FYI_URL = "https://wpt.fyi/api/search";

/**
 * wpt.fyi search
 *
 * @param {string} path directory in web-platform-tests
 * @returns {Promise<{results: object[], runs: number | null}>}
 */
async function searchPath(path) {
  const url = `${WPT_FYI_URL}?label=master&q=${encodeURIComponent(path)}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const data = await res.json();

  return {
    results: data.results.filter(r => r.test.startsWith(`/${path}/`)),
    runs: Array.isArray(data.runs) ? data.runs.length : null,
  };
}

export async function collectWPTFyi(spec) {
  // browser-specs names the web-platform-tests directories of a spec
  // It doesn't know them for all specs so the web-features id stays the
  // default.
  // Also take `excludePaths` into account when filtering the test results
  const paths = spec.tests?.testPaths?.length ? spec.tests.testPaths : [spec.webFeaturesId];
  const excluded = spec.tests?.excludePaths ?? [];

  try {
    const searches = await Promise.all(paths.map(searchPath));

    // Two of the paths can report the same test, so key them by name to count
    // it once.
    const tests = new Map();
    for (const { results } of searches) {
      for (const result of results) {
        if (excluded.some(path => result.test.startsWith(`/${path}/`))) continue;
        tests.set(result.test, result);
      }
    }

    // legacy_status holds one entry per browser run, in the order of data.runs,
    // and a run that did not execute a test reports a total of 0. The number of
    // subtests is a property of the test, so it is the largest total any run
    // saw -- summing across runs multiplies it by however many browsers happened
    // to have results that day.
    const subtests = [...tests.values()].reduce((total, r) => {
      const totals = (r.legacy_status || []).map(s => s.total || 0);
      return total + (totals.length ? Math.max(...totals) : 0);
    }, 0);

    const runs = searches.map(s => s.runs).filter(count => count !== null);

    return {
      hasResults: tests.size > 0,
      tests: tests.size,
      subtests: subtests,
      runs: runs.length ? Math.max(...runs) : null
    };
  } catch (err) {
    logger.error(`[WPT] Error fetching WPT data for ${spec.shortname}: ${err.message}`);
    return { error: err.message };
  }
}
