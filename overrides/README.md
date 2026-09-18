# Overrides

One file per specification, named `<shortname>.json`, holding only the fields to correct. A spec
with no file here has no overrides, and an empty object (`{}`) is the same as no file.

Each file is deep-merged over the collected result before `data.json` and `specs/` are written, so
it can correct any nested value and can also **add** keys that no collector produces — the editorial
fields such as `standardizationPlan` live here.

```json
{
  "github": { "stars": 800 },
  "standardizationPlan": { "text": "Agreement to migrate to WHATWG", "url": "https://..." }
}
```

Two things to know:

- **Arrays are replaced wholesale, never merged.** An override that touches `web_features_mapping`
  must supply the entire two-element array.
- **A key cannot be deleted**, only set to `null` or `""`.

A malformed file is reported and skipped rather than failing the run, and a file whose name matches
no spec in `specs.json` is reported as well.
