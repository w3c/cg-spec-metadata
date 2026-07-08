# Metadata reference

This document describes the metadata collected by this project for each Community Group specification. The pipeline reads the list of specs from `specs.json`, runs one collector per data source (see `collectors/`), merges the results with any manual corrections from `override.json`, and writes everything to `data.json`.

Every entry in `data.json` has the following top-level shape:

```json
{
  "shortname": "...",
  "specUrl": "...",
  "feature": "...",
  "github": { ... },
  "mozilla": { ... },
  "webkit": { ... },
  "chromium": { ... },
  "web_features": { ... },
  "web_features_mapping": [ ... ],
  "wpt": { ... },
  "substantiveContributionsLastYear": 0
}
```

**Error convention:** when a collector fails (network error, HTTP error, unexpected payload), its key contains `{ "error": "<message>" }` instead of the normal object.

---

## Input metadata (`specs.json`)

Each spec is declared with the following properties:

| Property | Type | Required | Description |
|---|---|---|---|
| `shortname` | string | yes | Unique identifier of the spec. Used as the merge key in `data.json` and `override.json`, as the CLI filter argument, and as the lookup key against Chrome Status and wpt.fyi. |
| `webFeaturesId` | string | yes | Feature identifier in the [web-features](https://github.com/web-platform-dx/web-features) dataset. Used by the `web_features`, `web_features_mapping` and (as fallback) `wpt` collectors. |
| `feature` | string | no | Sub-feature name for specs that cover several features (e.g. `prefetch` for `speculation-rules`). When present, the wpt.fyi query becomes `shortname/feature`. |
| `repo` | string | yes | GitHub repository in `owner/name` form (e.g. `WICG/file-system-access`). Used by the GitHub and substantive-contributions collectors. |
| `url` | string | yes | Canonical URL of the spec. Used to match entries in the Mozilla and WebKit standards-positions datasets. |

---

## Collected metadata

### `github` — GitHub repository activity

- **Source:** [GitHub REST API](https://api.github.com) (`GITHUB_TOKEN` recommended to raise rate limits)
- **Collector:** `collectors/github.js`
- **`null`** when the spec has no `repo` defined.

| Property | Type | Description |
|---|---|---|
| `stars` | number | Number of stargazers of the repository. |
| `forks` | number | Number of forks. |
| `openIssues` | number | Number of open issues (GitHub counts open PRs in this figure). |
| `openPRs` | number | Number of open pull requests. |
| `closedPRs` | number | Number of closed pull requests (merged or not). |
| `lastCommitDate` | string \| null | ISO 8601 date of the most recent commit on the default branch. |

### `mozilla` — Mozilla standards position

- **Source:** [mozilla/standards-positions](https://github.com/mozilla/standards-positions) (`merged-data.json`), matched by spec `url`
- **Collector:** `collectors/mozilla.js`

| Property | Type | Description |
|---|---|---|
| `issue` | string | URL of the position issue in the `mozilla/standards-positions` repository, or `"N/A"` if the spec has no entry. |
| `position` | string \| null | Mozilla's position on the spec. |

Possible values for `position`:

| Value | Meaning |
|---|---|
| `positive` | Mozilla regards the spec as a good addition to the web platform. |
| `neutral` | Mozilla is neither for nor against the spec. |
| `negative` | Mozilla considers the spec harmful to the web in its current form. |
| `defer` | Mozilla takes no position, e.g. because the spec is out of scope for them. |
| `null` | An issue exists but Mozilla has not yet stated a position. |
| `no-signal` | Added by this collector: the spec has no entry in the Mozilla dataset at all. |

### `webkit` — WebKit standards position

- **Source:** [WebKit/standards-positions](https://github.com/WebKit/standards-positions) (`summary.json`), matched by spec `url`
- **Collector:** `collectors/webkit.js`

| Property | Type | Description |
|---|---|---|
| `issue` | number \| string | Issue number in the `WebKit/standards-positions` repository, or `"N/A"` if the spec has no entry. |
| `position` | string \| null | WebKit's position on the spec. |

Possible values for `position`:

| Value | Meaning |
|---|---|
| `support` | WebKit supports the proposal. |
| `neutral` | WebKit is neither for nor against the proposal. |
| `oppose` | WebKit opposes the proposal in its current form. |
| `blocked` | The position is blocked on some other issue or dependency. |
| `null` | An issue exists but WebKit has not yet stated a position. |
| `no-signal` | Added by this collector: the spec has no entry in the WebKit dataset at all. |

### `chromium` — Chrome platform status

- **Source:** [Chrome Status API](https://chromestatus.com/api/v0/features), matched by spec `shortname` against the `web_feature` field
- **Collector:** `collectors/chromium.js`
- Returns `{ "status": "no-signal" }` when no Chrome Status feature matches the shortname.

| Property | Type | Description |
|---|---|---|
| `featureId` | number | Chrome Status feature identifier. |
| `name` | string | Feature name as displayed on chromestatus.com. |
| `intentStage` | string | Current stage of the feature in the Blink launch process. |
| `shipping_year` | number | Year the feature shipped (or is expected to ship) in Chrome. |
| `browsers` | object | Per-browser implementation status as reported by Chrome Status (see below). |

Possible values for `intentStage` (Blink launch process stages, as returned by the API):

| Value | Meaning |
|---|---|
| `None` | No intent stage recorded. |
| `Start incubating` | Initial incubation of the idea. |
| `Start prototyping` | Prototype implementation in progress. |
| `Dev trials` | Available for developer trials (typically behind a flag). |
| `Evaluate readiness to ship` | Iterating on implementation and gathering feedback before shipping. |
| `Origin Trial` | Available as an origin trial. |
| `Prepare to ship` | Intent to ship sent / approval in progress. |
| `Shipped` | Enabled by default in Chrome. |
| `Removed` | Feature was removed from Chrome. |

The `browsers` object contains one entry per browser (`chrome`, `ff`, `safari`, `webdev`, `other`):

- `browsers.chrome`: Chrome implementation details — tracking `bug` URL, `blink_components`, `owners`, `origintrial`/`flag`/`prefixed` booleans, per-platform shipping milestones (`desktop`, `android`, `webview`, `ios`) and a `status` object whose `text` reflects the implementation status on chromestatus.com (e.g. `Proposed`, `In development`, `Behind a flag`, `Origin trial`, `Enabled by default`, `Deprecated`, `Removed`, `No active development`, `No longer pursuing`).
- `browsers.ff` / `browsers.safari` / `browsers.webdev`: a `view` object summarizing the vendor or web-developer signal, with `text` (e.g. `Positive`, `Neutral`, `Negative`, `No signal`, `Defer`, `Oppose`, `Support`), a numeric `val`, and an optional `url` pointing to the corresponding standards-positions issue.

### `web_features` — web-features entry

- **Source:** [web-features](https://github.com/web-platform-dx/web-features) npm package (dataset maintained by the WebDX Community Group), keyed by `webFeaturesId`
- **Collector:** `collectors/web-features.js`
- **`null`** when the `webFeaturesId` is not found in the dataset.

The whole feature entry is stored verbatim. Main properties:

| Property | Type | Description |
|---|---|---|
| `name` | string | Human-readable feature name. |
| `description` / `description_html` | string | Short description of the feature (plain text / HTML). |
| `kind` | string | Type of entry: `feature` (a regular feature; `moved` and `split` exist in the dataset for redirected entries but are not expected here). |
| `group` | string[] | Feature group(s) the feature belongs to (e.g. `file-system`). |
| `spec` | string[] | URL(s) of the defining specification(s). |
| `caniuse` | string[] | Corresponding [caniuse.com](https://caniuse.com) feature identifier(s). |
| `compat_features` | string[] | Browser-compat-data (BCD) keys aggregated by this feature. |
| `status` | object | Baseline status and browser support (see below). |

The `status` object:

| Property | Type | Description |
|---|---|---|
| `baseline` | `false` \| `"low"` \| `"high"` | [Baseline](https://web.dev/baseline) status: `false` = limited availability (not supported in all core browsers), `"low"` = newly available in all core browsers, `"high"` = widely available (30+ months of support). |
| `baseline_low_date` / `baseline_high_date` | string | Dates the feature reached the corresponding Baseline status. |
| `support` | object | Minimum supporting version per browser. Keys: `chrome`, `chrome_android`, `edge`, `firefox`, `firefox_android`, `safari`, `safari_ios`. |
| `by_compat_key` | object | Same baseline/support structure broken down per BCD key. |

### `web_features_mapping` — cross-source mappings

- **Source:** [web-platform-dx/web-features-mappings](https://github.com/web-platform-dx/web-features-mappings) (`combined-data.json`), keyed by `webFeaturesId`
- **Collector:** `collectors/web-features-mapping.js`
- Stored as a two-element array `[webFeaturesId, mappings]`; `{}` when the id is not found.

The `mappings` object links the feature to external resources. Possible keys (each present only when data exists):

| Key | Type | Description |
|---|---|---|
| `wpt` | object | `url` to the wpt.fyi results filtered on this feature (`?q=feature:<id>`). |
| `standards-positions` | array | Vendor positions: `vendor` (`mozilla` or `apple`), issue `url`, `position` (same value sets as the `mozilla`/`webkit` sections above) and a list of `concerns` (e.g. `security`, `privacy`). |
| `mdn-docs` | array | Related MDN pages: `slug`, `title`, optional `anchor`, and full `url`. |
| `state-of-surveys` | array | Mentions of the feature in State of JS / State of HTML / State of CSS surveys: survey `name`, `url`, `question`, `subQuestion`, and the `path` to the data point in the survey's data API. |
| `chrome-use-counters` | object | Chrome usage metrics: `percentageOfPageLoad` (fraction of page loads using the feature) and the chromestatus.com timeline `url`. |
| `developer-signals` | object | Aggregated developer sentiment signals about the feature. |
| `bugs` | object | Related browser bug tracker entries. |

### `wpt` — web-platform-tests coverage

- **Source:** [wpt.fyi search API](https://wpt.fyi/api/search) on the `master` label; the query is `shortname/feature` when `feature` is set, otherwise `webFeaturesId`, and results are restricted to test paths under `/<query>/`
- **Collector:** `collectors/wpt.js`

| Property | Type | Description |
|---|---|---|
| `hasResults` | boolean | Whether at least one test exists for the spec. |
| `tests` | number | Number of test files matching the query. |
| `subtests` | number | Combined number of subtests across all matching tests and browsers. |

### `substantiveContributionsLastYear` — recent substantive contributors

- **Source:** [W3C Repo Manager API](https://labs.w3.org/repo-manager/) (`/api/repos/<repo>/contributors`)
- **Collector:** `collectors/substantive-contributions.js`

A single number: the count of substantive contributors who had at least one pull request updated in the last 12 months. This is an indicator of active, IPR-relevant participation in the spec's repository.

---

## Manual overrides (`override.json`)

An array of objects keyed by `shortname`. Any property present in an override entry is deep-merged over the automatically collected data before `data.json` is written, allowing corrections when a source is wrong or missing:

```json
[
  {
    "shortname": "file-system-access",
    "mozilla": { "position": "positive" }
  }
]
```
