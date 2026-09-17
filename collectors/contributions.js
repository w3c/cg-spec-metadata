/**
 * Collector: W3C Repo Manager contributions.
 *
 * https://labs.w3.org/repo-manager/api/repos/<repo>/contributors returns two
 * maps, `substantiveContributors` and `nonSubstantiveContributors`:
 *
 *   { "35662": { "name": "Google LLC",
 *                "prs": [ { "num": "100", "lastUpdated": "Sat Sep 07 2024" } ] } }
 */
import { logger } from '../logger.js';

const API = "https://labs.w3.org/repo-manager/api/repos";

const cache = new Map();

async function fetchContributors(repo) {
  if (!cache.has(repo)) {
    const url = `${API}/${repo}/contributors`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`W3C Repo Manager responded with HTTP ${response.status} for ${url}`);
    }
    cache.set(repo, await response.json());
  }
  return cache.get(repo);
}

function tally(group) {
  const contributors = Object.values(group || {});
  return {
    contributions: contributors.reduce(
      (total, contributor) => total + (Array.isArray(contributor.prs) ? contributor.prs.length : 0),
      0
    ),
    contributors: contributors.length,
  };
}

function withinLastYear(pr) {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const date = new Date(pr.lastUpdated);
  return !isNaN(date) && date >= oneYearAgo;
}

// The changes themselves, not the people who made them.
function changesLastYear(group) {
  return Object.values(group || {})
    .flatMap((contributor) => (Array.isArray(contributor.prs) ? contributor.prs : []))
    .filter(withinLastYear).length;
}

function activeLastYear(group) {
  return Object.values(group || {}).filter((contributor) => {
    if (!Array.isArray(contributor.prs)) return false;
    return contributor.prs.some(withinLastYear);
  }).length;
}

export async function collectContributions(spec) {
  try {
    const data = await fetchContributors(spec.repo);
    return {
      substantive: tally(data.substantiveContributors),
      nonSubstantive: tally(data.nonSubstantiveContributors),
      substantiveChangesLastYear: changesLastYear(data.substantiveContributors),
      substantiveContributorsLastYear: activeLastYear(data.substantiveContributors),
    };
  } catch (err) {
    logger.error(`[contributions] Error fetching contributors for ${spec.repo}: ${err.message}`);
    return { error: err.message };
  }
}

export async function collectRecentSubstantiveContributions(spec) {
  try {
    const data = await fetchContributors(spec.repo);
    return activeLastYear(data.substantiveContributors);
  } catch (err) {
    logger.error(`[contributions] Error fetching contributors for ${spec.repo}: ${err.message}`);
    return { error: err.message };
  }
}
