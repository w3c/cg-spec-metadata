# Overrides

To correct data for a given specification, add `<shortname>.json` within this subdirectory, and define only the fields to correct.

Each file is deep-merged over the collected result, so overrides can correct any nested value.
Overrides can also _add_ fields that no collector produces, such as `standardizationPlan` or `progress`.

```json
{
  "github": { "stars": 800 },
  "standardizationPlan": { "text": "Agreement to migrate to WHATWG", "url": "https://..." }
}
```

Limitations of merging behavior:

- Arrays are fully replaced, not merged.
- A key cannot be deleted, only set to `null` or a falsy value such as `""` or `0`.

For each spec with overrides, the process indicates which top-level keys are overridden.

Any malformed file is reported and skipped, rather than terminating the process.
