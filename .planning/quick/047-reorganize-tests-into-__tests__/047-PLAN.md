# Quick Task 047: Reorganize tests into `__tests__/` folders

**Task:** Apply the project convention that test files live in a sibling `__tests__/` folder next to the file(s) they cover. Currently ~46 of ~59 test files are siblings to their source file; ~13 are already correctly placed in `__tests__/`. This task moves the remaining siblings into `__tests__/`, fixes relative imports, and verifies the full vitest suite stays green.

## Decisions

- **Scope is tests only.** No per-component-folder restructure. Source-file layout is unchanged.
- **Vitest config stays unchanged.** The current `include: ["src/**/*.test.{ts,tsx}"]` glob is already recursive; tests under `__tests__/` are picked up automatically. (We considered locking the convention with a narrower glob, but kept the broader one for now to avoid breakage.)
- **Relative-import fixup rule:** every `import ... from './foo'` in a moved test becomes `import ... from '../foo'`. Absolute `@/` alias imports are unchanged.
- **Test filename is preserved.** `clipboard.test.ts` → `__tests__/clipboard.test.ts`. The file is still named after the module it covers.
- **Existing `__tests__/` directories stay.** Tests already correctly placed (`src/deck/__tests__/`, `src/ui/__tests__/`, `src/ui/utils/__tests__/`, `src/ui/surfaces/__tests__/`) are left as-is.
- **quick-046 Task 3 (in-progress dom-host refactor) is folded in.** The flat `dom-host-*` files at `packages/cli/src/render/` are already in the working tree as `packages/cli/src/render/dom-host/*` (untracked) plus the originals marked-deleted. We commit the folder refactor AND move `dom-host.test.tsx` into `dom-host/__tests__/dom-host.test.tsx` per the new convention. The original quick-046 plan said "keeps co-location with code under test"; this is overridden by the new global convention. (See quick-046 PLAN.md note appended at the bottom.)
- **Atomic commits per wave.** Each wave produces one commit so partial progress is recoverable and history is readable.

## Agent's Discretion

- Wave ordering: I picked "leaf-first" (lowest-dependency folders first) so vitest failures, if any, are localized.
- Whether to also update any existing `__tests__/` test that imports via `./` instead of `../` (none found in current scan; will check during each wave).
- Whether to add a `.gitignore` rule for `.DS_Store` style metadata — out of scope; not touching.

---

## Wave 0 — Complete quick-046 Task 3 with the new `__tests__/` convention

<files>
- packages/cli/src/render/dom-host-button.tsx (delete)
- packages/cli/src/render/dom-host-deck-document.tsx (delete)
- packages/cli/src/render/dom-host-deck-key-slot.tsx (delete)
- packages/cli/src/render/dom-host-hosted-button-content.tsx (delete)
- packages/cli/src/render/dom-host.tsx (delete)
- packages/cli/src/render/dom-host.test.tsx (delete)
- packages/cli/src/render/dom-host/index.tsx (new)
- packages/cli/src/render/dom-host/button.tsx (new)
- packages/cli/src/render/dom-host/deck-document.tsx (new)
- packages/cli/src/render/dom-host/key-slot.tsx (new)
- packages/cli/src/render/dom-host/hosted-button-content.tsx (new)
- packages/cli/src/render/dom-host/__tests__/dom-host.test.tsx (new)
- packages/cli/src/render/dom-host/README.md (new)
- .planning/quick/046-render-cleanup-dom-host-folder/046-PLAN.md (note appended re. test placement)
</files>

<action>
1. Verify the existing untracked dom-host/* files match the deletions (content-wise). If yes, move `dom-host.test.tsx` → `dom-host/__tests__/dom-host.test.tsx` and fix its imports (one extra `../`).
2. `git add -A` the deletions and the new folder, plus the README if missing.
3. Single commit: `feat(quick-047 wave-0): finish quick-046 dom-host refactor + apply __tests__/ convention`.
4. Append a note to quick-046's PLAN.md explaining the test placement override.
</action>

<verify>
- `cd packages/cli && npx tsc --noEmit` reports no new errors.
- `cd packages/cli && npx vitest run src/render/dom-host` passes.
- `cd packages/cli && npx vitest run` total tests unchanged from baseline (no new failures, no missing tests).
</verify>

<done>
quick-046 Task 3 complete; the flat `dom-host-*` files are gone; the dom-host test is in `__tests__/` per the new convention; vitest + tsc clean.
</done>

---

## Wave 1 — `src/util/` (leaf, no cross-imports)

<files>
- packages/cli/src/util/clipboard.test.ts → __tests__/clipboard.test.ts
- packages/cli/src/util/daemon.test.ts → __tests__/daemon.test.ts
- packages/cli/src/util/errors.test.ts → __tests__/errors.test.ts
- packages/cli/src/util/chromium-detect.test.ts → __tests__/chromium-detect.test.ts
</files>

<action>
1. `git mv` each `.test.ts` into `src/util/__tests__/`.
2. Fix relative imports in each moved test: `./clipboard` → `../clipboard`, etc.
3. Run vitest on just the util tests; then full vitest suite.
4. Single commit: `test(quick-047 wave-1): move src/util/ tests into __tests__/`.
</action>

<verify>
- `cd packages/cli && npx vitest run src/util` passes (all 4 test files).
- `cd packages/cli && npx vitest run` no new failures vs. baseline.
- `ls packages/cli/src/util/*.test.ts` returns nothing.
</verify>

<done>
4 test files moved; relative imports fixed; vitest green; one commit.
</done>

---

## Wave 2 — `src/core/`, `src/config/`

<files>
- packages/cli/src/core/pagination.test.ts → __tests__/pagination.test.ts
- packages/cli/src/core/schemas.test.ts → __tests__/schemas.test.ts
- packages/cli/src/config/loader.test.ts → __tests__/loader.test.ts
- packages/cli/src/config/theme/theme.test.ts → __tests__/theme.test.ts
</files>

<action>
1. `git mv` each test into the correct `__tests__/` sibling.
2. Fix relative imports (`./schemas` → `../schemas`, `./loader` → `../loader`, `./theme` → `../theme`).
3. Vitest: full suite. If passing, commit.
4. Single commit: `test(quick-047 wave-2): move src/core + src/config tests into __tests__/`.
</action>

<verify>
- `cd packages/cli && npx vitest run` no new failures vs. baseline.
- `ls packages/cli/src/core/*.test.ts packages/cli/src/config/*.test.ts packages/cli/src/config/theme/*.test.ts` returns nothing.
</verify>

<done>
4 test files moved; vitest green; one commit.
</done>

---

## Wave 3 — `src/system/`, `src/action/`, `src/device/`

<files>
- packages/cli/src/system/session-monitor.test.ts → __tests__/session-monitor.test.ts
- packages/cli/src/system/active-app/get-provider.test.ts → __tests__/get-provider.test.ts
- packages/cli/src/system/active-app/linux.test.ts → __tests__/linux.test.ts
- packages/cli/src/system/active-app/wayland-gnome.test.ts → __tests__/wayland-gnome.test.ts
- packages/cli/src/system/active-app/active-app-monitor.test.ts → __tests__/active-app-monitor.test.ts
- packages/cli/src/system/key-macro/get-provider.test.ts → __tests__/get-provider.test.ts
- packages/cli/src/system/key-macro/parser.test.ts → __tests__/parser.test.ts
- packages/cli/src/action/executor.test.ts → __tests__/executor.test.ts
- packages/cli/src/device/linux-udev.test.ts → __tests__/linux-udev.test.ts
- packages/cli/src/device/registry.test.ts → __tests__/registry.test.ts
- packages/cli/src/device/stream-deck.test.ts → __tests__/stream-deck.test.ts
</files>

<action>
1. `git mv` each test into its `__tests__/` sibling.
2. Fix relative imports.
3. Vitest full suite. Commit if green.
4. Single commit: `test(quick-047 wave-3): move src/system + src/action + src/device tests into __tests__/`.
</action>

<verify>
- `cd packages/cli && npx vitest run` no new failures vs. baseline.
- `ls` for moved-from paths returns nothing.
</verify>

<done>
11 test files moved; vitest green; one commit.
</done>

---

## Wave 4 — `src/addon/`, `src/render/` (including dom-host folder is already done in Wave 0)

<files>
- packages/cli/src/addon/manifest.test.ts → __tests__/manifest.test.ts
- packages/cli/src/addon/builtin.test.ts → __tests__/builtin.test.ts
- packages/cli/src/addon/registry.test.ts → __tests__/registry.test.ts
- packages/cli/src/addon/loader.test.ts → __tests__/loader.test.ts
- packages/cli/src/render/scheduler.test.ts → __tests__/scheduler.test.ts
- packages/cli/src/render/browser-renderer.test.ts → __tests__/browser-renderer.test.ts
- packages/cli/src/render/startup-placeholder.test.ts → __tests__/startup-placeholder.test.ts
</files>

<action>
1. `git mv` each test into its `__tests__/` sibling.
2. Fix relative imports.
3. Vitest full suite. Commit if green.
4. Single commit: `test(quick-047 wave-4): move src/addon + src/render sibling tests into __tests__/`.

> Note: `dom-host.test.tsx` is already in `dom-host/__tests__/` from Wave 0.
</action>

<verify>
- `cd packages/cli && npx vitest run` no new failures vs. baseline.
- `ls` for moved-from paths returns nothing.
</verify>

<done>
7 test files moved; vitest green; one commit.
</done>

---

## Wave 5 — `src/cli/`

<files>
- packages/cli/src/cli/dev-watch.test.ts → __tests__/dev-watch.test.ts
- packages/cli/src/cli/commands/start.test.ts → __tests__/start.test.ts
</files>

<action>
1. `git mv` each test.
2. Fix relative imports (start.test.ts likely references `../start`, not `./start`).
3. Vitest full suite. Commit if green.
4. Single commit: `test(quick-047 wave-5): move src/cli tests into __tests__/`.
</action>

<verify>
- `cd packages/cli && npx vitest run` no new failures.
- `ls` for moved-from paths returns nothing.
</verify>

<done>
2 test files moved; vitest green; one commit.
</done>

---

## Wave 6 — `src/deck/` subfolder tests + `system-buttons/`

<files>
- packages/cli/src/deck/system-buttons/OverlayToggleButton.test.tsx → __tests__/OverlayToggleButton.test.tsx
</files>

<action>
1. `git mv` into `system-buttons/__tests__/`.
2. Fix relative imports.
3. Vitest full suite. Commit if green.
4. Single commit: `test(quick-047 wave-6): move src/deck/system-buttons test into __tests__/`.

> Note: `src/deck/__tests__/` already exists with 7 tests correctly placed. `src/deck/runtime.test.ts` (64KB, at deck root) is a known duplicate alongside `src/deck/__tests__/runtime.test.ts` (145KB, the real one). Verify the duplicate is stale before deleting — read first 30 lines of each and check git log.
</action>

<verify>
- `cd packages/cli && npx vitest run` no new failures.
- `ls packages/cli/src/deck/system-buttons/*.test.tsx` returns nothing.
</verify>

<done>
1 test file moved; vitest green; one commit.
</done>

---

## Wave 7 — `src/builtin-addons/` (largest wave: ~20 test files across 9 addons)

<files>
- packages/cli/src/builtin-addons/date-time/index.test.ts → __tests__/index.test.ts
- packages/cli/src/builtin-addons/date-time/buttons/date.test.tsx → __tests__/date.test.tsx
- packages/cli/src/builtin-addons/weather/index.test.ts → __tests__/index.test.ts
- packages/cli/src/builtin-addons/weather/domain/geocoder.test.ts → __tests__/geocoder.test.ts
- packages/cli/src/builtin-addons/weather/domain/unit-conversion.test.ts → __tests__/unit-conversion.test.ts
- packages/cli/src/builtin-addons/weather/domain/open-meteo-client.test.ts → __tests__/open-meteo-client.test.ts
- packages/cli/src/builtin-addons/weather/domain/weather-controller.test.ts → __tests__/weather-controller.test.ts
- packages/cli/src/builtin-addons/weather/buttons/weather.test.tsx → __tests__/weather.test.tsx
- packages/cli/src/builtin-addons/weather/buttons/components/DailyForecast.test.tsx → __tests__/DailyForecast.test.tsx
- packages/cli/src/builtin-addons/core-buttons/index.test.ts → __tests__/index.test.ts
- packages/cli/src/builtin-addons/emoji-selector/index.test.ts → __tests__/index.test.ts
- packages/cli/src/builtin-addons/media-player/index.test.ts → __tests__/index.test.ts
- packages/cli/src/builtin-addons/media-player/buttons/media-volume.test.tsx → __tests__/media-volume.test.tsx
- packages/cli/src/builtin-addons/brightness/index.test.ts → __tests__/index.test.ts
- packages/cli/src/builtin-addons/brightness/buttons/brightness.test.ts → __tests__/brightness.test.ts
- packages/cli/src/builtin-addons/brightness/buttons/BrightnessSurface.test.tsx → __tests__/BrightnessSurface.test.tsx
- packages/cli/src/builtin-addons/system-status/index.test.ts → __tests__/index.test.ts
- packages/cli/src/builtin-addons/internal-settings/index.test.ts → __tests__/index.test.ts
- packages/cli/src/builtin-addons/internal-settings/buttons/logo-version.test.tsx → __tests__/logo-version.test.tsx
- packages/cli/src/builtin-addons/internal-settings/buttons/brightness-up.test.tsx → __tests__/brightness-up.test.tsx
- packages/cli/src/builtin-addons/internal-settings/buttons/brightness-down.test.tsx → __tests__/brightness-down.test.tsx
- packages/cli/src/builtin-addons/internal-settings/buttons/current-brightness.test.tsx → __tests__/current-brightness.test.tsx
- packages/cli/src/builtin-addons/value-display/index.test.ts → __tests__/index.test.ts
</files>

<action>
1. `git mv` each test file into its `__tests__/` sibling — within each addon folder, the test moves next to its module.
2. Fix relative imports (most `index.test.ts` files import `../addon-name` style siblings — adjust to `../../addon-name` after moving into `__tests__/`).
3. Vitest full suite. Commit if green.
4. Split into 2 commits if needed (this wave is large): first `weather/ + date-time/ + core-buttons/ + emoji-selector/`, then the rest. Aim for single commit; split only if pre-commit hooks complain about size.
</action>

<verify>
- `cd packages/cli && npx vitest run` no new failures vs. baseline. Note: the project has known pre-existing failures in `runtime.test.ts` (~79) from Phase 42/67 system-back-injection — these are NOT regressions from this task.
- `ls` for moved-from paths returns nothing.
</verify>

<done>
~22 test files moved across 9 addon folders; vitest green (modulo known pre-existing failures); one or two commits.
</done>

---

## Final wave — Verify all tests follow the convention

<files>
- (none — verification only)
</files>

<action>
1. `find packages/cli/src -name "*.test.ts" -not -path "*/__tests__/*"` returns nothing.
2. `find packages/cli/src -name "*.test.tsx" -not -path "*/__tests__/*"` returns nothing.
3. `cd packages/cli && npx vitest run` passes with the same baseline failure count as before any wave started (modulo pre-existing failures).
4. `cd packages/cli && npx tsc --noEmit` reports no errors.
5. Single commit: `docs(quick-047): SUMMARY.md + STATE.md update` (no code changes — just bookkeeping).
</action>

<verify>
- Both `find` commands return zero matches.
- `npx vitest run` baseline failure count unchanged.
- `npx tsc --noEmit` clean.
</verify>

<done>
All ~46 sibling tests moved into `__tests__/`; vitest + tsc clean; convention now uniformly applied; SUMMARY.md and STATE.md updated.
</done>

---

## Note appended to quick-046 PLAN.md

The quick-046 plan (Task 3, line 16 and 23) said the `dom-host.test.tsx` would "keep co-location with code under test" by living at `dom-host/dom-host.test.tsx`. The global convention adopted in quick-047 ("Test files must be in a folder `__tests__` in the same place as the file to test") overrides this for the dom-host folder. The test was moved to `dom-host/__tests__/dom-host.test.tsx` as part of quick-047 Wave 0. No other aspect of quick-046 Task 3 changed.
