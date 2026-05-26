---
status: complete
phase: 24-mounted-addon-render-contract
source:
  - 24-01-SUMMARY.md
  - 24-02-SUMMARY.md
  - 24-03-SUMMARY.md
  - 24-04-SUMMARY.md
started: 2026-05-26T12:58:42+02:00
updated: 2026-05-26T13:03:00+02:00
---

## Current Test
number: 3
name: Architecture docs match the shipped runtime
expected: |
  Open `.planning/codebase/ARCHITECTURE.md` and `AGENTS.md`.

  They should describe the current runtime truth rather than the old static-instance-first model:
  - Node owns hardware semantics, navigation, polling, command execution, and addon-store lifetime
  - the active deck mounts as a React tree in Node
  - the browser path remains an HTML-in screenshot/crop transport seam
awaiting: none

## Tests

### 1. Phase 24 proof addon mounted runtime flow
expected: From the repo root, run `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config packages/cli/fixtures/phase-24/config.local-mounted-addon.yml --port 0`, open the printed emulator URL, and verify the committed Phase 24 proof addon works end to end: `Shared` / `Observer` prove addon-store coordination, `Press Probe` proves live `frameState` / `pressed` transient props, and `Local Main` / `Local Apps` prove mounted local React state persists while active but resets after deck exit.
result: pass

### 2. Shipped built-ins still behave on the mounted contract
expected: From the repo root, run `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config config.yml --port 0`, open the printed emulator URL, and verify the shipped built-ins still behave normally on the mounted contract: the main deck shows the live `date-time` button, the `Emoji` button navigates into the emoji selector deck and `Main` returns back, and the `Action` button still renders as a normal built-in action button without obviously broken labels/layout/state.
result: issue
reported: "the images are broken"
severity: major

### 3. Architecture docs match the shipped runtime
expected: Open `.planning/codebase/ARCHITECTURE.md` and `AGENTS.md`. They should describe the current runtime truth rather than the old static-instance-first model: Node owns hardware semantics, navigation, polling, command execution, and addon-store lifetime; the active deck mounts as a React tree in Node; the browser path remains an HTML-in screenshot/crop transport seam.
result: pass

## Summary

total: 3
passed: 2
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "From the repo root, run `pnpm exec tsx packages/cli/src/cli/index.ts emulate --config config.yml --port 0`, open the printed emulator URL, and verify the shipped built-ins still behave normally on the mounted contract: the main deck shows the live `date-time` button, the `Emoji` button navigates into the emoji selector deck and `Main` returns back, and the `Action` button still renders as a normal built-in action button without obviously broken labels/layout/state."
  status: failed
  reason: "User reported: the images are broken"
  severity: major
  root_cause: "Built-in icon/button images still resolve through `createDomIcon()` to `file://...` URLs via the global asset resolver, which works on the Playwright/browser-renderer capture path but breaks on the HTTP-served emulator page. The emulator shell injects deck HTML into `#deck-mount` with `mount.innerHTML = deckHtml`, but it does not proxy addon/theme assets over HTTP or rewrite those `file://` URLs to browser-loadable local endpoints, so bundled icons like the emoji/category assets render as broken images in the user-facing emulator even though the capture renderer can load them from disk."
  affected_files:
    - packages/cli/src/addon/api.ts
    - packages/cli/src/cli/commands/start.ts
    - packages/cli/src/builtin-addons/emoji-selector/index.ts
  rerun_plan: ".planning/phases/24-mounted-addon-render-contract/24-05-PLAN.md"
  test: 2
- truth: "The mounted active deck should only update when runtime-owned transient props or a button-driven refresh actually change visible state; polling cadence for buttons like `date-time` should come from the button contract, not from unconditional runtime-wide deck remount churn."
  status: failed
  reason: "User noted: The <div id=\"deck-mount\"> DOM elements updates every 1s; interval_ms should belong to the button/date-time behavior, not a runtime-wide deck update loop."
  severity: major
  root_cause: "The 1s cadence is coming from the `date-time` button contract as intended (`defaultIntervalMs: 1000`), and `createDeckRuntime().startActiveDeckPolling()` respects that per-button polling seam. The visible churn happens because each poll-triggered render still produces a new whole-deck HTML snapshot, `startEmulatorSession()` bumps the surface `version` on every `onRenderDeck`, and the emulator shell responds by refetching `/__sireno/deck` and replacing `#deck-mount` with `mount.innerHTML = deckHtml`. So the bug is not that runtime owns the clock interval; it is that the emulator transport still republishes every polled button update as a full deck-mount DOM replacement instead of a narrower keyed patch/update path."
  affected_files:
    - packages/cli/src/builtin-addons/date-time/buttons/date-time.tsx
    - packages/cli/src/deck/runtime.ts
    - packages/cli/src/cli/commands/start.ts
  rerun_plan: ".planning/phases/24-mounted-addon-render-contract/24-06-PLAN.md"
  test: 3
