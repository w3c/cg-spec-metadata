/**
 * Replaces globalThis.fetch for the duration of one test.
 *
 * `routes` maps a substring of the URL to the response that request should get:
 *
 *   { "w3c.json": { json: { group: [80485] } },
 *     "api.w3.org": { json: { … } } }
 *
 * A request whose URL matches no route fails the test rather than reaching the
 * network, so a collector that starts fetching something new cannot quietly
 * turn these into live tests.
 */
export function stubFetch(routes) {
  const original = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (url, options) => {
    const href = String(url);
    calls.push({ url: href, options });

    const key = Object.keys(routes).find((fragment) => href.includes(fragment));
    if (!key) throw new Error(`unstubbed request to ${href}`);

    const route = routes[key];
    const body = route.text ?? (route.json !== undefined ? JSON.stringify(route.json) : "");

    return {
      ok: route.ok ?? true,
      status: route.status ?? 200,
      headers: new Headers(route.headers ?? {}),
      json: async () => JSON.parse(body),
      text: async () => body,
    };
  };

  return {
    calls,
    restore() {
      globalThis.fetch = original;
    },
  };
}

/** A wpt.fyi search result: one test, with one legacy_status entry per run. */
export function wptTest(name, totals) {
  return {
    test: name,
    legacy_status: totals.map((total) => ({ passes: total, total })),
  };
}
