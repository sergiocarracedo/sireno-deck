#!/usr/bin/env bash
# Build the macOS .app bundle + unsigned .dmg. Requires: create-dmg (CI installs it).
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../../.." && pwd)"
stage_root="$root/dist/staging"
out_dir="$root/dist/installer"
platform="macos"
arch="$(uname -m)"

version="$("$root/node_modules/.bin/node" -p "require('$root/package.json').version" 2>/dev/null || node -p "require('$root/package.json').version")"

"$here/_shared/prepare-runtime-tree.mjs"

stage="$stage_root/sireno-$platform-$arch/sireno"
app="$stage_root/SirenoDeck.app"
contents="$app/Contents"

rm -rf "$app"
mkdir -p "$contents/MacOS" "$contents/Resources"

cp -R "$stage" "$contents/Resources/sireno"

cat >"$contents/MacOS/sirenodeck" <<SHIM
#!/bin/sh
# .app entry — execs the staged launcher (which computes its own install root).
exec "\$(dirname "\$0")/../Resources/sireno/sirenodeck" "\$@"
SHIM
chmod +x "$contents/MacOS/sirenodeck"

cat >"$contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key><string>io.sireno.SirenoDeck</string>
  <key>CFBundleName</key><string>SirenoDeck</string>
  <key>CFBundleExecutable</key><string>sirenodeck</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>$version</string>
  <key>CFBundleVersion</key><string>$version</string>
  <key>LSMinimumSystemVersion</key><string>12.0</string>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
PLIST

mkdir -p "$out_dir"
create-dmg \
  --volname "SirenoDeck" \
  --app-drop-link 400 120 \
  "$out_dir/sireno-deck-$version-$platform-$arch.dmg" \
  "$app"

sha="$(shasum -a 256 "$out_dir/sireno-deck-$version-$platform-$arch.dmg" | awk '{print $1}')"
sed -e "s/VERSION/$version/" -e "s/SHA256/$sha/" \
  "$here/cask/sireno-deck.rb" >"$out_dir/sireno-deck.rb"

echo "built $out_dir/sireno-deck-$version-$platform-$arch.dmg (+ cask $out_dir/sireno-deck.rb)"
