/**
 * Collector: W3C Repo Manager – Substantive Contributors (last 12 months)
 */
import { logger } from '../logger.js';
const W3C_REPO_MANAGER_BASE =
  "https://labs.w3.org/repo-manager/api/repos";

async function fetchSubstantiveContributors(repo) {
  const url = `${W3C_REPO_MANAGER_BASE}/${repo}/contributors`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `W3C Repo Manager responded with HTTP ${response.status} for ${url}`
    );
  }

  const contributors = await response.json();

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

   const substantiveCount = Object.values(contributors.substantiveContributors).filter(
    (contributor) => {
      if (!Array.isArray(contributor.prs)) return false;
 
      return contributor.prs.some((pr) => {
        const date = new Date(pr.lastUpdated);
        return !isNaN(date) && date >= oneYearAgo;
      });
    }
  ).length;

  return substantiveCount;
}

export async function collectRecentSubstantiveContributions(spec) {

  try {
    return await fetchSubstantiveContributors(spec.repo);
  } catch (err) {
    logger.error(`[w3c-contributors] Error fetching contributors for ${spec.repo}: ${err.message}`);
    return { error: err.message };
  }
}