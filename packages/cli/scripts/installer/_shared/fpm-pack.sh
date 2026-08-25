#!/usr/bin/env bash
# Shared fpm packer for deb/rpm. Stage the runtime tree, build a package-root
# with /opt/sireno + a /usr/bin shim, then fpm-pack it. Requires: fpm (CI).
set -euo pipefail

type="$1" # deb | rpm

here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../../.." && pwd)"
out_dir="$root/dist/installer"
platform="linux"
arch="$(uname -m)"

version="$(node -p "require('$root/package.json').version")"

"$here/_shared/prepare-runtime-tree.mjs"

fpm_root="$root/dist/staging/sireno-fpm-$type-$arch"
stage="$root/dist/staging/sireno-$platform-$arch/sireno"

rm -rf "$fpm_root"
mkdir -p "$fpm_root/opt" "$fpm_root/usr/bin"
cp -R "$stage" "$fpm_root/opt/sireno"

cat >"$fpm_root/usr/bin/sirenodeck" <<SHIM
#!/bin/sh
# /usr/bin entry — delegates to the /opt/sireno launcher.
exec /opt/sireno/sirenodeck "\$@"
SHIM
chmod +x "$fpm_root/usr/bin/sirenodeck"

mkdir -p "$out_dir"
if [ "$type" = "deb" ]; then
  fpm -s dir -t deb \
    -C "$fpm_root" \
    -n sirenodeck \
    -v "$version" \
    -a "$arch" \
    --prefix / \
    --deb-maintainer "Sireno Deck <sireno-deck@users.noreply.github.com>" \
    --deb-compression xz \
    --package "$out_dir/sireno-deck-$version-$platform-$arch.deb" \
    .
else
  fpm -s dir -t rpm \
    -C "$fpm_root" \
    -n sirenodeck \
    -v "$version" \
    -a "$arch" \
    --prefix / \
    --package "$out_dir/sireno-deck-$version-$platform-$arch.rpm" \
    .
fi

echo "built $out_dir/sireno-deck-$version-$platform-$arch.$type"
