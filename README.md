![Weekly data update](https://github.com/w3c/cg-spec-metadata/actions/workflows/update-data.yml/badge.svg)

# cg-spec-metadata

A metadata collector for CG (Community Group) specifications — this tool gathers a variety of metadata (from GitHub, Mozilla, WebKit, Chromium, web-features, WPT, the W3C API and the W3C Repo Manager) for a list of specs defined in a JSON file.

Every field is documented in [`metadata.md`](metadata.md).

## Installation

This project uses Node.js and expects at least Node 18+ (for fetch support).

Clone the repo and install the dependencies:

```shell
git clone https://github.com/w3c/cg-spec-metadata.git
cd cg-spec-metadata
npm install
```

## Usage

### Collect data

To collect metadata for all specs defined in `specs.json` (pass a github token in the environment variable `GITHUB_TOKEN` to increase the GitHub API rate limit from 60 to 5000 requests per hour):

```shell
GITHUB_TOKEN="@@@" npm run collect
```

The script will:
* Loop through each spec in specs.json
* Fetch various metadata points from multiple sources
* Apply any manual overrides
* Write everything it collected to `data.json`
* Write one file per spec to `specs/`

The two outputs serve different readers. `data.json` is the raw archive: one array entry per spec, everything every collector returned. `specs/<shortname>.json` is a small, format-versioned *projection* of one spec — one field per value a specification document renders, with every derivation already applied — which is what published CG specifications fetch at load time (see [w3c/cg-assets](https://github.com/w3c/cg-assets)). Files in `specs/` are rewritten on every run, and one is removed when its spec leaves `specs.json`.

It is possible to process a given list of specifications by passing their shortnames as parameters:

```shell
GITHUB_TOKEN="@@@" npm run collect -- shortname1 shortname2
```

`npm run collect` is a thin wrapper around `node index.js`, so either form works.

### Manual overrides

If you need to correct data for a given specification, add `overrides/<shortname>.json` holding only the fields to correct. A spec with no file has no overrides, and an empty object (`{}`) is the same as no file.

```json
{
  "mozilla": { "position": "positive" }
}
```

Each file is deep-merged over the collected result, so it can correct any nested value and can also **add** fields that no collector produces — that is where the editorial ones live, such as `standardizationPlan` and a `progress` of `3`. Only the keys you name are touched.

Two things to know: **arrays are replaced wholesale, never merged**, and a key cannot be deleted, only set to `null` or `""`. A malformed file is reported and skipped rather than failing the run, and every applied override is logged, so a run says which values did not come from a collector.

See [`overrides/README.md`](overrides/README.md).

### Automatic pull requests

A [GitHub action](https://github.com/w3c/cg-spec-metadata/blob/main/.github/workflows/update-data.yml) is configured to run every week and submit a pull request to keep `data.json` and `specs/` up-to-date.

