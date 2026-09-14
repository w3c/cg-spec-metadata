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
    progress: spec.progress ?? null,
    cgStatus: spec.cgStatus ?? null,
    incubatingGroup: isObject(spec.incubatingGroup) ? spec.incubatingGroup : null,
    standardizationPlan: isObject(spec.standardizationPlan) ? spec.standardizationPlan : null,
    stability: spec.stability ?? null,
    contributions: isObject(spec.contributions) ? spec.contributions : null,
    experimentationStatus: spec.experimentationStatus ?? null,
  };
}
