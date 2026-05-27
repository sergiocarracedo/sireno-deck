---
status: complete
phase: 27-theme-fallback-and-emulator-shell
source:
  - .planning/phases/27-theme-fallback-and-emulator-shell/27-01-SUMMARY.md
  - .planning/phases/27-theme-fallback-and-emulator-shell/27-02-SUMMARY.md
started: 2026-05-27T11:42:30+02:00
updated: 2026-05-27T12:48:17+02:00
---

## Current Test
number: 5
name: Real TSX Runtime Path Works Without Ambient React Globals
expected: |
  Run the real runtime proof through `node --import tsx/esm --eval` importing
  `./src/render/dom-host.tsx` and `./src/themes/default/ButtonFrame.tsx` from
  `packages/cli`.

  Expected: it should print the deck HTML prefix and a real element type without
  `React is not defined` or similar JSX-runtime failures.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: Stop any running Sireno emulator or daemon, then run `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config config.yml`. The emulator should boot cleanly, serve the page, and render a deck instead of failing during theme/runtime startup.
result: issue
reported: "ReferenceError: React is not defined\n    at renderDomDeck (/works/opensource/sireno-deck/packages/cli/src/render/dom-host.tsx:595:5)\n    at createDeckHtml (/works/opensource/sireno-deck/packages/cli/src/cli/commands/start.ts:204:10)\n    at Object.onRenderDeck (/works/opensource/sireno-deck/packages/cli/src/cli/commands/start.ts:680:22)\n    at renderDeckSurface (/works/opensource/sireno-deck/packages/cli/src/deck/runtime.ts:448:19)\n    at async activateDeckSurface (/works/opensource/sireno-deck/packages/cli/src/deck/runtime.ts:530:5)"
severity: blocker

### 2. Legacy YAML Theme Rejection Is Explicit
expected: Point a temporary config at a legacy YAML theme file such as `./themes/light.yml` and start Sireno from that temp config. Startup should fail fast with a manifest-backed package error (`manifest.yml` missing or equivalent package guidance) instead of silently loading the YAML file as a theme.
result: issue
reported: "i can test ti, same error as UAT 1"
severity: blocker

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
passed: 3
issues: 2
pending: 0
skipped: 0

## Gaps

- truth: "Stop any running Sireno emulator or daemon, then run `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config config.yml`. The emulator should boot cleanly, serve the page, and render a deck instead of failing during theme/runtime startup."
  status: failed
  reason: "User reported: ReferenceError: React is not defined at renderDomDeck (/works/opensource/sireno-deck/packages/cli/src/render/dom-host.tsx:595:5) at createDeckHtml (/works/opensource/sireno-deck/packages/cli/src/cli/commands/start.ts:204:10) at Object.onRenderDeck (/works/opensource/sireno-deck/packages/cli/src/cli/commands/start.ts:680:22) at renderDeckSurface (/works/opensource/sireno-deck/packages/cli/src/deck/runtime.ts:448:19) at async activateDeckSurface (/works/opensource/sireno-deck/packages/cli/src/deck/runtime.ts:530:5)"
  severity: blocker
  test: 1
- truth: "Point a temporary config at a legacy YAML theme file such as `./themes/light.yml` and start Sireno from that temp config. Startup should fail fast with a manifest-backed package error (`manifest.yml` missing or equivalent package guidance) instead of silently loading the YAML file as a theme."
  status: failed
  reason: "User reported: i can test ti, same error as UAT 1"
  severity: blocker
  test: 2
