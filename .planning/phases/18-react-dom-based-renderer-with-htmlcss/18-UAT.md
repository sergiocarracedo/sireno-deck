---
status: ready_for_review
phase: 18-react-dom-based-renderer-with-htmlcss
source:
  - 18-01-PLAN.md
  - 18-02-PLAN.md
  - 18-03-PLAN.md
  - 18-04-PLAN.md
started: 2026-05-22T16:00:00+02:00
updated: 2026-05-22T23:10:00+02:00
---

# Phase 18 UAT — Browser-Only React DOM Renderer

## Fixture 1 — Browser-rendered action and deck navigation

command: `pnpm exec tsx src/cli/index.ts start --config fixtures/phase-18/config.browser-rendered-action.yml`
fixture: `packages/cli/fixtures/phase-18/config.browser-rendered-action.yml`
pass_if:
- `Clock` and `Apps` render as browser-backed HTML/CSS buttons with the default `buttonFrame` chrome.
- Moving between `main` and `apps` leaves no stale pixels on-device.
- Breaking Chromium startup exits the CLI instead of reviving any legacy renderer fallback.
fail_if:
- Buttons resemble the old SVG/text-image path.
- Navigation leaves stale content behind.
- Startup continues without a working browser renderer.

## Fixture 2 — Live browser-rendered runtime surfaces

command: `pnpm exec tsx src/cli/index.ts start --config fixtures/phase-18/config.live-dom-buttons.yml`
fixture: `packages/cli/fixtures/phase-18/config.live-dom-buttons.yml`
pass_if:
- The internal toggle flips between `OFF` and `ON` while staying browser-rendered.
- `date-time`, `analog-clock`, and `calendar-sheet` remain live on the browser surface.
- Lock/reload runtime-owned surfaces continue to appear through the same browser path.
fail_if:
- Toggle state stops being visible after the browser-only cutover.
- Live surfaces freeze or fall back to non-browser rendering.

## Fixture 3 — Bounded media sampling on browser surfaces

command: `pnpm exec tsx src/cli/index.ts start --config fixtures/phase-18/config.media-sampling.yml`
fixture: `packages/cli/fixtures/phase-18/config.media-sampling.yml`
pass_if:
- `Waves` shows browser-rendered sampled media behavior, not a promise of continuous video playback.
- Repeated updates stay bounded and coalesce to the latest sampled frame.
- The browser renderer remains the only shipped render path during this review.
fail_if:
- The fixture claims or behaves like continuous playback.
- Sampling cadence is unbounded or visibly floods updates.
- Reviewers can still detect a live `text-image` or legacy render contract path in product behavior.
