---
phase: 40
date: 2026-06-04
sources:
  - /works/opensource/sireno-deck/.planning/research/v1.4/STACK.md
  - /works/opensource/sireno-deck/.planning/research/v1.4/PITFALLS.md
  - /works/opensource/sireno-deck/.planning/research/v1.4/SUMMARY.md
  - /works/opensource/sireno-deck/.planning/phases/40-distribution-build-pipeline/40-CONTEXT.md
---

# Phase 40 Research — Distribution Build Pipeline

## Don't Hand-Roll

- **Don't bundle Chromium with the binary.** Playwright's patched Chromium has redistribution license complexity and adds 250MB+ to the binary. Phase 41 handles first-run auto-install.
- **Don't use `@yao-pkg/pkg`.** Deprecated since 2022, abandoned. Use Node SEA instead. [HIGH: pkg GitHub README]
- **Don't use `nexe`.** Last release 2022, hasn't kept up with Node internals. Use Node SEA. [HIGH: nexe GitHub issues]
- **Don't cross-compile SEAs.** Cross-compiled SEAs cannot use `useCodeCache: true` because code cache is platform-bound. Build on each target OS. [HIGH: Node SEA docs]
- **Don't try to ship a Mac x64 binary yet.** Upstream Node SEA's CI does not test x64. Ship arm64 first, defer x64 to v1.5.

## Common Pitfalls

- **SEA bundle goes stale on the first run.** Node SEA caches the code cache per-host. If the underlying `dist/cli.js` changes between extract and bundle steps, the cache is invalid. Mitigation: rebuild on every build, include a content hash in the bundle output name. [HIGH: Node SEA docs]
- **`useCodeCache` without `useSnapshot` fails on macOS arm64.** `useSnapshot` is required when code cache is enabled, but the `useSnapshot` config is platform-bound. Mitigation: set both, but skip `useSnapshot` on Linux if a regression appears. [MEDIUM: Node SEA docs]
- **`unbundle: true` in tsdown leaves assets as separate files.** Must use `sea.getRawAsset()` to embed them in the binary. Forget this and the binary fails at runtime with `ENOENT`. [HIGH: tsdown docs]
- **Asset path resolution breaks when wrapped.** Existing code uses `fileURLToPath(new URL("../assets/...", import.meta.url))`. This `import.meta.url` returns `node:` in SEA, breaking the relative path. Must use `sea.getRawAsset()` for assets in production. [HIGH: PITFALLS.md]
- **`disableExperimentalSEAWarning: true` needed in sea-config.json** or the binary prints a warning banner on every run. [HIGH: Node SEA docs]
- **MacOS code signing is required for distribution** but Apple Developer ID costs $99/yr. Phase 40 ships ad-hoc signed (works for local testing but Gatekeeper warns end users). Real notarization deferred to v1.5.

## Existing Patterns in This Codebase

- **`tsdown` config already in place** at `packages/cli/tsdown.config.ts` — produces ESM bundle with `target: 'node20'`, `unbundle: true`. Phase 40 does NOT change this.
- **Two-stage build pattern** in `package.json` (`build:tailwind-browser` → `build`) — Phase 40 adds a third stage `build:sea` to the chain.
- **CLI version flag** in `packages/cli/src/cli/index.ts` yargs setup — Phase 40 wires it to read from build-time env vars.
- **Asset loading** uses `fileURLToPath(new URL("../assets/...", import.meta.url))` throughout `packages/cli/src/`. Phase 40 introduces a `getSeaAsset()` wrapper that falls back to file read in dev mode, uses `sea.getRawAsset()` in SEA mode.
- **Tailwind browser CSS** is built by `src/cli/build-tailwind-browser.ts` to `packages/cli/tailwind.browser.generated.css` — must be included in SEA asset list.

## Recommended Approach

### Build pipeline (CLI scripts in `packages/cli/package.json`)

```jsonc
"build:sea": "node ./scripts/build-sea.mjs",
"build:sea:linux-x64": "SIRENO_TARGET=linux-x64 pnpm run build:sea",
"build:sea:linux-arm64": "SIRENO_TARGET=linux-arm64 pnpm run build:sea",
"build:sea:mac-arm64": "SIRENO_TARGET=mac-arm64 pnpm run build:sea"
```

### `scripts/build-sea.mjs` orchestration

1. Compute `SIRENO_BUILD_VERSION` from `package.json` version
2. Compute `SIRENO_BUILD_SHA` from `git rev-parse --short HEAD`
3. Compute `SIRENO_BUILD_DATE` (ISO date)
4. Run `pnpm build` (tsdown bundle) — produces `packages/cli/dist/cli.js`
5. Write `sea-config.json` with:
   - `main`: `packages/cli/dist/cli.js`
   - `output`: `${SIRENO_DIST_DIR}/${SIRENO_TARGET}/sireno`
   - `useSnapshot: true`
   - `useCodeCache: true`
   - `disableExperimentalSEAWarning: true`
   - `assets`: list of `{ path, name }` for logoFull.png, tailwind.browser.generated.css, theme fonts
6. Run `node --build-sea` to produce the binary
7. Make the binary executable on Linux/Mac (`chmod +x`)
8. Run smoke test: `outputPath --version` and `outputPath --help`

### Asset embed list (Phase 40 starter set)

- `packages/cli/src/assets/logoFull.png` → name `assets/logoFull.png`
- `packages/cli/tailwind.browser.generated.css` → name `assets/tailwind.browser.generated.css`
- Theme fonts (discovered by scanning `themes/*/assets/`) → names `themes/<theme>/<font>`

### Runtime helper

`packages/cli/src/util/sea-asset.ts`:

```ts
import { isSea, getAsset } from 'node:sea'

export function getSeaAsset(name: string): Buffer {
  if (isSea()) {
    return Buffer.from(getAsset(name))
  }
  // dev fallback: read from filesystem
  const path = fileURLToPath(new URL(`../assets/${name}`, import.meta.url))
  return readFileSync(path)
}
```

Existing asset loaders migrate to call `getSeaAsset()` instead of `fileURLToPath(...)`.

### Smoke test

`packages/cli/src/util/sea-asset.test.ts`:
- `it('returns the bundled asset when running in SEA')` — mock `isSea` to return true
- `it('falls back to filesystem in dev mode')` — mock `isSea` to return false, assert file read

Build-time smoke test: `outputPath --version` and `outputPath --help` exit 0 and print expected output.

### Out of scope for Phase 40 (deferred to other phases)

- Chromium auto-install → Phase 41
- GitHub Actions matrix builds → Phase 47
- Apple notarization → v1.5
- Windows builds → v1.5
