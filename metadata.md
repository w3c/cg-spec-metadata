# Metadata reference

This document describes the metadata collected by this project for each Community Group specification. The pipeline reads the list of specs from `specs.json`, runs one collector per data source (see `collectors/`), merges the results with any manual corrections from `override.json`, and writes two outputs:

- **`data.json`** — the raw archive. One array entry per spec, everything every collector returned.
- **`specs/<shortname>.json`** — a small, format-versioned *projection* of one spec, for published
  specification documents to read at load time (see
  [`w3c/cg-assets`](https://github.com/w3c/cg-assets)). It carries one field per value a document
  renders, with every derivation already applied. See [Projected metadata](#projected-metadata).

Every entry in `data.json` has the following top-level shape:

```json
{
  "shortname": "...",
  "specUrl": "...",
  "repo": "...",
  "feature": "...",
  "collectedAt": "2026-08-24T00:12:03.114Z",
  "github": { ... },
  "mozilla": { ... },
  "webkit": { ... },
  "chromium": { ... },
  "web_features": { ... },
  "web_features_mapping": [ ... ],
  "wpt": { ... },
  "substantiveContributionsLastYear": 0,
  "contributions": { ... },
  "lastEdited": { ... },
  "w3cGroup": { ... }
}
```

`specUrl`, `repo` and `collectedAt` are copied from `specs.json` (or stamped) when a spec is
collected, so an entry that has not been collected since they were introduced will not have them
yet. `collectedAt` is stamped per entry at collection time, not when the file is written, so a
targeted run (`node index.js <shortname>`) leaves the timestamps of the other specs alone.

**Error convention:** when a collector fails (network error, HTTP error, unexpected payload), its key contains `{ "error": "<message>" }` instead of the normal object.

**Overrides:** `override.json` is matched on `shortname` and deep-merged over the collected result
by `mergeResultsWithOverride` in `utils.js`, so it can correct any nested value and can also *add*
keys that no collector produces. Two things to know: **arrays are replaced wholesale, never
merged** — an override that touches `web_features_mapping` must supply the entire two-element array
— and there is no way to delete a key, only to set it to `null` or `""`.

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
| `group` | number \| string | no | W3C group, as the numeric id or the shortname (`wicg`). Only needed when the repository has no `w3c.json` to read it from; see [`w3cGroup`](#w3cgroup--the-community-group). |

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

### `contributions` — W3C Repo Manager contributions

- **Source:** [W3C Repo Manager API](https://labs.w3.org/repo-manager/) (`/api/repos/<repo>/contributors`)
- **Collector:** `collectors/contributions.js`

```json
{
  "substantive":    { "contributions": 31, "contributors": 2 },
  "nonSubstantive": { "contributions": 3,  "contributors": 3 },
  "substantiveContributorsLastYear": 0
}
```

The API returns two maps keyed by W3C identity, each holding that contributor's pull requests:

```json
{ "substantiveContributors": {
    "35662": { "name": "Google LLC",
               "prs": [ { "num": "100", "lastUpdated": "Sat Sep 07 2024" } ] } } }
```

A "contributor" is an organization as often as a person — `Google LLC`, `Igalia`, `John Doe` — so
both the pull requests and the contributors who landed them are counted.

`substantiveContributorsLastYear` counts the contributors with at least one pull request touched in
the last 12 months.

### `substantiveContributionsLastYear` — recent substantive contributors

- **Collector:** `collectors/contributions.js` (same response, cached per repository)

A single number, and a misnomer: the name says contributions but the value has always been a count
of *contributors*. It is the same figure as `contributions.substantiveContributorsLastYear`, kept
so that existing consumers of `data.json` keep working. Prefer the one inside `contributions`.

### `w3cGroup` — the Community Group

- **Source:** the repository's own `w3c.json`, resolved against the [W3C API](https://api.w3.org/groups)
- **Collector:** `collectors/w3c-group.js`

```json
{
  "id": 80485,
  "shortname": "wicg",
  "name": "Web Platform Incubator Community Group",
  "isClosed": false,
  "url": "https://www.w3.org/community/wicg/",
  "joinUrl": "https://www.w3.org/community/wicg/join"
}
```

The collector reads `https://raw.githubusercontent.com/<repo>/HEAD/w3c.json`, which W3C repositoriescarry
carry and which records the group by numeric id, then asks the API about that id.

`specs.json` may declare `group` to skip the first step — as the numeric id or the shortname — and
it wins when present. That is the escape hatch for a repository with no `w3c.json`. When neither is
available every field is `null` and the collector logs what to do about it.

`isClosed` is what the *Community Group status* row renders: `false` → `Open`, `true` → `Closed`.
Responses are cached per group and per repository for the length of a run, so a dozen specs from
one Community Group cost one API request.

### `lastEdited` — when the document itself was last edited

- **Source:** the HTTP `Last-Modified` of `specs.json`'s `url`
- **Collector:** `collectors/last-edited.js`

```json
{ "date": "2025-05-30", "source": "http-last-modified" }
```

`date` is `YYYY-MM-DD`, or `null` when no trustworthy answer was available, in which case `source`
is `"none"` and the value should be supplied through `override.json`.

This is deliberately **not** `github.lastCommitDate`. A commit that touches only the README or the
CI config moves the repository's date without editing the document, and for a repository that
publishes several documents the commit date says nothing about which one changed — for
`speculation-rules` the two currently differ by fifteen months. The header is rejected when it is
in the future, or within a minute of the response `Date` (some proxies echo their own clock).

Parsing the document is not an option: bikeshed bakes a `<time class="dt-updated">` into its
output, but ReSpec runs in the reader's browser, so fetching a ReSpec spec server-side returns
unprocessed source with no date in it at all.

---

## Projected metadata (`specs/<shortname>.json`)

One file per spec, rewritten on every run, holding exactly what a published specification document
renders. `index.js` prunes files for specs that are no longer in `specs.json`.

Three properties of this shape are deliberate:

- **`formatVersion`.** A published document is a client that can never be updated. It refuses a
  version it does not recognise and falls back to the values its generator baked in, which is the
  only way this shape can ever change.
- **Derivations are already applied.** "Chrome has shipped this" is currently expressed in
  `web_features` as "a `chrome` key exists under `status.support`", because that dataset has no
  `false`/`null` sentinel. If it ever gains one, deriving here means one commit rather than every
  document published to date rendering the wrong thing.
- **`null` means "not known".** A document keeps whatever its generator baked in. A value that is
  known to be empty is an explicit string such as `"None"`. Every key is always present.

The projection also drops every third-party free-text field — `web_features.description_html`,
`chromium.name`, Chrome Status `summary` and `motivation` — so no prose from another source reaches
a document. That takes a ~26 KB entry down to ~1.2 KB.

```json
{
  "formatVersion": 1,
  "shortname": "scheduling-apis",
  "collectedAt": "2026-08-24T00:12:03.114Z",
  "specUrl": "https://wicg.github.io/scheduling-apis/",
  "lastEdited": { "date": "2025-05-30", "source": "http-last-modified" },
  "support": {
    "chrome":  { "state": "shipped", "label": "Shipped", "url": null },
    "edge":    { "state": "shipped", "label": "Shipped", "url": null },
    "firefox": { "state": "shipped", "label": "Shipped", "url": null },
    "webkit":  { "state": "unknown", "label": "Unknown",
                 "url": "https://github.com/WebKit/standards-positions/issues/361" }
  },
  "github": { "stars": 925, "starsUrl": "...", "lastCommitDate": "2025-05-30" },
  "wpt": { "tests": 114, "subtests": null, "url": "..." },
  "developerSignals": { "votes": 17, "url": "..." },
  "chromeStatus": { "label": null, "url": "..." },
  "compatDataUrl": "...",

  "progress": 2,
  "cgStatus": "Open",
  "incubatingGroup": { "name": "...", "url": "...", "joinUrl": "..." },
  "standardizationPlan": null,
  "stability": null,
  "contributions": { "count": 31, "contributors": 2, "url": "..." },
  "experimentationStatus": null
}
```

### `support` — the per-browser cells

A browser has shipped when its key is present in `web_features.status.support`
(`chrome`, `edge`, `firefox`, and `safari` for the WebKit column). Otherwise the standards-position
collectors supply the label; the Chromium-based columns have no position source, so they fall back
to `Unknown` without a link.

| position | label |
|---|---|
| `positive`, `support` | Supportive |
| `neutral` | Neutral |
| `defer` | Deferred |
| `negative`, `oppose` | Opposed |
| `blocked` | Blocked |
| `null` (issue open, no position stated) | Unknown |
| `no-signal` (spec absent from the dataset) | Unknown, and unlinked — `issue` is `"N/A"` |

`chromium` is **not** used here. Its collector matches Chrome Status on `shortname` rather than
`webFeaturesId`, so a spec whose id differs (`scheduling-apis` → `scheduler`) misses entirely; and
where it does match it returns one arbitrary sub-feature, which for `file-system-access` reports
Chrome as `Proposed` although it shipped in Chrome 86.

### `progress` — the progress-bar state

The 0-based index of the last of the four states defined in cg-program's
[spec-lifecycle.md](https://github.com/w3c/cg-program/blob/main/proposals/spec-lifecycle.md#progress-bar)
that the work has **completed**, derived from how many **engines** have shipped the feature:

| value | last completed state | rule |
|---|---|---|
| `0` | Early idea | no implementation |
| `1` | Implementer experimentation | one engine has shipped it |
| `2` | Partial availability | two or more engines have shipped it |
| `3` | Standardization started | never computed — set it in `override.json` |

A document ticks every step up to and including this one, and shows the step after it, if there is
one, as where the work stands now. So `2` renders *Early idea*, *Implementer experimentation* and
*Partial availability* as completed, with *Standardization started* as the current step; `3`
completes the bar and leaves no current step.

Engines, not browsers: Chrome and Edge are both Blink, so a feature shipping in both is *one*
implementation. The count comes from the keys present in `web_features.status.support`, mapped
`chrome` / `chrome_android` / `edge` → Blink, `firefox` / `firefox_android` → Gecko,
`safari` / `safari_ios` → WebKit.

An override wins outright. That is the only way to reach `3`, which means some or all of the
specification is undergoing standardization somewhere no collector can see; it is also how a group
walks a specification back to an earlier state after transferring material, which
spec-lifecycle.md explicitly allows.

### Fields that are authored, not collected

`standardizationPlan`, `stability` and `experimentationStatus` have no source. They are group
decisions — the plan to take the work to a standards body, the stability sentence — and are
supplied through `override.json` until they have a home of their own.

`cgStatus` and `incubatingGroup` are derived from [`w3cGroup`](#w3cgroup--the-community-group),
and `contributions` from [`contributions`](#contributions--w3c-repo-manager-contributions); an
entry in `override.json` still wins over a derived value.
They are emitted as `null` so that the shape is stable and a document can tell "not known" from
"known to be empty".

`wpt.subtests` is `null` for a different reason: the collected `wpt.subtests` is summed across
browser runs and the run count is not collected, so the per-run figure a document wants is not yet
derivable.

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
