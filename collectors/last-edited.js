/**
 * Collector: when the specification document itself was last edited.
 *
 * This is deliberately not `github.lastCommitDate`. A commit that touches only
 * the README or the CI config moves the repository's date without editing the
 * document, and for a repository that publishes several documents the commit
 * date says nothing about which one changed. The HTTP `Last-Modified` of the
 * published document is the closest available answer, and for a multi-document
 * repository it is much closer: nav-speculation's prefetch.html reports
 * 2026-08-27 where the repository's last commit is 2026-05-14.
 *
 * Parsing the document is not an option: bikeshed bakes a `<time
 * class="dt-updated">` into its output, but ReSpec runs in the reader's
 * browser, so fetching a ReSpec spec server-side returns unprocessed source
 * with no date in it at all.
 *
 * Returns { date, source } rather than a bare date so that it is auditable
 * which specs have a real answer and which are falling back to an override.
 */
import { logger } from '../logger.js';

// A proxy that echoes the response time as Last-Modified would otherwise make
// every spec look edited today.
const CLOCK_SKEW_MS = 60 * 1000;

function toDate(value) {
  const date = new Date(value);
  return Number.isFinite(date.valueOf()) ? date : null;
}

async function head(url) {
  const res = await fetch(url, { method: "HEAD", redirect: "follow" });
  // Some hosts only implement GET; ask for a single byte rather than the page.
  if (res.status === 405) {
    return fetch(url, { headers: { Range: "bytes=0-0" }, redirect: "follow" });
  }
  return res;
}

export async function collectLastEdited(spec) {
  try {
    const res = await head(spec.url);

    if (!res.ok && res.status !== 206) {
      throw new Error(`HTTP ${res.status}`);
    }

    const lastModified = toDate(res.headers.get("last-modified"));
    if (!lastModified) {
      logger.warn(`[last-edited] ${spec.shortname}: no usable Last-Modified; set it in override.json`);
      return { date: null, source: "none" };
    }

    const now = Date.now();
    if (lastModified.valueOf() > now) {
      logger.warn(`[last-edited] ${spec.shortname}: Last-Modified is in the future; ignoring`);
      return { date: null, source: "none" };
    }

    // If the host is sending its own clock, Last-Modified tracks the response
    // rather than the document.
    const served = toDate(res.headers.get("date"));
    if (served && Math.abs(served.valueOf() - lastModified.valueOf()) < CLOCK_SKEW_MS) {
      logger.warn(`[last-edited] ${spec.shortname}: Last-Modified matches the response date; ignoring`);
      return { date: null, source: "none" };
    }

    return {
      date: lastModified.toISOString().slice(0, 10),
      source: "http-last-modified",
    };
  } catch (err) {
    logger.error(`[last-edited] Error determining the last edit date for ${spec.url}: ${err.message}`);
    return { error: err.message };
  }
}
