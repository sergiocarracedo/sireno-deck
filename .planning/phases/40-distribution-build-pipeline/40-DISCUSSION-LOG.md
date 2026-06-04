# Phase 40 Discussion Log

**Date:** 2026-06-04
**Phase:** 40 — Distribution Build Pipeline
**Mode:** standard

## Carrying Forward

From prior decisions (v1.4 milestone kickoff):
- **Distribution stack:** Node 20 SEA with `useCodeCache: true`, two-stage build (tsdown → SEA)
- **Per-OS CI matrix** — no cross-compile
- **No bundled Chromium** — auto-install only (Phase 41)
- **macOS arm64 first** — x64 deferred

## Gray Areas Discussed

### 1. Output directory

**Options considered:**
- Env var + per-platform subdirs ✅ chosen
- Flat output (no subdirs) — rejected, would force user to rename
- Hardcoded path — rejected, no flexibility for CI/dev
- CLI flag only — rejected, env var is cleaner for CI

**Decision:** `SIRENO_DIST_DIR` env var (default `/works/test/test-sireno-deck/`) + per-platform subdirs. Layout: `${SIRENO_DIST_DIR}/<platform>-<arch>/sireno`.

### 2. Asset handling

**Options considered:**
- Post-build copy alongside binary — initially recommended, but rejected
- **Embed via `sea.getRawAsset()`** ✅ chosen
- Download on first run — rejected, slower first start
- Re-bundle with `--no-unbundle` — rejected, harder to maintain

**Decision:** Embed via `sea.getRawAsset()`. Trade-off accepted: larger binary (~30-50MB) in exchange for single-file distribution UX. Existing asset pipeline (`packages/cli/src/assets/` + Tailwind browser CSS output) is the source.

### 3. Version stamping

**Options considered:**
- **Build-time env vars** ✅ chosen
- Read from package.json at runtime — rejected, the bundled file may differ
- No version stamping — rejected, --version output would be unhelpful

**Decision:** Three build-time env vars: `SIRENO_BUILD_VERSION`, `SIRENO_BUILD_SHA`, `SIRENO_BUILD_DATE`. Injected via `sea-config.json` and read by CLI's `--version` flag.

### 4. Smoke test

**Options considered:**
- **`--version` + `--help`** ✅ chosen
- Full device connect + render test — rejected, needs virtual hardware
- Build-only — rejected, no runtime guarantee

**Decision:** Post-build smoke test runs binary with `--version` and `--help`, verifies exit 0 and expected output. Plus a focused unit test for `getSeaAsset()`.

## Agent's Discretion

- Exact build script names
- Whether to commit `sea-config.json` template or generate at build time
- Where version constant lives in code
- Exact list of assets to embed

## Deferred Ideas

- Linux musl / Alpine — out of scope (Node SEA limitation)
- macOS x64 — defer to v1.5
- Code signing + notarization — defer to v1.5
- GitHub release artifacts — Phase 47
- Code splitting for cold start — not needed at ~10MB

## Next

`plan-phase 40` — convert these decisions into executable plans.
