/**
 * Collector: WebKit's standards positions, based on the data from the standards-positions repository, which is maintained by the WebKit team.
 */
import { logger } from '../logger.js';
const WEBKIT_JSON_URL =
  "https://raw.githubusercontent.com/WebKit/standards-positions/main/summary.json";

let cache = null;

async function fetchWebkitPositions() {
  if (!cache) {
    const res = await fetch(WEBKIT_JSON_URL);

    if (!res.ok) {
      throw new Error(`Failed to fetch WebKit positions: HTTP ${res.status}`);
    }

    cache = await res.json();
  }
  return cache;
}

export async function collectWebkitPosition(spec) {
  try {
    const data = await fetchWebkitPositions();

    const entry = data.find(e => e.url === spec.url);

    return {
        issue: entry ? entry.id : "N/A",
        position: entry ? entry.position : "no-signal"
    };
  } catch (err) {
    logger.error(`[webkit] Error fetching Webkit standards position for ${spec.repo}: ${err.message}`);
    return { error: err.message };
  }
}