---
phase: 3
status: human_needed
verified: 2026-05-12
---

# Phase 3: Themes + Basic Buttons — Verification

## Must-Have Results

| Plan | Must-Have | Status |
|------|-----------|--------|
| 03-01 | `themes/dark.yml` and `themes/light.yml` ship in the repo | ✓ |
| 03-01 | `packages/cli/src/config/theme.ts` resolves built-in theme names and filesystem paths | ✓ |
| 03-01 | Config schema requires `main_deck` and validates display-button shape | ✓ |
| 03-01 | `packages/cli/src/render/text-image.ts` renders themed button cards | ✓ |
| 03-01 | Startup renders the configured main deck instead of the Phase 2 demo | ✓ |
| 03-01 | Theme/config tests cover bad references and visible dark/light differences | ✓ |
| 03-02 | `packages/cli/package.json` includes the command execution dependency | ✓ |
| 03-02 | `packages/cli/src/device/stream-deck.ts` exposes key down/up subscription | ✓ |
| 03-02 | `packages/cli/src/action/executor.ts` runs shell commands with success/failure capture | ✓ |
| 03-02 | `packages/cli/src/deck/runtime.ts` maps key taps to built-in button behavior | ✓ |
| 03-02 | Display-command polling reuses the scheduler and re-renders only the affected key | ✓ |
| 03-02 | Tests cover tap detection, command success/failure feedback, and polling cleanup | ✓ |
| 03-03 | `packages/cli/src/deck/controller.ts` owns active-deck state and navigation stack | ✓ |
| 03-03 | Config schema validates multiple decks plus `change-deck` button targets | ✓ |
| 03-03 | Sub-decks receive an automatic back button | ✓ |
| 03-03 | Navigating between decks triggers a full active-deck re-render | ✓ |
| 03-03 | Tests cover missing target decks, back-stack behavior, and generated back-button handling | ✓ |

## Requirement Coverage

| Req ID | Deliverable | Status |
|--------|-------------|--------|
| RENDER-04 | `themes/*.yml`, `packages/cli/src/config/theme.ts` | ✓ |
| RENDER-05 | `theme` name/path resolution in `packages/cli/src/config/theme.ts` | ✓ |
| RENDER-06 | `themes/dark.yml`, `themes/light.yml` | ✓ |
| BTN-01 | Display-button schema + themed render path in `packages/cli/src/core/schemas.ts`, `packages/cli/src/render/text-image.ts` | ✓ |
| BTN-02 | Action-button execution via `packages/cli/src/action/executor.ts` and `packages/cli/src/deck/runtime.ts` | ✓ |
| BTN-03 | `display_command` polling via `packages/cli/src/deck/runtime.ts` and `packages/cli/src/render/scheduler.ts` | ✓ |
| BTN-06 | `change-deck` schema + navigation via `packages/cli/src/core/schemas.ts`, `packages/cli/src/deck/controller.ts`, `packages/cli/src/deck/runtime.ts` | ✓ |
| ADDN-08 | Generated back-button flow in `packages/cli/src/deck/runtime.ts` | ✓ |
| ADDN-09 | `main_deck` + multi-deck config in `packages/cli/src/core/schemas.ts` and `config.yml` | ✓ |

## Integration Checks

| Import | Export exists | Status |
|--------|--------------|--------|
| `start.ts` -> `resolveTheme` | `packages/cli/src/config/theme.ts` exports `resolveTheme` | ✓ |
| `start.ts` -> `createDeckRuntime` | `packages/cli/src/deck/runtime.ts` exports `createDeckRuntime` | ✓ |
| `runtime.ts` -> `createDeckController` | `packages/cli/src/deck/controller.ts` exports `createDeckController` | ✓ |
| `runtime.ts` -> `createPollingScheduler` | `packages/cli/src/render/scheduler.ts` exports `createPollingScheduler` | ✓ |

## Summary

**Score:** 17/17 must-haves verified

All automated checks passed. 3 items need human testing:
- Confirm changing `theme` in `config.yml` visibly changes all rendered buttons on real hardware.
- Confirm tapping an action button shows `...` then `OK` or `ERR` on-device and restores the label afterward.
- Confirm main deck -> sub-deck -> generated back button works on real hardware, with the approved deviation that the back button uses the last physical key.
