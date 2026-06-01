#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

VERSION="$(node -p "require('./manifest.json').version")"
PACKAGE_NAME="directapply-filter-v${VERSION}.zip"

rm -rf dist
mkdir -p dist

zip -r "dist/${PACKAGE_NAME}" \
  manifest.json \
  README.md \
  assets \
  data \
  src \
  -x "*.DS_Store" \
  -x "__MACOSX/*" \
  -x "assets/store/*"

echo "Created dist/${PACKAGE_NAME}"
