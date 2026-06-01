#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

node <<'NODE'
const fs = require("fs");

const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));

const requiredManifestFields = [
  "manifest_version",
  "name",
  "version",
  "description",
  "action",
  "content_scripts",
];

for (const field of requiredManifestFields) {
  if (!(field in manifest)) {
    throw new Error(`manifest.json is missing required field: ${field}`);
  }
}

const requiredFiles = [
  "manifest.json",
  "src/popup/popup.html",
  "src/popup/popup.js",
  "src/options/options.html",
  "src/options/options.js",
  "src/content/companyMatcher.js",
  "src/content/content.js",
  "data/blocked_sources.json",
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required file: ${file}`);
  }
}

console.log("Manifest and required files look good.");
NODE

while IFS= read -r file; do
  node --check "$file"
done < <(find src -name "*.js" -type f | sort)

