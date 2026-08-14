#!/usr/bin/env bash
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
exec "$here/_shared/fpm-pack.sh" deb
