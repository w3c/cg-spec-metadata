# cg-spec-metadata

A metadata collector for CG (Community Group) specifications — this tool gathers a variety of metadata (from GitHub, Mozilla, WebKit, Chromium, web-features, WPT) for a list of specs defined in a JSON file.

## Installation

This project uses Node.js and expects at least Node 18+ (for fetch support).

Clone the repo and install the dependencies:

```shell
git clone https://github.com/deniak/cg-spec-metadata.git
cd cg-spec-metadata
npm install
```

## Usage

To collect metadata for all specs defined in `specs.json` (pass a github token in the environment variable `GITHUB_TOKEN` to increase the GitHub API rate limit from 60 to 5000 requests per hour):

```shell
GITHUB_TOKEN="@@@" node index.js
```

The script will:
* Loop through each spec in specs.json
* Fetch various metadata points from multiple sources
* Output all findings into a single JSON file `data.json`
