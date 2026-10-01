![Weekly data update](https://github.com/w3c/cg-spec-metadata/actions/workflows/update-data.yml/badge.svg)

# cg-spec-metadata

Collects metadata for CG (Community Group) specifications, from various sources including GitHub, Mozilla, WebKit, Chromium, web-features, WPT, the W3C API, and the W3C Repo Manager.

The process performs the following operations on each spec in `specs.json`:

1. fetches metadata from multiple sources
1. applies any [manual overrides](overrides/README.md)
1. writes all data collected to `data.json`
   - This file contains one array entry per spec, with everything every collector returned.
1. writes relevant data for each spec to `specs/<shortname>.json`
   - Each of these files is an adapted subset of the data obtained for each spec,
     which is what published CG specifications fetch at load time (see [w3c/cg-assets](https://github.com/w3c/cg-assets)).

Every field is documented in [`metadata.md`](metadata.md).

## Installation

This project uses Node.js and expects at least Node 22.

Clone the repo and install the dependencies:

```sh
git clone https://github.com/w3c/cg-spec-metadata.git
cd cg-spec-metadata
npm install
```

## Usage

### Collect data

To collect all metadata for all specs defined in `specs.json`:

```sh
GITHUB_TOKEN="@@@" npm run collect
```

Using a GitHub Personal Access Token (PAT) is _highly_ recommended, to increase the API rate limit from 60 to 5,000 requests per hour.
This can be specified via the `GITHUB_TOKEN` environment variable, as seen above.
Other examples in the documentation may omit this for brevity.

### Collect a subset of data

It is possible to process only the specifications in a given list by passing their shortnames as parameters:

```sh
npm run collect -- shortname1 shortname2
```

## Development

### Tests

```sh
npm test
```

No test reaches the network — `fetch` is stubbed per test, and a request to an unstubbed URL fails the test rather than going out, so a collector that starts fetching something new cannot quietly turn these into live tests.

### Automatic pull requests

A [GitHub action](https://github.com/w3c/cg-spec-metadata/blob/main/.github/workflows/update-data.yml) is configured to run every week and submit a pull request to keep `data.json` and `specs/` up-to-date.
