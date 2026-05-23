---
status: in_progress
phase: 20-theme-packages-and-locked-time-layout
source:
  - 20-01-PLAN.md
  - 20-02-PLAN.md
started: 2026-05-23T23:43:00+02:00
updated: 2026-05-23T23:47:00+02:00
---

# Phase 20 UAT — Theme Packages and Shared Asset Pipeline

## Current Test
number: 1
name: Manifest-backed theme packages on the browser path
expected: |
  Run `pnpm exec tsx src/cli/index.ts start --config fixtures/phase-20/config.theme-package-frame.yml`.
  The framed action button should render through the theme-owned `buttonFrame` contract, the analog clock and calendar sheet should remain honest `full_surface` escapes, and changing the fixture's first line from `theme: dark` to `theme: light` should hot-reload visibly different package-backed frame chrome and typography without stale browser pixels.
awaiting: pending

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
result: pending

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
result: pending

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0

## Gaps

none yet
