---
status: complete
phase: 28-component-first-tsx-theme-ui-kit-cli
source:
  - .planning/phases/28-component-first-tsx-theme-ui-kit-cli/28-01-SUMMARY.md
  - .planning/phases/28-component-first-tsx-theme-ui-kit-cli/28-02-SUMMARY.md
  - .planning/phases/28-component-first-tsx-theme-ui-kit-cli/28-03-SUMMARY.md
  - .planning/phases/28-component-first-tsx-theme-ui-kit-cli/28-04-SUMMARY.md
started: 2026-05-27T20:44:34+02:00
updated: 2026-05-27T22:36:31+02:00
---

## Current Test
number: 1
name: Public Authoring Story Matches The Shipped Surface
expected: |
  Open `README.md` and the committed authoring examples if needed. If you want a runtime
  proof, start the committed Phase 23 raw-source fixture config at
  `packages/cli/fixtures/phase-23/config.yml` through the real runtime path.

  Expected: the supported story should now consistently point addon authors at
  root-imported `defineMountedButton`, `ButtonSurface`, `Icon`, `Chip`, and `Text`, not
  deleted `createDom*` or `createBaseShape*` helpers. If you try the committed Phase 23
  raw-source fixture config, it should still start successfully through the real runtime
  path and render the component-first proof surface.
awaiting: none

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running Sireno emulator or daemon. From the repo root, run `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config config.yml --port 0`. Startup should succeed without `React is not defined` or helper-surface crashes, print the local emulator URL, and render the configured deck in the browser. On the main deck you should be able to see the shipped buttons still working on the component-first surface, including the live date-time button, the `Emoji` button, and the `Action` button.
result: pass

### 2. Theme UI Kit Presentation On Real Deck
expected: With the emulator still running on the normal repo config, inspect a button that uses the shared chrome and text primitives. The default theme should still visibly present the shared component-first surface rather than falling back to raw unstyled markup. Observable signs: the framed button chrome still looks like the shipped theme, compact chip/status chrome appears where used, and marquee/wrap text still behaves like the core-owned text contract instead of a broken theme override.
result: pass

### 3. Emoji Selector And Date-Time Built-Ins Survived The Hard Cut
expected: In the emulator, the `Emoji` button should still navigate into the emoji selector deck, the emoji entries/back button should still render correctly, and returning to the main deck should work. The live date-time button should still render and keep updating. This confirms the shipped addon families that used to depend on helper factories still work after the component-first cutover.
result: pass

### 4. Truthful Root `cli:dev` Loop Exists
expected: From the repo root, run `pnpm run cli:dev` and inspect the startup line or command behavior long enough to confirm it is the real raw-source CLI seam, not a bundler-only watcher. It should invoke `tsx watch` on `packages/cli/src/cli/index.ts start --config config.yml` and restart on repo edits covered by the explicit include graph (`packages/cli/src/**/*`, `config.yml`, `themes/**/*`, `addons/**/*`, `builtin-addons/**/*`). If you prefer not to leave it running, `pnpm run cli:dev --help` or briefly starting it and cancelling after the command shape is visible is acceptable.
result: pass

### 5. Public Authoring Story Matches The Shipped Surface
expected: Open `README.md` and the committed authoring examples if needed. The supported story should now consistently point addon authors at root-imported `defineMountedButton`, `ButtonSurface`, `Icon`, `Chip`, and `Text`, not deleted `createDom*` or `createBaseShape*` helpers. If you try the committed Phase 23 raw-source fixture config (`packages/cli/fixtures/phase-23/config.yml`), it should still start successfully through the real runtime path and render the component-first proof surface.
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0

## Gaps

none yet
