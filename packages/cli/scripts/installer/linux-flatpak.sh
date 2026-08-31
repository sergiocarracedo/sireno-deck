#!/usr/bin/env bash
# Build the Flatpak installer. Requires flatpak-builder (CI installs it; it's
# not a runtime flatpak dependency of the built artifact).
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../../.." && pwd)"
out_dir="$root/dist/installer"
platform="linux"
arch="$(uname -m)"

version="$(node -p "require('$root/package.json').version")"

"$here/_shared/prepare-runtime-tree.mjs"

flatpak-builder \
  --force-clean \
  --repo="$out_dir/repo" \
  --arch="$arch" \
  "$root/dist/staging/flatpak-build" \
  "$here/flatpak/io.sireno.SirenoDeck.json"

mkdir -p "$out_dir"
flatpak build-bundle \
  "$out_dir/repo" \
  "$out_dir/sirenodeck-$version-$platform-$arch.flatpak" \
  io.sireno.SirenoDeck

echo "built $out_dir/sirenodeck-$version-$platform-$arch.flatpak"
