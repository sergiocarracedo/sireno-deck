# Phase 40: Distribution Build Pipeline - Context

**Gathered:** 2026-06-04
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the CLI distributable as a standalone executable for Linux x64, Linux arm64, and macOS arm64. Build via Node 20 Single Executable Application (SEA) with `useCodeCache: true`, output to a configurable directory with per-platform subdirectories. No Chromium bundling — auto-install is handled in Phase 41.

This phase ships the build pipeline only. Runtime first-run UX (Chromium detection, prompts) is Phase 41. CI matrix builds are Phase 47.

</domain>

<decisions>
## Implementation Decisions

### Build Stack
- **Bundler:** Existing `tsdown` (already in `packages/cli/tsdown.config.ts`) with `format: 'esm'`, `target: 'node20'`, `unbundle: true` — keep as-is
- **SEA wrapper:** Node 20's `node --build-sea` with `useCodeCache: true` and `disableExperimentalSEAWarning: true`
- **Bundle stage:** `pnpm cli:build` runs tsdown → produces `dist/cli.js` ESM bundle
- **SEA stage:** `pnpm cli:build:sea` runs `node --build-sea` on the bundle → produces the platform executable
- **Two-stage pipeline:** Keep `cli:build` and add `cli:build:sea` as separate scripts so dev iteration is unaffected

### Per-Platform Builds
- One `build:sea:<platform>-<arch>` script per target: `linux-x64`, `linux-arm64`, `mac-arm64`
- Each script is a thin wrapper that sets the right SEA config for its target
- No cross-compilation (Node SEA cannot use code cache on cross-compiled outputs) — each build runs on its native OS

### Output Directory
- Default: `/works/test/test-sireno-deck/`
- Override: `SIRENO_DIST_DIR` environment variable
- Per-platform subdirectory: `${SIRENO_DIST_DIR}/<platform>-<arch>/sireno` (no file extension on Linux/Mac since they are ELF/Mach-O)
- Layout example:
  ```
  /works/test/test-sireno-deck/linux-x64/sireno
  /works/test/test-sireno-deck/linux-arm64/sireno
  /works/test/test-sireno-deck/mac-arm64/sireno
  ```

### Asset Handling
- **Embed via `sea.getRawAsset()`** — assets (logoFull.png, Tailwind browser CSS, theme fonts) are compiled into the binary
- The `sea-config.json` declares the asset list with SHA-256 integrity hashes
- A thin runtime helper (`getSeaAsset(name)`) replaces direct `fileURLToPath` reads for asset paths
- Existing asset pipeline (`packages/cli/src/assets/`, Tailwind build output) is the source
- Trade-off: larger binary (~30-50MB including assets vs. ~10MB JS only), but single-file distribution is simpler for users

### Version Stamping
- Build-time environment variables:
  - `SIRENO_BUILD_VERSION` — from `packages/cli/package.json` `version` field
  - `SIRENO_BUILD_SHA` — from `git rev-parse --short HEAD`
  - `SIRENO_BUILD_DATE` — ISO date when the build runs
- The `sea-config.json` injects these as `codeCache` data, and the CLI's `--version` flag reads them
- The build script computes them and passes to `node --build-sea`

### Smoke Test
- Post-build, run the binary with `--version` and `--help`
- Verify exit code 0 and expected output
- `start` command is not tested (no hardware in CI)
- A focused unit test verifies `getSeaAsset()` returns the correct Buffer for known assets

### Agent's Discretion
- Exact name of the build scripts (e.g. `cli:build:sea:linux-x64` vs `cli:build-sea:linux-x64`)
- Whether to commit the `sea-config.json` template to the repo or generate it at build time
- Where the version constant lives in the CLI code (top of `cli/index.ts` vs dedicated `version.ts`)
- The exact list of assets to embed (start with the existing `packages/cli/src/assets/` and the Tailwind browser output)

</decisions>

<specifics>
## Specific Ideas

- **Single-file distribution is the priority** — user wants an executable that "just runs" without a Node install. Embedding assets via `sea.getRawAsset` was chosen over the recommended "copy alongside binary" approach because the user prefers the smaller-friction UX of one file
- **No `--with-deps` on Chromium install** — Phase 41 will auto-install Chromium but only the browser, not system dependencies (avoids root prompt)

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `/works/opensource/sireno-deck/.planning/research/v1.4/STACK.md` — Node SEA stack research, build commands, asset embed pattern
- `/works/opensource/sireno-deck/.planning/research/v1.4/PITFALLS.md` — section "Node SEA bundle goes stale after first run" + "useCodeCache without useSnapshot"
- `/works/opensource/sireno-deck/.planning/research/v1.4/SUMMARY.md` — recommended build pipeline summary
- `/works/opensource/sireno-deck/packages/cli/tsdown.config.ts` — existing bundle config (keep as-is)
- `/works/opensource/sireno-deck/packages/cli/package.json` — existing scripts and dependencies
- `/works/opensource/sireno-deck/packages/cli/src/cli/index.ts` — CLI entry, where `--version` flag lives
- `/works/opensource/sireno-deck/packages/cli/src/assets/` — assets to embed

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`tsdown` config:** Already produces `dist/cli.js` ESM bundle with `target: 'node20'`. Phase 40 only adds the SEA wrapper stage, not the bundle stage
- **`packages/cli/package.json`:** Already has `build:tailwind-browser` and `build` scripts. Phase 40 adds `build:sea:*` scripts alongside
- **`SIRENO_DIST_DIR` env convention:** None yet. Phase 40 introduces this env var for output directory override

### Established Patterns
- **Two-stage build already in place:** `build:tailwind-browser` (CSS) → `build` (JS) → Phase 40 adds `build:sea` (wrap as binary)
- **No cross-compilation:** All existing builds run on the host platform. Matches the no-cross-compile constraint for SEA with code cache
- **TypeScript strict ESM:** Bundle output is ESM, matches Node 20 SEA ESM-only support

### Integration Points
- **CLI entry:** `packages/cli/src/cli/index.ts` is the entry that gets bundled and wrapped
- **Asset loading:** Currently uses `fileURLToPath(new URL("../assets/...", import.meta.url))` — Phase 40 adds a `getSeaAsset(name)` helper that wraps `sea.getRawAsset()` with a fallback to the existing file read for dev mode
- **Version output:** Existing `--version` flag in yargs setup — Phase 40 wires it to read from build-time env vars

</code_context>

<deferred>
## Deferred Ideas

- **Linux musl / Alpine builds:** Node SEA explicitly doesn't support musl. Out of scope for v1.4
- **macOS x64 executable:** Node SEA's CI does not test this. arm64 first; x64 deferred to v1.5
- **Code signing + Apple notarization:** Needs Apple Developer ID. Defer to v1.5; ship ad-hoc signed for v1.4
- **Per-version release artifacts on GitHub:** Phase 47 handles CI matrix; v1.4 doesn't need it
- **Code splitting for faster cold start:** Single bundle is ~10MB, not worth splitting in v1.4

</deferred>

---
*Phase: 40-distribution-build-pipeline*
*Context gathered: 2026-06-04*
