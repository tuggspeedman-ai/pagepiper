#!/bin/bash
# Vendor Readability.js and Turndown.js into libs/
# Run from the project root: bash scripts/vendor.sh

set -euo pipefail

LIBS_DIR="libs"
TMP_DIR=$(mktemp -d)

echo "Pulling @mozilla/readability..."
npm pack @mozilla/readability --pack-destination "$TMP_DIR" --silent
tar -xzf "$TMP_DIR"/mozilla-readability-*.tgz -C "$TMP_DIR"
cp "$TMP_DIR/package/Readability.js" "$LIBS_DIR/Readability.js"
echo "  -> $LIBS_DIR/Readability.js"

echo "Pulling turndown..."
npm pack turndown --pack-destination "$TMP_DIR" --silent
tar -xzf "$TMP_DIR"/turndown-*.tgz -C "$TMP_DIR"
cp "$TMP_DIR/package/lib/turndown.browser.umd.js" "$LIBS_DIR/turndown.browser.umd.js"
echo "  -> $LIBS_DIR/turndown.browser.umd.js"

rm -rf "$TMP_DIR"
echo "Done."
