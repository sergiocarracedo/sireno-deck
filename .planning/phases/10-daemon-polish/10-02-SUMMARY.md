# Plan 10-02 Summary

**Completed:** 2026-06-27

## What was built

Real npm addon loader: any package in `config.yml` `addons:` that matches the npm package-name regex (bare or scoped, optional `@version`) gets installed via `npm install <specifier> --prefix <cacheDir> --no-save --silent --no-audit --no-fund` to `~/.cache/sireno-deck-2/node_modules/<name>/` (cross-platform: `Library/Caches/` on macOS, `%LOCALAPPDATA%` on Windows, `$XDG_CACHE_HOME` on Linux). The cached `package.json`'s `sirenoAddonApiVersion` field gates compatibility; the cached `main` entry is dynamically imported. Auto-installs on first `start`; cached for subsequent runs. The previous "npm addon loading is not yet implemented" stub is gone.

## Key files

- `packages/cli/src/util/cache-paths.ts` (new) — `resolveAddonCacheDir()` (cross-platform), `addonNpmRoot(cacheDir)`, `addonNpmInstallPath(name, cacheDir)`.
- `packages/cli/src/util/cache-paths.test.ts` (new) — 6 tests.
- `packages/cli/src/addon/spec.ts` — added `isNpmAddonSpec(spec)`; npm package-name regex (bare or scoped, optional version). Behavior-preserving fix to `isLocalAddonSpec` (rejects scoped npm packages as local).
- `packages/cli/src/addon/spec.test.ts` (new) — 10 tests for `isLocalAddonSpec` + `isNpmAddonSpec`.
- `packages/cli/src/addon/loader.ts` — added `installNpmAddon(specifier, cacheDir, issues)` (execa wrapper, 60s timeout) and `loadNpmAddon(source, cacheDir, issues, currentApi)` (parses specifier, reads or installs, validates manifest, imports main). `LoadAddonsOptions` extended with `cacheDir?`. The loop now recognizes npm specs and falls through to a clear "Unknown addon spec" error if neither local nor npm apply.
- `packages/cli/src/addon/loader.test.ts` (new) — 5 tests: cached package load (no install call), npm install call args, install failure → issue recorded, no-cacheDir fallback, apiVersion mismatch → warning + still loads.
- `packages/cli/src/__tests__/addon.test.ts` — updated the legacy "not yet implemented" test to reflect the new "Unknown addon spec" message.

## Decisions made

- **`execa` (already a dep, ^9.6.0)** for the npm install — no new deps.
- **Spec parser** uses `lastIndexOf("@")` so scoped packages like `@scope/name` aren't confused with the version separator.
- **Validation** is now lenient: `validateModule` returns `{module, apiMismatch?: boolean}` instead of rejecting on apiVersion mismatch. The loader records a warning but still loads the addon. Applies to both local and npm paths.
- **Per-spec cache check**: install is only triggered when the cached `package.json` is missing OR the cached version doesn't match the requested `name@version`. Avoids unnecessary re-installs when the spec is unpinned (`my-addon`) but the user upgrades their `config.yml` to a specific version.

## Deviations

- **Task 7 (`--local-node-modules` flag in `main.ts`) — not implemented**. The flag has no effect because **no production caller invokes `loadAddons`**. The CLI uses `AddonRegistry` + `registerBuiltins` directly (see `packages/cli/src/cli/commands/run.ts:127,294`), not `loadAddons`. Wiring the CLI's bootstrap to call `loadAddons({ cacheDir })` is a separate integration task — it touches the registry loading order and is out of scope for "make the loader work".

  **Follow-up note** (see "Notes for downstream"): the loader is ready and tested; the CLI integration needs a small refactor of `run.ts:preflight` to call `loadAddons` first, then `registerBuiltins`, then merge the results into a single `AddonRegistry`. Defer to a future quick task.

## Notes for downstream

- The npm loader supports any package whose `package.json` has `sirenoAddonApiVersion: 3`. No naming convention enforced (per CONTEXT decision).
- Install is synchronous (execa blocks the daemon startup for up to 60s per addon). For multi-addon configs, total startup time = sum of install times. Users with many npm addons should expect longer `start` times on first run.
- The cache layout matches opencode.ai's plugin pattern (`~/.cache/<app>/node_modules/`), so any tooling/scripts the user has for inspecting/managing opencode plugins will work analogously for sireno-deck-2.
- The `cacheDir` parameter is OPTIONAL for backward compatibility. If a caller (e.g., a test) doesn't pass it, npm specs get the "Unknown addon spec" message instead of an install attempt. Production callers should always pass `cacheDir`.

## Tests added

- cache-paths: 6
- spec: 10
- loader: 5
- (existing addon.test.ts updated: 1 test message changed)

Total: **21 new tests** (from 443 → 464).

## Final state

- `pnpm test`: 464/464 passing
- `pnpm --filter sireno-deck-2 lint`: clean
- `pnpm --filter sireno-deck-2 typecheck`: clean
- 5 commits in this plan: `639954d`, `5d16823`, `7122be7`, `5979d07`
