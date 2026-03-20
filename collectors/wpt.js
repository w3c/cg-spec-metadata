const WPT_FYI_URL = "https://wpt.fyi/api/search";

export async function collectWPTFyi(spec) {
  try {
    const query = spec.wfShortname
      ? spec.wfShortname
      : spec.shortname + (spec.feature ? `/${spec.feature}` : "");
    const url = `${WPT_FYI_URL}?label=master&q=${encodeURIComponent(query)}`;

    const res = await fetch(url);
    if (!res.ok) {
      return { error: `HTTP ${res.status}` };
    }

    const data = await res.json();

    const count = Array.isArray(data.results) ? data.results.length : 0;

    return {
      hasResults: count > 0,
      resultCount: count
    };
  } catch (e) {
    return { error: e.message };
  }
}