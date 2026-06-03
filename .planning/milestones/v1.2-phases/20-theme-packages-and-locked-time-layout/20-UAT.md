---
status: approved
phase: 20-theme-packages-and-locked-time-layout
source:
  - 20-01-PLAN.md
  - 20-02-PLAN.md
  - 20-03-PLAN.md
started: 2026-05-23T23:43:00+02:00
updated: 2026-05-24T13:04:10+02:00
---

# Phase 20 UAT — Theme Packages, Shared Asset Pipeline, and Locked Time Layout

## Current Test
number: 2
name: Shared theme/addon asset pipeline on the browser path
expected: |
  Run `pnpm exec tsx src/cli/index.ts start --config fixtures/phase-20/config.asset-pipeline.yml`.
  The manifest-backed theme should inject packaged CSS/font assets into the browser host, the emoji selector deck and category buttons should render shipped addon icons through the shared asset pipeline, builtin refs such as `builtin://core-buttons/clock.svg` and addon refs such as `addon://emoji-selector/favorites.svg` should both resolve, and breaking a referenced asset path should fail clearly during config/theme loading rather than silently degrading.
awaiting: complete

## Fixture 1 — Theme package frame chrome on the browser path

command: `pnpm exec tsx src/cli/index.ts start --config fixtures/phase-20/config.theme-package-frame.yml`
fixture: `packages/cli/fixtures/phase-20/config.theme-package-frame.yml`
pass_if:
- The framed action buttons visibly render through browser-backed HTML/CSS with package-backed `buttonFrame` chrome rather than the old hardcoded core frame path.
- The analog clock and calendar sheet remain visibly `full_surface` surfaces and do not pick up the framed wrapper chrome.
- Editing the fixture from `theme: dark` to `theme: light` hot-reloads to a visibly different package-backed frame treatment and typography without stale pixels.
- Browser rendering still respects the `full_surface` escape hatch while framed buttons use the resolved theme runtime export.
fail_if:
- Framed buttons still appear to use only one fixed core frame regardless of the resolved theme package.
- `full_surface` surfaces such as the analog clock or calendar sheet get wrapped in the package frame.
- Changing `theme: dark` to `theme: light` does not visibly change frame chrome or leaves stale browser-rendered content behind.
result: pass
reported: "pass"

## Fixture 3 — Implicit locked fallback centered `HH:MM` row

command: `pnpm exec tsx src/cli/index.ts start --config fixtures/phase-20/config.locked-time-layout.yml`
fixture: `packages/cli/fixtures/phase-20/config.locked-time-layout.yml`
pass_if:
- The fixture renders normally on `main`, allows navigation to `review`, and omits any explicit `session.locked_deck` override.
- A supported lock transition replaces the current deck with the implicit fallback row on buttons `5..9` only, visibly arranged as `[H][H][:][M][M]` with the colon on button `7`.
- The fallback remains live on the shipped path, advancing as real time changes instead of freezing as a one-time snapshot.
- Unlock restores the exact pre-lock `review` deck rather than resetting to `main` or another shallower surface.
- If a local copy adds `session.locked_deck` (or the reviewer reruns the Phase 11 locked-session fixture), the configured locked deck still overrides the implicit fallback.
fail_if:
- Lock mode still shows the old single date-time button or renders the implicit fallback anywhere other than buttons `5..9`.
- The colon is not isolated on the center button, the row is visually misordered, or the time freezes after lock.
- Unlock drops the session onto `main`, leaves the implicit fallback visible, or otherwise loses the exact pre-lock navigation stack.
- Adding an explicit `session.locked_deck` still shows the implicit fallback row instead of the configured locked deck.
result: pass
reported: "pass"

## Fixture 2 — Shared theme/addon asset pipeline on the browser path

command: `pnpm exec tsx src/cli/index.ts start --config fixtures/phase-20/config.asset-pipeline.yml`
fixture: `packages/cli/fixtures/phase-20/config.asset-pipeline.yml`
pass_if:
- The manifest-backed theme injects packaged CSS/font assets into the browser host and the framed buttons still render correctly.
- The emoji selector deck and category buttons render shipped addon icons through the shared asset pipeline rather than raw unresolved references or missing-image placeholders.
- Builtin asset references such as `builtin://core-buttons/clock.svg` and addon asset references such as `addon://emoji-selector/favorites.svg` both resolve on the shipped browser path.
- Breaking a referenced asset path fails clearly during config/theme loading rather than silently degrading on-device.
fail_if:
- Theme stylesheet assets are not injected into the browser document or packaged font references are ignored.
- Emoji selector icons disappear, render as unresolved `addon://...` strings, or only work through one-off widget-local handling.
- The browser path resolves builtin assets but not addon assets, or vice versa.
- Broken asset paths degrade silently instead of failing with a path-aware error.
result: pass
reported: "approved"

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0

## Gaps

- None.
