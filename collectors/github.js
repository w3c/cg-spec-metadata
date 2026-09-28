/**
 * Collector: GitHub Repository Metadata (stars, forks, open issues, PRs, last
 * commit date)
 */
import { logger } from '../logger.js';

async function githubFetch(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }),
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub API responded with HTTP ${response.status} for ${url}`);
  }
  return response.json();
}

let hasWarned = false;

export async function collectGithubMetadata(spec) {
  if (!spec.repo) return null;
  if (!process.env.GITHUB_TOKEN && !hasWarned) {
    logger.warn("[github] GITHUB_TOKEN is not set — API requests may be rate-limited");
    hasWarned = true;
  }
  try {
    const GITHUB_API_REPO_URL = `https://api.github.com/repos/${spec.repo}`;
    const OPEN_PR_URL = `https://api.github.com/search/issues?q=repo:${spec.repo}+type:pr+state:open`;
    const CLOSED_PR_URL = `https://api.github.com/search/issues?q=repo:${spec.repo}+type:pr+state:closed`;
    const COMMITS_URL = `${GITHUB_API_REPO_URL}/commits?per_page=1`;

    const repo = await githubFetch(GITHUB_API_REPO_URL);
    const openPRs = await githubFetch(OPEN_PR_URL);
    const closedPRs = await githubFetch(CLOSED_PR_URL);
    const commits = await githubFetch(COMMITS_URL);

    return {
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      openIssues: repo.open_issues_count,
      openPRs: openPRs.total_count ?? 0,
      closedPRs: closedPRs.total_count ?? 0,
      lastCommitDate: commits[0]?.commit?.committer?.date || null
    };
  } catch (err) {
    logger.error(`[github] Error fetching github data for ${spec.repo}: ${err.message}`);
    return { error: err.message };
  }
}