/**
 * Projects a collected spec entry into the small, stable shape that published
 * specification documents read at load time (see cg-assets/js/cg-metadata.js).
 *
 * Why a projection rather than the raw entry:
 *
 *  - A published document is an immortal client. "Chrome has shipped this" is
 *    currently expressed as "a `chrome` key exists under
 *    web_features.status.support", because that dataset has no false/null
 *    sentinel. If web-features ever adds one, every document published against
 *    the raw shape renders wrong and cannot be patched. Deriving here means one
 *    commit instead.
 *  - Size, and the injection surface. The raw entry is ~26 KB, most of it
 *    by_compat_key and Chrome Status prose that no document renders. Projecting
 *    drops every third-party free-text field (description_html, chromium.name,
 *    chrome-status summary/motivation) off the wire entirely.
 *
 * Every key is always present. `null` means "not known" and tells the document
 * to keep whatever its generator baked in; a value that is known to be empty is
 * an explicit string such as "None".
 */

export const FORMAT_VERSION = 1;

// A browser column, the web-features support key that says it has shipped, and
// the standards-position collector to fall back on. Chromium-based columns have
// no position source.
const BROWSERS = [
  { column: "chrome",  supportKey: "chrome",  position: null },
  { column: "edge",    supportKey: "edge",    position: null },
  { column: "firefox", supportKey: "firefox", position: "mozilla" },
  { column: "webkit",  supportKey: "safari",  position: "webkit" },
];

// Which engine each web-features support key belongs to. Counting engines
// rather than browsers is what "two implementations" means in a standards
// context: Chrome and Edge are both Blink, so they are one implementation.
const ENGINES = {
  chrome: "blink",
  chrome_android: "blink",
  edge: "blink",
  firefox: "gecko",
  firefox_android: "gecko",
  safari: "webkit",
  safari_ios: "webkit",
};

// The rendered label for every documented position value. Mozilla and WebKit
// use different words for the same stances, and "no-signal" is the collectors'
// own marker for "this spec is absent from the dataset", where `issue` is the
// string "N/A" rather than a URL.
const POSITION_LABELS = {
  positive: "Supportive",
  support: "Supportive",
  neutral: "Neutral",
  defer: "Deferred",
  negative: "Opposed",
  oppose: "Opposed",
  blocked: "Blocked",
  "no-signal": "Unknown",
};

const isObject = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const ok = (v) => (isObject(v) && !v.error ? v : {});
const firstOf = (v) => (Array.isArray(v) && v.length ? v[0] : null);
const issueUrl = (v) => (typeof v === "string" && v.startsWith("http") ? v : null);

/** The second element of web_features_mapping is the mapping object. */
function mapping(spec) {
  return Array.isArray(spec.web_features_mapping) ? ok(spec.web_features_mapping[1]) : {};
}

function support(spec) {
  const versions = ok(ok(ok(spec.web_features).status).support);
  const out = {};

  for (const { column, supportKey, position } of BROWSERS) {
    if (versions[supportKey]) {
      out[column] = { state: "shipped", label: "Shipped", url: null };
      continue;
    }

    if (!position) {
      // No position dataset covers the Chromium-based browsers.
      out[column] = { state: "unknown", label: "Unknown", url: null };
      continue;
    }

    const source = ok(spec[position]);
    // A stated position of `null` means the issue exists but says nothing yet.
    const state = source.position === undefined ? "no-signal" : source.position;
    out[column] = {
      state: state === null ? "unknown" : state,
      label: state === null ? "Unknown" : (POSITION_LABELS[state] ?? "Unknown"),
      url: state === "no-signal" ? null : issueUrl(source.issue),
    };
  }
  return out;
}

/**
 * The progress-bar state: the 0-based index of the last of cg-program's four
 * spec-lifecycle.md states that the work has *completed*. A document ticks
 * every step up to and including it, and shows the one after it, if there is
 * one, as where the work stands now.
 *
 *   0  Early idea completed                   no implementation
 *   1  Implementer experimentation completed  one engine has shipped it
 *   2  Partial availability completed         two or more engines have shipped it
 *   3  Standardization started completed      never computed; some or all of the
 *                                             spec is in a standards body, which
 *                                             no collector can see. Set it in
 *                                             override.json.
 *
 * An override wins outright, which is also the only way to reach 3 or to walk
 * a specification back to an earlier state after material has been transferred
 * (spec-lifecycle.md allows a group to do that deliberately).
 */
function progress(spec) {
  if (Number.isInteger(spec.progress)) return spec.progress;

  const versions = ok(ok(ok(spec.web_features).status).support);
  const engines = new Set();
  for (const key of Object.keys(versions)) {
    if (versions[key] && ENGINES[key]) engines.add(ENGINES[key]);
  }
  return Math.min(engines.size, 2);
}

/** Where a reader should go for per-browser compatibility detail. */
function compatDataUrl(spec) {
  const caniuse = firstOf(ok(spec.web_features).caniuse);
  if (caniuse) return `https://caniuse.com/${caniuse}`;

  const mdn = firstOf(mapping(spec)["mdn-docs"]);
  return mdn && mdn.url ? `${mdn.url}#browser_compatibility` : null;
}

/**
 * @param spec  the merged entry from data.json
 * @param input the matching specs.json entry, if any. specUrl and repo are
 *              static inputs rather than collected data, so reading them from
 *              here keeps a re-projection of older data.json entries correct.
 */
function cgStatus(spec) {
  if (spec.cgStatus) return spec.cgStatus;
  const group = ok(spec.w3cGroup);
  if (typeof group.isClosed !== "boolean") return null;
  return group.isClosed ? "Closed" : "Open";
}

function incubatingGroup(spec) {
  if (isObject(spec.incubatingGroup)) return spec.incubatingGroup;
  const group = ok(spec.w3cGroup);
  if (!group.name) return null;
  return { name: group.name, url: group.url ?? null, joinUrl: group.joinUrl ?? null };
}

// The wording is built here, not in a published document that can never be
// updated to reword it.
function stability(spec) {
  if (spec.stability) return spec.stability;

  const changes = ok(spec.contributions).substantiveChangesLastYear;
  if (!Number.isInteger(changes)) return null;

  return `${changes} substantive change${changes === 1 ? "" : "s"} in the past year.`;
}

function contributions(spec, input) {
  const repo = spec.repo ?? input.repo ?? null;
  const url = repo ? `https://labs.w3.org/repo-manager/repos/${repo}/contributors` : null;

  const substantive = ok(ok(spec.contributions).substantive);
  if (!Number.isInteger(substantive.contributions)) return null;

  return {
    count: substantive.contributions,
    contributors: substantive.contributors ?? null,
    url: url,
  };
}

export function project(spec, input = {}) {
  const github = ok(spec.github);
  const wpt = ok(spec.wpt);
  const signals = ok(mapping(spec)["developer-signals"]);
  const chromeStatus = firstOf(mapping(spec)["chrome-status"]);
  const lastEdited = ok(spec.lastEdited);

  return {
    formatVersion: FORMAT_VERSION,
    shortname: spec.shortname,
    collectedAt: spec.collectedAt ?? null,

    specUrl: spec.specUrl ?? input.url ?? null,
    lastEdited: { date: lastEdited.date ?? null, source: lastEdited.source ?? null },

    support: support(spec),

    github: {
      stars: github.stars ?? null,
      starsUrl: (spec.repo ?? input.repo)
        ? `https://github.com/${spec.repo ?? input.repo}/stargazers`
        : null,
      // The document renders a date, not a timestamp.
      lastCommitDate: typeof github.lastCommitDate === "string"
        ? github.lastCommitDate.slice(0, 10)
        : null,
    },

    wpt: {
      tests: wpt.tests ?? null,
      // wpt.subtests is summed across browser runs, and the run count is not
      // collected, so the per-run figure a document wants is not derivable yet.
      subtests: null,
      url: mapping(spec).wpt?.url ?? null,
    },

    developerSignals: { votes: signals.votes ?? null, url: signals.url ?? null },
    chromeStatus: {
      // No sentiment is collected for Chrome Status; see collectors/chromium.js.
      label: null,
      url: chromeStatus?.url ?? null,
    },
    compatDataUrl: compatDataUrl(spec),

    // Editorial, and authored rather than collected. Emitted so that the shape
    // is stable and a document can tell "not known" from "known to be empty".
    progress: progress(spec),
    cgStatus: cgStatus(spec),
    incubatingGroup: incubatingGroup(spec),
    standardizationPlan: isObject(spec.standardizationPlan) ? spec.standardizationPlan : null,
    stability: stability(spec),
    contributions: contributions(spec, input),
    experimentationStatus: spec.experimentationStatus ?? null,
  };
}
