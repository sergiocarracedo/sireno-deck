# Phase 24 Verification

**Date:** 2026-05-26
**Status:** passed

## Verification Summary

Phase 24 passed verification. The mounted addon render contract is now the shipped authoring model, the active deck preserves mounted local React state while active and unmounts cleanly on deck exit, runtime-owned addon session store scopes behave as planned, the repo's architecture-facing docs no longer describe the pre-Phase-24 static instance-first model as current truth, and all four emulator-facing rerun UAT gaps are now closed in code: browser-loadable mounted asset URLs, keyed deck-root patching instead of whole-mount replacement, rewriteable config-expanded icon refs that no longer leak `file://...` into the emulator page, and preserved theme CSS/font loading on the HTTP emulator path.

## Must-Have Checks

### 24-01
- Passed: `packages/cli/src/addon/api.ts` exposes `defineMountedButton(...)`, mounted render props, and definition-level handlers.
- Passed: `packages/cli/src/deck/runtime.ts` executes mounted definitions end to end without breaking the compatibility seam.
- Passed: committed Phase 24 fixture under `packages/cli/fixtures/phase-24/` proves mounted definitions through the normal loader/runtime path.

### 24-02
- Passed: runtime owns button-local and addon-wide store scopes with runtime-session-only lifetime in `packages/cli/src/deck/runtime.ts`.
- Passed: committed fixture and runtime tests prove cross-button coordination across deck changes and reset on rebuilt runtime.
- Passed: `packages/cli/src/render/dom-host.test.tsx` pins the props-first store contract.

### 24-03
- Passed: `packages/cli/src/render/dom-host.tsx` now hosts a mounted active-deck React tree in Node instead of treating the active path as static-only serialization.
- Passed: repeated active-deck updates preserve component-local state while active, and deck exit unmount resets that local state on re-entry.
- Passed: committed Phase 24 fixture proves mounted local state and transient runtime props on the real file-backed path.

### 24-04
- Passed: shipped built-in addon source definitions now use `defineMountedButton(...)` as the primary authoring model.
- Passed: focused addon/runtime/dom-host tests cover the migrated contract from file-relative fixture paths.
- Passed: `.planning/codebase/ARCHITECTURE.md` and `AGENTS.md` reflect the mounted runtime instead of the stale instance-first/non-DOM description.

### 24-05
- Passed: the emulator now serves mounted addon/theme assets through a browser-loadable HTTP path instead of leaving built-in icons on broken `file://...` URLs in the user-facing browser page.
- Passed: `packages/cli/src/addon/api.ts` preserves the capture path while accepting emulator-safe browser URLs from the resolver.
- Passed: focused emulator/start coverage proves a real shipped built-in icon path resolves through the HTTP-served emulator seam.

### 24-06
- Passed: the `date-time` button still owns its 1s cadence through the runtime polling seam; the fix did not move or globalize that cadence.
- Passed: the emulator no longer relies on whole-`#deck-mount` replacement for each render-version bump and instead patches the mounted deck root more narrowly.
- Passed: focused emulator/start plus runtime regression coverage prove transient press/release updates and polled button updates still surface correctly.

### 24-07
- Passed: config-expanded addon/theme icon refs now stay rewriteable through validation instead of being baked into `file://...` URLs before render-time DOM asset rewriting can run.
- Passed: bundled emoji-selector deck expansion keeps `addon://...` icon refs while still failing early for unknown assets.
- Passed: focused loader/emulator regression coverage proves the Favorites icon no longer leaks `file://...favorites.svg` into the HTTP-served emulator page.

### 24-08
- Passed: the emulator page now receives and reapplies the theme utility and theme asset style blocks instead of stripping them when deck updates are served.
- Passed: emulator-facing theme font URLs are browser-loadable `/__sireno/assets?path=...` endpoints instead of unusable `file://...` paths.
- Passed: focused theme/emulator regression coverage proves the shipped dark theme CSS/font surface survives end to end without regressing keyed deck patching or earlier addon asset fixes.

## Evidence

- `pnpm --filter sireno-deck-cli exec vitest run src/builtin-addons/core-buttons/index.test.ts src/builtin-addons/emoji-selector/index.test.ts src/builtin-addons/date-time/index.test.ts src/addon/loader.test.ts src/deck/runtime.test.ts src/render/dom-host.test.tsx`
  - `85 passed`
- `pnpm --filter sireno-deck-cli exec vitest run src/addon/loader.test.ts src/deck/runtime.test.ts src/render/dom-host.test.tsx`
  - `57 passed`
- `pnpm --filter sireno-deck-cli exec vitest run src/cli/commands/start.test.ts --testNamePattern "starts a hardware-free emulator session and serves the current deck surface locally|serves mounted deck asset urls through emulator-safe http paths|bridges browser input through the virtual lifecycle|restarts the emulator with a new virtual device|fails honestly when the selected virtual device|ships the emulator shell with keyed deck patching instead of whole mount replacement"`
  - `6 passed`
- `pnpm --filter sireno-deck-cli exec vitest run src/deck/runtime.test.ts`
  - `38 passed`
- `pnpm --filter sireno-deck-cli exec vitest run src/config/loader.test.ts src/cli/commands/start.test.ts --testNamePattern "expands bundled addon deck types while keeping addon asset refs rewriteable|serves mounted deck asset urls through emulator-safe http paths|keeps config-expanded emoji deck icons rewriteable on the emulator path|starts a hardware-free emulator session and serves the current deck surface locally|bridges browser input through the virtual lifecycle|restarts the emulator with a new virtual device|fails honestly when the selected virtual device|ships the emulator shell with keyed deck patching instead of whole mount replacement"`
  - `8 passed | 54 skipped`
- `pnpm --filter sireno-deck-cli exec vitest run src/config/theme.test.ts src/cli/commands/start.test.ts --testNamePattern "rewrites file-backed theme asset urls for browser-served transports|serves theme styles and browser-loadable font urls on the emulator path|serves mounted deck asset urls through emulator-safe http paths|keeps config-expanded emoji deck icons rewriteable on the emulator path|starts a hardware-free emulator session and serves the current deck surface locally|bridges browser input through the virtual lifecycle|restarts the emulator with a new virtual device|fails honestly when the selected virtual device|ships the emulator shell with keyed deck patching instead of whole mount replacement"`
  - `9 passed | 24 skipped`
- `grep createInstance packages/cli/src/builtin-addons`
  - source built-ins migrated; only tests/intentional compatibility code should remain
- `grep -n "Stateful button instances\|not DOM-based\|mounted" .planning/codebase/ARCHITECTURE.md AGENTS.md`
  - stale architecture claims removed or updated
- `rg -n "24-07-PLAN.md|favorites\.svg|file:///works/opensource/sireno-deck/packages/cli/src/builtin-addons/emoji-selector/assets/favorites\.svg|root_cause" .planning/phases/24-mounted-addon-render-contract/24-UAT.md`
  - rerun UAT evidence preserved and linked to the final closure plan
- `rg -n "24-08-PLAN.md|theme css|fonts are loaded|root_cause" .planning/phases/24-mounted-addon-render-contract/24-UAT.md`
  - rerun UAT preserved the theme/css/font failure and now records it as closed by the final rerun pass

## Residual Notes

- Phase 24 is post-roadmap follow-on work and does not add new v1.2 requirement IDs; `REQUIREMENTS.md` remains milestone-scoped.
- `verify-work 24` rerun diagnosed and closed the remaining emulator gaps. The rerun UAT now has no open gaps, and the next workflow step is `/review`, followed by `/ship` and `/compound`.
