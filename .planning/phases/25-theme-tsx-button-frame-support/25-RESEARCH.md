# Phase 25: Theme TSX Button Frame Support — Research

**Researched:** 2026-05-26
**Phase goal:** Let themes provide `buttonFrame` implementations as `.tsx` modules in addition to `.js` so theme-owned frame rendering uses the same authoring path already prepared in `themes/default`.

## Don't Hand-Roll

| Problem | Recommended solution | Why | Provenance |
|---------|----------------------|-----|------------|
| Importing raw `.ts` / `.tsx` theme runtime entries from a Node ESM CLI | Reuse `tsx`'s ESM runtime support instead of inventing a custom transpile/import layer in Sireno | `tsx` already exists in the repo, is the same family of runtime tool the addon loader uses, and its docs explicitly support ESM registration and scoped imports for `.ts` / `.tsx` files. This keeps Phase 25 aligned with the Phase 23 “fixed transpile policy” decision instead of creating a second ad hoc loader path. | [CITED: https://tsx.hirok.io/dev-api/register-esm] [VERIFIED: packages/cli/package.json] [VERIFIED: packages/cli/src/addon/loader.ts] |
| Fresh-importing updated theme runtime exports on reload | Keep using a cache-busting import strategy that produces a fresh import namespace per load, instead of relying on plain `import()` cache behavior | `packages/cli/src/config/theme.test.ts` already locks the requirement that a second `resolveTheme()` call sees updated runtime exports. The current snapshot-copy approach achieves this today; Phase 25 must preserve that behavior when TSX support becomes real. | [VERIFIED: packages/cli/src/config/theme.test.ts] [CITED: https://tsx.hirok.io/dev-api/register-esm] |
| Tracking theme runtime dependency files for watch/reload | Reuse the existing source-graph scan in `collectThemeRuntimeFilePaths(...)` instead of introducing a second watcher model | The repo already has one place that walks runtime relative imports for theme packages. Planning should preserve that seam and only widen it where needed for honest `.tsx` / `index.tsx` coverage and root-boundary enforcement. | [VERIFIED: packages/cli/src/config/theme.ts] |
| Proving theme support visibly in shipped code | Use `packages/cli/src/themes/default` as the built-in proof theme rather than adding a synthetic second built-in contract | The repo already contains the exact target state: `manifest.yml` points to `./index.ts`, that entry imports `./ButtonFrame`, and the frame is authored in `ButtonFrame.tsx`. Phase 25 should make that shipped setup truthful rather than adding a broader plugin system. | [VERIFIED: packages/cli/src/themes/default/manifest.yml] [VERIFIED: packages/cli/src/themes/default/index.ts] [VERIFIED: packages/cli/src/themes/default/ButtonFrame.tsx] |

## Common Pitfalls

### Plain `import()` does not make raw `.ts` / `.tsx` support honest by itself
**What goes wrong:** Theme resolution appears to support `.ts` / `.tsx` because `resolveThemeRuntimeImportPath(...)` and `collectThemeRuntimeFilePaths(...)` probe those extensions, but the actual runtime load still goes through a plain `import(pathToFileURL(...))`. That creates a contract mismatch where file-path discovery claims broader support than the runtime import path can honestly guarantee. [VERIFIED: packages/cli/src/config/theme.ts]

**Why:** The theme loader and the raw-addon loader are not using the same import mechanism. Addons already switch to `tsImport(..., { tsconfig: false })` for local raw `.ts` / `.tsx` entries, while themes do not. [VERIFIED: packages/cli/src/addon/loader.ts] [VERIFIED: packages/cli/src/config/theme.ts]

**How to avoid:** Keep `packages/cli/src/config/theme.ts` as the single contract seam, but move its runtime import path onto the same narrow fixed-policy `tsx` approach already used for raw addons. Do not widen support beyond manifest-driven entries and in-root relative imports. [VERIFIED: packages/cli/src/addon/loader.ts] [VERIFIED: packages/cli/src/config/theme.ts] [CITED: https://tsx.hirok.io/dev-api/register-esm]

### Fresh-reload behavior is easy to regress while fixing TSX support
**What goes wrong:** A seemingly-correct change can make `.ts` / `.tsx` entries load once, but silently re-use a cached module namespace on subsequent `resolveTheme()` calls. That would break the existing “updated runtime exports are reloaded” contract. [VERIFIED: packages/cli/src/config/theme.test.ts]

**Why:** ESM imports are cached by URL/module identity. The current loader works around that by snapshotting the theme package to a unique temp directory before importing. A Phase 25 loader change that drops this behavior without replacing it with namespaced/scoped runtime imports will regress hot-reload semantics. [VERIFIED: packages/cli/src/config/theme.ts] [CITED: https://tsx.hirok.io/dev-api/register-esm]

**How to avoid:** Preserve one explicit cache-busting strategy in planning and pin it with focused reload tests for custom filesystem themes. Phase 25 is not done if TSX works only on first load. [VERIFIED: packages/cli/src/config/theme.test.ts]

### Root-boundary honesty matters more once themes can import sibling TSX files
**What goes wrong:** Once `manifest.main` can be `.ts` / `.tsx`, theme authors will reasonably expect sibling relative imports like `./ButtonFrame`. Without an explicit root-boundary check, the loader can drift into accidentally supporting imports that escape the theme package root. [VERIFIED: packages/cli/src/themes/default/index.ts] [VERIFIED: packages/cli/src/config/theme.ts]

**Why:** The current theme runtime graph scan resolves relative specifiers but does not enforce `isWithinRoot(...)`-style guards like the raw-addon loader does. Phase 25 context explicitly rejects imports escaping the theme package root. [VERIFIED: packages/cli/src/config/theme.ts] [VERIFIED: packages/cli/src/addon/loader.ts] [VERIFIED: .planning/phases/25-theme-tsx-button-frame-support/25-CONTEXT.md]

**How to avoid:** Mirror the narrow raw-addon discipline: allow only manifest-entry imports plus relative imports that stay inside the theme root, and fail with path-aware theme diagnostics when the source graph escapes that boundary. [VERIFIED: packages/cli/src/addon/loader.ts] [VERIFIED: .planning/phases/25-theme-tsx-button-frame-support/25-CONTEXT.md]

### Test expectations can lie about the shipped contract even after runtime support is fixed
**What goes wrong:** The built-in theme tests and startup mocks still hard-code `themes/default/index.js` / `ButtonFrame.js` paths even though the in-repo default theme already points at TypeScript source. That leaves a “green but dishonest” test surface. [VERIFIED: packages/cli/src/config/theme.test.ts] [VERIFIED: packages/cli/src/cli/commands/start.test.ts] [VERIFIED: packages/cli/src/themes/default/manifest.yml]

**Why:** Phase 25 is partly a truthfulness phase. If the repo’s built-in proof theme moves to `index.ts` and `ButtonFrame.tsx`, any tests that still assert `.js`-only built-in paths stop reflecting the real support contract. [VERIFIED: packages/cli/src/config/theme.test.ts] [VERIFIED: packages/cli/src/themes/default/index.ts]

**How to avoid:** Treat built-in proof coverage as part of the first vertical slice, not as cleanup. Update focused theme/startup tests so they assert the actual shipped default-theme file graph and still preserve compatibility for JS-authored themes like `themes/light/index.js`. [VERIFIED: packages/cli/src/themes/light/index.js] [VERIFIED: packages/cli/src/config/theme.test.ts] [VERIFIED: packages/cli/src/cli/commands/start.test.ts]

## Existing Patterns in This Codebase

- **Manifest-backed theme runtime contract:** `packages/cli/src/config/theme.ts` already treats package themes as manifest-backed packages with required `main`, tolerant `buttonFrame` export lookup, stylesheet loading, and runtime file-path collection. Phase 25 should stay inside this seam instead of adding a second theme entrypoint. [VERIFIED: packages/cli/src/config/theme.ts]
- **Fixed-policy raw TypeScript loading:** `packages/cli/src/addon/loader.ts` already uses `tsImport(..., { tsconfig: false })` plus explicit raw-source graph scanning and in-root boundary enforcement. This is the nearest in-repo precedent for honest `.ts` / `.tsx` theme loading. [VERIFIED: packages/cli/src/addon/loader.ts]
- **Built-in truth fixture already exists:** `packages/cli/src/themes/default/manifest.yml`, `index.ts`, and `ButtonFrame.tsx` already express the exact public contract Phase 25 wants. The phase should make runtime loading and tests match that shipped state. [VERIFIED: packages/cli/src/themes/default/manifest.yml] [VERIFIED: packages/cli/src/themes/default/index.ts] [VERIFIED: packages/cli/src/themes/default/ButtonFrame.tsx]
- **JS compatibility proof must remain:** `packages/cli/src/themes/light/index.js` is still a JS-authored theme runtime exporting `buttonFrame`, so Phase 25 must widen support without turning JS themes into collateral damage. [VERIFIED: packages/cli/src/themes/light/index.js]
- **Reload behavior is already pinned:** `packages/cli/src/config/theme.test.ts` already requires that updating a theme runtime export changes the resolved `buttonFrame` on the next load. Any implementation plan must keep that regression coverage. [VERIFIED: packages/cli/src/config/theme.test.ts]
- **Config watch integration depends on honest `filePaths`:** `packages/cli/src/cli/commands/start.ts` and its tests depend on `resolveTheme()` returning the theme runtime file graph as part of the watched config inputs. Phase 25 must preserve or improve this file-path truthfulness rather than only making direct imports pass. [VERIFIED: packages/cli/src/cli/commands/start.ts] [VERIFIED: packages/cli/src/cli/commands/start.test.ts]

## Recommended Approach

Keep Phase 25 narrow and truthful: do not invent a new theme plugin model, just make the existing `manifest.main` contract honestly support `.ts` / `.tsx` entries for both built-in and filesystem themes. [VERIFIED: .planning/phases/25-theme-tsx-button-frame-support/25-CONTEXT.md]

Plan the work in two slices. First, make the built-in default theme contract real end to end by switching the runtime import seam in `packages/cli/src/config/theme.ts` onto a fixed-policy `tsx` path that preserves fresh reloads and tolerant exports, and update focused tests/mocks so they assert the real `index.ts` / `ButtonFrame.tsx` file graph. [VERIFIED: packages/cli/src/config/theme.ts] [VERIFIED: packages/cli/src/config/theme.test.ts] [VERIFIED: packages/cli/src/themes/default/manifest.yml] [CITED: https://tsx.hirok.io/dev-api/register-esm]

Second, harden the same contract for custom manifest-backed themes by enforcing in-root relative-import boundaries and extending tests to cover a custom `.tsx` theme package plus explicit failure when the import graph escapes the theme root. That preserves the repo’s existing “one honest public contract” rule and mirrors the already-shipped raw-addon policy without broadening into tsconfig-aware project loading. [VERIFIED: packages/cli/src/addon/loader.ts] [VERIFIED: .planning/phases/25-theme-tsx-button-frame-support/25-CONTEXT.md]
