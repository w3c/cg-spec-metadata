![Weekly data update](https://github.com/deniak/cg-spec-metadata/actions/workflows/update-data.yml/badge.svg)

# cg-spec-metadata

A metadata collector for CG (Community Group) specifications — this tool gathers a variety of metadata (from GitHub, Mozilla, WebKit, Chromium, web-features, WPT) for a list of specs defined in a JSON file.

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
GITHUB_TOKEN="@@@" node index.js
```

The script will:
* Loop through each spec in specs.json
* Fetch various metadata points from multiple sources
* Output all findings into a single JSON file `data.json`

It is possible to process a given list of specifications by passing their shortnames as parameters:

```shell
GITHUB_TOKEN="@@@" node index.js shortname1 shortname2
```

### Manual overrides

If you need to correct data for a given specification, the `override.json` file allows you to override automated data. It is an array of objects where the shortname acts as the unique identifier and the properties will be merged into `data.json`
```json
[
  {
    "shortname": "file-system-access",
    "mozilla": {
      "position": "positive"
    }
  }
]
```

### Automatic pull requests

A [GitHub action](https://github.com/w3c/cg-spec-metadata/blob/main/.github/workflows/update-data.yml) is configured to run every week and submit a pull request to ensure data.json is up-to-date.

