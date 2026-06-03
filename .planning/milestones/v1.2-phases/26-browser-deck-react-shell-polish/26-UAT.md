---
status: complete
phase: 26-browser-deck-react-shell-polish
source:
  - 26-01-SUMMARY.md
  - 26-02-SUMMARY.md
  - 26-03-SUMMARY.md
started: 2026-05-27T09:04:42+02:00
updated: 2026-05-27T09:22:58+02:00
---

## Current Test
number: none
name: none
expected: none
awaiting: none

## Tests

### 1. Browser deck shell renders the new shared React document chrome
expected: From the repo root, run `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config config.yml --port 0`, open the printed emulator URL, and look at the deck itself (not only the outer emulator page). The deck should now look like one polished shared shell: visible spacing between keys, explicit empty wells for unused positions, and moderate bezel/glass-style chrome around the button area rather than the older flatter grid-only look. The rendered deck should still load normally and show the configured buttons inside that shell.
result: issue
reported: "ReferenceError: React is not defined at renderDomDeck (/works/opensource/sireno-deck/packages/cli/src/render/dom-host.tsx:581:5)"
severity: blocker

### 2. Undersized virtual devices now stay usable with a persistent inline warning
expected: From the repo root, run `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config config.yml --port 0`, open the emulator, then switch the virtual device to one that exposes fewer keys than the configured main deck needs (for example a 6-key layout if the current config needs more). Instead of replacing the page with an `Emulator Layout Error`, the deck should keep rendering the visible subset that fits, and inside the deck shell itself you should see a persistent warning banner such as `Layout mismatch` explaining that the selected virtual device exposes fewer keys than the configured deck needs.
result: issue
reported: "same issue"
severity: blocker

### 3. Hardware startup placeholder now behaves like one logo-backed temporary loading card
expected: Start the normal hardware/browser path in a fresh terminal with `pnpm exec tsx packages/cli/src/cli/index.ts start --config config.yml`. During startup, before the first real browser-backed deck render takes over, the temporary placeholder should feel like one deck-wide branded loading treatment derived from the shipped full logo rather than the old repeated `SIRENO / STARTING` tile copied identically onto every key. Once the real deck render appears, that temporary placeholder should disappear cleanly instead of lingering.
result: issue
reported: "i doesnt start same error relateed to react is missing"
severity: blocker

## Summary

total: 3
passed: 0
issues: 3
pending: 0
skipped: 0

## Gaps

- truth: "From the repo root, run `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config config.yml --port 0`, open the printed emulator URL, and look at the deck itself (not only the outer emulator page). The deck should now look like one polished shared shell: visible spacing between keys, explicit empty wells for unused positions, and moderate bezel/glass-style chrome around the button area rather than the older flatter grid-only look. The rendered deck should still load normally and show the configured buttons inside that shell."
  status: failed
  reason: "User reported: ReferenceError: React is not defined at renderDomDeck (/works/opensource/sireno-deck/packages/cli/src/render/dom-host.tsx:581:5)"
  severity: blocker
  root_cause: "Phase 26 converted `packages/cli/src/render/dom-host.tsx` and `packages/cli/src/render/button-frame.tsx` to JSX-authored runtime modules, but the real CLI/emulator path loads them through `tsx` using the classic React JSX runtime, so emitted JSX still expects a `React` value in scope. Neither file imports a runtime `React`, and the first call into `renderDomDeck(...)` throws before the shared shell, inline warning path, or startup handoff can render anything."
  affected_files:
    - packages/cli/src/render/dom-host.tsx
    - packages/cli/src/render/button-frame.tsx
    - packages/cli/tsconfig.json
  test: 1
- truth: "From the repo root, run `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config config.yml --port 0`, open the emulator, then switch the virtual device to one that exposes fewer keys than the configured main deck needs (for example a 6-key layout if the current config needs more). Instead of replacing the page with an `Emulator Layout Error`, the deck should keep rendering the visible subset that fits, and inside the deck shell itself you should see a persistent warning banner such as `Layout mismatch` explaining that the selected virtual device exposes fewer keys than the configured deck needs."
  status: failed
  reason: "User reported: same issue"
  severity: blocker
  root_cause: "The new shared deck document crashes at `renderDomDeck(...)` for the same JSX-runtime reason before the undersized-device branch can emit the visible subset plus inline warning. The warning behavior itself is not what failed first; the browser/emulator render seam never gets past the missing React runtime value."
  affected_files:
    - packages/cli/src/render/dom-host.tsx
    - packages/cli/src/render/button-frame.tsx
    - packages/cli/tsconfig.json
  test: 2
- truth: "Start the normal hardware/browser path in a fresh terminal with `pnpm exec tsx packages/cli/src/cli/index.ts start --config config.yml`. During startup, before the first real browser-backed deck render takes over, the temporary placeholder should feel like one deck-wide branded loading treatment derived from the shipped full logo rather than the old repeated `SIRENO / STARTING` tile copied identically onto every key. Once the real deck render appears, that temporary placeholder should disappear cleanly instead of lingering."
  status: failed
  reason: "User reported: i doesnt start same error relateed to react is missing"
  severity: blocker
  root_cause: "The hardware startup path successfully reaches the placeholder seam, but the first real browser-backed deck handoff still calls `renderDomDeck(...)`, which now throws `React is not defined` for the same JSX-runtime mismatch. That prevents the placeholder from ever handing off cleanly to the Phase 26 shell, so startup appears broken even though the placeholder code itself is not the primary failure."
  affected_files:
    - packages/cli/src/render/dom-host.tsx
    - packages/cli/src/render/button-frame.tsx
    - packages/cli/tsconfig.json
  test: 3

## Investigation

### Hypothesis 1: The new shared deck document is failing because `dom-host.tsx` now uses JSX on a runtime path that still expects a `React` value in scope
**Status:** confirmed
**Files checked:**
- `packages/cli/src/render/dom-host.tsx`
- `packages/cli/src/render/button-frame.tsx`
- `packages/cli/tsconfig.json`
- `packages/cli/src/cli/commands/start.ts`
**Finding:** `packages/cli/src/render/dom-host.tsx` now calls `renderToStaticMarkup(<DeckDocument ... />)` and `packages/cli/src/render/button-frame.tsx` returns JSX, but both files only import React types or named helpers and do not bind a runtime `React` value. Reproducing the real CLI/runtime path with `pnpm exec tsx --eval` confirms both `renderDomDeck([], { keyCount: 1 })` and `ButtonFrame({ children: null, state: 'idle' })` throw `ReferenceError: React is not defined`. `packages/cli/tsconfig.json` still sets `jsx: "react-jsx"`, but the live `tsx` execution path used by the CLI is not honoring that automatic runtime the same way these focused tests did, so the runtime output still expects classic `React` in scope.
**Code path:** `packages/cli/src/cli/commands/start.ts:createDeckHtml(...)` -> `packages/cli/src/render/dom-host.tsx:renderDomDeck(...)` -> JSX `<DeckDocument ... />` -> `ReferenceError: React is not defined`
**Root cause:** `packages/cli/src/render/dom-host.tsx:581` and `packages/cli/src/render/button-frame.tsx:9` use JSX-authored runtime code on the real `tsx` CLI path without a compatible bound React runtime value. The upstream mismatch is between the new JSX-authored implementation and the actual runtime JSX transform being used when the CLI/emulator executes these files.
**Evidence:**
- `pnpm exec tsx --eval "(async () => { const { renderDomDeck } = await import('./packages/cli/src/render/dom-host.tsx'); console.log(typeof renderDomDeck); console.log(renderDomDeck([], { keyCount: 1 }).slice(0, 40)); })().catch(...)"` -> `ReferenceError: React is not defined at renderDomDeck (.../dom-host.tsx:581:5)`
- `pnpm exec tsx --eval "(async () => { const { ButtonFrame } = await import('./packages/cli/src/render/button-frame.tsx'); const element = ButtonFrame({ children: null, state: 'idle' }); console.log(element?.props?.['data-sireno-button-frame']); })().catch(...)"` -> `ReferenceError: React is not defined at ButtonFrame (.../button-frame.tsx:9:3)`
- `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config config.yml --port 0` reproduces the same crash before shell/warning rendering.
**Confidence:** high

## Root Cause

**Location:** `packages/cli/src/render/dom-host.tsx:581` and `packages/cli/src/render/button-frame.tsx:9`
**Cause:** Phase 26 moved core runtime render files onto JSX syntax, but the real CLI/emulator `tsx` execution path is still emitting JSX that requires a runtime `React` value in scope. Those files do not provide one, so the first JSX execution crashes with `ReferenceError: React is not defined`.
**Why it produces the symptom:** Both emulator and normal startup eventually call `createDeckHtml(...)` -> `renderDomDeck(...)`. Since `renderDomDeck(...)` now instantiates a JSX `<DeckDocument ... />` and the default `ButtonFrame` is also JSX-authored, the render path crashes before the browser shell, undersized-device warning, or startup-placeholder handoff can appear.
**Confidence:** high

## Proposed Fix

**Approach:** Close the gap at the upstream seam, not in three separate symptom paths. Make the runtime render modules compatible with the actual CLI/emulator JSX execution path by either restoring explicit runtime-safe React value imports for these JSX-authored modules or otherwise forcing a runtime transform that does not require ambient `React`, then pin that behavior with one focused runtime-path regression.
**Files to change:**
- `packages/cli/src/render/dom-host.tsx`: make the shared deck document JSX runtime-safe on the real CLI path.
- `packages/cli/src/render/button-frame.tsx`: make the JSX-authored button frame runtime-safe on the same path.
- `packages/cli/src/cli/commands/start.test.ts` and/or a focused runtime-path test seam: prove `createDeckHtml(...)` or `renderDomDeck(...)` survives the real CLI-style execution path without `React is not defined`.

**Risk:** low-to-medium. The smallest correct fix should stay local to the JSX runtime seam, but it must be verified on the real `tsx` execution path rather than only through Vitest's transform behavior.

## Rerun Path

- Closure plan: `.planning/phases/26-browser-deck-react-shell-polish/26-04-PLAN.md`
- After implementing that plan, rerun `verify-work 26` so the manual shell, undersized-device warning, and startup-placeholder checks are re-executed on the real CLI/emulator path.
