---
status: in_progress
phase: 20-theme-packages-and-locked-time-layout
source:
  - 20-01-PLAN.md
started: 2026-05-23T23:43:00+02:00
updated: 2026-05-23T23:43:00+02:00
---

# Phase 20 UAT — Theme Packages and Theme-Owned Frame Chrome

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

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0

## Gaps

none yet
