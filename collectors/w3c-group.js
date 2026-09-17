/**
 * Collector: the Community Group that produces the specification, and whether
 * it is still open.
 *
 * `specs.json` may declare `group` to skip the first step, either as the
 * numeric id or as the shortname ("wicg"). That is the escape hatch for a
 * repository with no `w3c.json`, and it wins when present.
 */
import { logger } from '../logger.js';

const API = "https://api.w3.org/groups";

const groupCache = new Map();
const repoCache = new Map();

/** The numeric group id recorded in the repository's w3c.json, if any. */
async function groupFromRepo(repo) {
  if (repoCache.has(repo)) return repoCache.get(repo);

  let group = null;
  try {
    // HEAD rather than a branch name: repositories differ on main vs master.
    const res = await fetch(`https://raw.githubusercontent.com/${repo}/HEAD/w3c.json`);
    if (res.ok) {
      const json = await res.json();
      const ids = Array.isArray(json.group) ? json.group : [json.group];
      const id = ids.find(value => Number.isInteger(value) || /^\d+$/.test(value));
      if (id !== undefined) group = Number(id);
    }
  } catch (err) {
    logger.warn(`[w3c-group] Could not read w3c.json for ${repo}: ${err.message}`);
  }

  repoCache.set(repo, group);
  return group;
}

async function fetchGroup(group) {
  if (groupCache.has(group)) return groupCache.get(group);

  // The API takes either a numeric id or a type-qualified shortname.
  const path = /^\d+$/.test(String(group)) ? `${API}/${group}` : `${API}/cg/${group}`;
  const res = await fetch(path);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);

  const data = await res.json();
  groupCache.set(group, data);
  return data;
}

export async function collectW3CGroup(spec) {
  try {
    const group = spec.group ?? (spec.repo ? await groupFromRepo(spec.repo) : null);
    if (group === null || group === undefined) {
      logger.warn(`[w3c-group] No group for ${spec.shortname}; set "group" in specs.json`);
      return { id: null, shortname: null, name: null, isClosed: null, url: null, joinUrl: null };
    }

    const data = await fetchGroup(group);
    const links = data._links || {};
    return {
      id: data.id ?? null,
      shortname: data.shortname ?? null,
      name: data.name ?? null,
      // The one thing a reader is told: is this group still running?
      isClosed: typeof data.is_closed === "boolean" ? data.is_closed : null,
      url: (links.homepage || {}).href ?? null,
      joinUrl: (links.join || {}).href ?? null,
    };
  } catch (err) {
    logger.error(`[w3c-group] Error fetching the W3C group for ${spec.shortname}: ${err.message}`);
    return { error: err.message };
  }
}
