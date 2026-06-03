---
status: complete
phase: 27-theme-fallback-and-emulator-shell
source:
  - .planning/phases/27-theme-fallback-and-emulator-shell/27-01-SUMMARY.md
  - .planning/phases/27-theme-fallback-and-emulator-shell/27-02-SUMMARY.md
started: 2026-05-27T11:42:30+02:00
updated: 2026-05-27T14:00:12+02:00
---

## Current Test
number: rerun
name: Legacy YAML Theme Rejection Is Explicit (rerun after 27-03)
expected: |
  Run the repo-root raw-source CLI seam again with a temporary config that points
  `theme` at `./themes/light.yml`.

  Expected: startup should now reach theme resolution and fail fast with explicit
  manifest-backed package guidance instead of crashing in `renderDomDeck(...)`.
awaiting: none

## Tests

### 1. Cold Start Smoke Test
expected: Stop any running Sireno emulator or daemon, then run `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config config.yml`. The emulator should boot cleanly, serve the page, and render a deck instead of failing during theme/runtime startup.
result: issue
reported: "ReferenceError: React is not defined\n    at renderDomDeck (/works/opensource/sireno-deck/packages/cli/src/render/dom-host.tsx:595:5)\n    at createDeckHtml (/works/opensource/sireno-deck/packages/cli/src/cli/commands/start.ts:204:10)\n    at Object.onRenderDeck (/works/opensource/sireno-deck/packages/cli/src/cli/commands/start.ts:680:22)\n    at renderDeckSurface (/works/opensource/sireno-deck/packages/cli/src/deck/runtime.ts:448:19)\n    at async activateDeckSurface (/works/opensource/sireno-deck/packages/cli/src/deck/runtime.ts:530:5)"
severity: blocker

### 2. Legacy YAML Theme Rejection Is Explicit
expected: Point a temporary config at a legacy YAML theme file such as `./themes/light.yml` and start Sireno from that temp config. Startup should fail fast with a manifest-backed package error (`manifest.yml` missing or equivalent package guidance) instead of silently loading the YAML file as a theme.
result: pass (rerun after 27-03)
reported: "Rerun command `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config /tmp/opencode/phase27-legacy-theme.yml --port 0` now fails fast with `ConfigValidationError: Theme './themes/light.yml' could not be resolved` and suggestion `Use a built-in theme name like 'dark' or 'light', or point theme at an existing package directory.` instead of crashing in `renderDomDeck(...)`."

### 3. Built-In Default Theme Still Owns Fallback Frame And Reload
expected: Run the emulator with a config that uses a built-in theme (`dark` or `light`) and buttons that rely on the default frame path. Those buttons should still render with the built-in frame fallback. Then make a small visible edit to `packages/cli/src/themes/default/ButtonFrame.tsx`; the running emulator should refresh and show the frame change without needing a separate watcher or restart.
result: pass

### 4. Emulator Chrome Is Emulator-Only
expected: Compare shared deck HTML rendered with emulator intent versus non-emulator intent. Emulator output should include the glass/chrome shell treatment, while non-emulator output should keep the same deck structure but stay visually flatter without the emulator-only shell styling.
result: pass

### 5. Real TSX Runtime Path Works Without Ambient React Globals
expected: Run the real runtime proof through `node --import tsx/esm --eval` importing `./src/render/dom-host.tsx` and `./src/themes/default/ButtonFrame.tsx` from `packages/cli`. It should print the deck HTML prefix and a real element type without `React is not defined` or similar JSX-runtime failures.
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0

## Gaps

- truth: "Stop any running Sireno emulator or daemon, then run `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config config.yml`. The emulator should boot cleanly, serve the page, and render a deck instead of failing during theme/runtime startup."
  status: rerun_passed_via_27-03-PLAN.md
  reason: "Original blocker preserved: user reported `ReferenceError: React is not defined` at `renderDomDeck (...)`. Closure rerun after `27-03-PLAN.md` used the same repo-root raw-source CLI seam and reached healthy emulator startup (`browser deck emulator started`) without `React is not defined`."
  severity: blocker
  root_cause: "The exact repo-root UAT command still launches the raw TypeScript CLI through `pnpm exec tsx packages/cli/src/cli/index.ts ...`, but the workspace root has no `tsconfig.json`, so this seam does not inherit `packages/cli/tsconfig.json` and still compiles JSX-authored runtime modules like `packages/cli/src/render/dom-host.tsx` under the wrong JSX policy. The package-root `node --import tsx/esm` proof is green, and the same startup command also stops crashing when `tsx` is given `--tsconfig ./packages/cli/tsconfig.json`, so `dom-host.tsx` is the symptom site, not the root cause."
  affected_files:
    - tsconfig.json
    - packages/cli/src/cli/commands/start.test.ts
    - packages/cli/src/render/dom-host.tsx
  test: 1

## Rerun After 27-03-PLAN.md

- command: `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config config.yml --port 0`
  result: pass
  observed: "Repo-root raw-source emulator startup now reaches healthy boundary logs (`browser deck emulator started`, `open the local emulator page in your browser`, `press Ctrl+C to stop`) without `React is not defined`."
- command: `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config /tmp/opencode/phase27-legacy-theme.yml --port 0`
  result: pass
  observed: "Startup now reaches theme resolution and fails fast with `ConfigValidationError: Theme './themes/light.yml' could not be resolved` plus suggestion `Use a built-in theme name like 'dark' or 'light', or point theme at an existing package directory.`"

## Investigation

### Hypothesis 1: `packages/cli/src/render/dom-host.tsx` itself is still broken on all real TSX runtime paths
**Status:** denied
**Files checked:**
- `packages/cli/src/render/dom-host.tsx`
- `packages/cli/src/themes/default/ButtonFrame.tsx`
- `packages/cli/src/cli/commands/start.test.ts`
**Finding:** The package-root proof path now works: `node --import tsx/esm --eval ...` from `packages/cli` renders deck HTML and `ButtonFrame(...)` without `React is not defined`. The same code also survives the repo-root CLI launch when `tsx` is given `--tsconfig ./packages/cli/tsconfig.json`, so the shared render modules are not universally broken.
**Code path:** `node --import tsx/esm` or `tsx --tsconfig ./packages/cli/tsconfig.json` -> `src/cli/index.ts` -> `start.ts:createDeckHtml(...)` -> `renderDomDeck(...)` -> success
**Why denied:** If `dom-host.tsx` were still intrinsically broken, the explicit-tsconfig and package-root runtime proofs would fail the same way. They do not.

### Hypothesis 2: The exact repo-root raw-source CLI command is still missing the package JSX policy, so the shared render seam crashes before downstream verification can happen
**Status:** confirmed
**Files checked:**
- `packages/cli/tsconfig.json`
- `packages/cli/src/cli/index.ts`
- `packages/cli/src/cli/commands/start.test.ts`
- `packages/cli/src/render/dom-host.tsx`
- `package.json`
**Finding:** The workspace root has no `tsconfig.json`, while the package `tsconfig.json` is the only place that sets `"jsx": "react-jsx"`. The committed regression in `start.test.ts` proves a different seam (`node --import tsx/esm` from `packages/cli`), not the actual UAT command the repo advertises and the user ran (`pnpm exec tsx packages/cli/src/cli/index.ts ...` from repo root). Reproducing that exact command still throws `React is not defined` from `renderDomDeck(...)`, but adding `--tsconfig ./packages/cli/tsconfig.json` makes the crash disappear.
**Code path:** repo-root `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config config.yml` -> `src/cli/index.ts` -> `start.ts:createDeckHtml(...)` -> `renderDomDeck(...)` -> wrong JSX transform policy -> `ReferenceError: React is not defined`
**Root cause:** The product still lacks a truthful repo-root TSX policy anchor for raw-source CLI launches, so the exact UAT command runs with different JSX compilation behavior than the package-root/runtime seams Phase 27 proved.
**Evidence:**
- `packages/cli/tsconfig.json` is the only tsconfig in the repo and contains `"jsx": "react-jsx"`.
- `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config config.yml` from repo root reproduces the UAT crash in `renderDomDeck(...)`.
- `pnpm exec tsx --tsconfig ./packages/cli/tsconfig.json packages/cli/src/cli/index.ts emulate --config config.yml` reaches emulator startup without the `React is not defined` crash.
- `packages/cli/src/cli/commands/start.test.ts` currently shells `node --import tsx/esm` from `packages/cli`, which proves a neighboring seam but not the failing repo-root command.
**Confidence:** high

## Root Cause

**Location:** missing workspace-root `tsconfig.json` for repo-root raw-source CLI launches, plus incomplete regression coverage in `packages/cli/src/cli/commands/start.test.ts`
**Cause:** The exact repo-root `pnpm exec tsx packages/cli/src/cli/index.ts ...` developer/runtime path still does not inherit the package JSX policy, because `packages/cli/tsconfig.json` is the only tsconfig in the repo and the current regression coverage only proves a package-root `node --import tsx/esm` seam.
**Why it produces the symptom:** The shared deck renderer is authored with JSX expectations that are satisfied on the package-root/runtime seams, but the repo-root `tsx` CLI invocation compiles it under a different policy and throws `React is not defined` as soon as `renderDomDeck(...)` executes. That upstream crash also prevents honest observation of the downstream YAML-rejection UAT branch.
**Confidence:** high

## Proposed Fix

**Approach:** Add one truthful repo-root TSX policy anchor so raw-source CLI launches inherit the same JSX behavior the package runtime expects, then replace the current neighboring-seam regression with one that exercises the exact repo-root `pnpm exec tsx packages/cli/src/cli/index.ts ...` startup path. After that, rerun the blocked YAML-rejection UAT check.
**Files to change:**
- `tsconfig.json`: add a workspace-root tsconfig that preserves the package JSX/runtime policy for repo-root raw-source CLI launches.
- `packages/cli/src/cli/commands/start.test.ts`: add or replace focused subprocess coverage so the exact repo-root `tsx` CLI startup seam is proven, not just the package-root `node --import tsx/esm` seam.
- `.planning/phases/27-theme-fallback-and-emulator-shell/27-VERIFICATION.md`: once the closure lands, update verification so it no longer claims passed while this UAT blocker exists.

**Risk:** medium. The main risk is fixing the repo-root CLI seam in a way that diverges from package-local behavior or broadens TypeScript policy unintentionally for future workspace packages. Keep the fix anchored to the exact raw-source CLI path and prove it with the same command UAT uses.
