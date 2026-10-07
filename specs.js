/**
 * Resolves the entries of specs.json against browser-specs.
 */
import webSpecs from "web-specs" with { type: "json" };
import { logger } from "./logger.js";

// Track former shortname so that an old shortname used in specs.json can still be resolved
const byShortname = new Map();
const byFormerName = new Map();
for (const spec of webSpecs) {
  byShortname.set(spec.shortname, spec);
  for (const former of spec.formerNames ?? []) {
    byFormerName.set(former, spec);
  }
}

/**
 * The `owner/name` from the full GitHub repository URL
 *
 * @param {string | undefined} repository
 * @returns {string | null}
 */
export function githubRepo(repository) {
  if (!repository) return null;
  let url;
  try {
    url = new URL(repository);
  } catch {
    return null;
  }
  // TODO: Add support for repositories hosted on platforms other than GitHub
  if (url.hostname !== "github.com") return null;
  const path = url.pathname.replace(/^\//, "").replace(/\.git$/, "");
  return /^[^/]+\/[^/]+$/.test(path) ? path : null;
}

/**
 * Adds the URL and the repository from browser-specs to an entry from specs.json
 *
 * @param {object} entry
 * @returns {object | null} null when browser-specs doesn't know the shortname
 */
export function resolveSpec(entry) {
  const found = byShortname.get(entry.shortname) ?? byFormerName.get(entry.shortname);
  if (!found) return null;
  if (found.shortname !== entry.shortname) {
    logger.warn(`[specs] "${entry.shortname}" is a former shortname of "${found.shortname}" in browser-specs. Please rename it in specs.json`);
  }
  return {
    ...entry,
    url: found.nightly?.url ?? null,
    repo: githubRepo(found.nightly?.repository),
  };
}
