---
status: in_progress
phase: 18-react-dom-based-renderer-with-htmlcss
source:
  - 18-01-PLAN.md
started: 2026-05-22T16:00:00+02:00
updated: 2026-05-22T16:50:00+02:00
---

# Phase 18 UAT — Browser-Backed React TSX Deck Rendering

## Current Test
number: 1
name: browser-rendered TSX action + change-deck path stays browser-backed on device
expected: |
  Start the CLI from `packages/cli` with `pnpm exec tsx src/cli/index.ts start --config fixtures/phase-18/config.browser-rendered-action.yml`. On `main`, verify `Clock` and `Apps` render inside the implicit `buttonFrame` chrome on a browser-backed surface. Press `Apps`, confirm the `apps` deck stays browser-backed with no stale pixels, then press `Main` and confirm the original deck restores cleanly. If Chromium cannot start, the CLI should fail instead of degrading to the old SVG/text-image path.
awaiting: device verification

## Tests

## Fixture 1 — Browser-rendered TSX action + change-deck path

expected: Start the CLI from `packages/cli` with `pnpm exec tsx src/cli/index.ts start --config fixtures/phase-18/config.browser-rendered-action.yml`. On `main`, verify `Clock` and `Apps` are authored as normal React TSX, render inside the implicit `buttonFrame` chrome on a browser-backed surface, and do not rely on custom `deck-button` authoring. Press `Apps`, confirm the `apps` deck stays browser-backed and shows no stale pixels, then press `Main` and confirm the main deck restores cleanly. If the browser renderer cannot start, startup should fail honestly rather than falling back to SVG/text-image rendering.
fixture: `packages/cli/fixtures/phase-18/config.browser-rendered-action.yml`
result: awaiting
observed: not run in this worktree yet.
pass_if:
- Both decks are visibly browser-backed HTML/CSS surfaces driven from React TSX.
- Default framed buttons show implicit shared chrome from `buttonFrame`.
- Navigation updates the active surface correctly after the move to the browser-backed renderer.
- Browser startup failure exits honestly instead of silently degrading to the old path.
fail_if:
- Buttons fall back to the old SVG-looking path for this fixture.
- Navigation leaves stale pixels from the previous deck.
- Framed buttons do not visibly show the shared `buttonFrame` treatment.
- Startup warns and continues without the browser-backed renderer.

1. From `packages/cli`, run the CLI with `fixtures/phase-18/config.browser-rendered-action.yml`.
2. Confirm the main deck renders through the browser-backed TSX/react-dom path rather than the old SVG-only path.
3. Verify key 0 (`Clock`) renders inside the implicit `buttonFrame` chrome.
4. Verify key 1 (`Apps`) renders inside the implicit `buttonFrame` chrome.
5. Press key 1 and confirm navigation switches to the `apps` deck without stale content remaining on the device.
6. Verify the `apps` deck also renders through the browser-backed path and that `Main` returns to the main deck cleanly.
7. If browser startup is intentionally broken, verify the CLI exits with an error instead of continuing on a degraded fallback renderer.
