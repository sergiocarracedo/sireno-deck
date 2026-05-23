---
status: complete
phase: 18-react-dom-based-renderer-with-htmlcss
source:
  - 18-01-SUMMARY.md
  - 18-02-SUMMARY.md
  - 18-03-SUMMARY.md
  - 18-04-SUMMARY.md
started: 2026-05-23T10:16:45+02:00
updated: 2026-05-23T13:30:37+02:00
---

## Current Test
number: 3
name: Bounded sampled media on browser surfaces
expected: |
  Run `pnpm exec tsx src/cli/index.ts start --config fixtures/phase-18/config.media-sampling.yml`.
  `Waves` should show browser-rendered sampled media behavior rather than fake continuous playback.
  Repeated updates should stay bounded and coalesce to the latest sampled frame.
  There should be no detectable legacy `text-image` or old render-contract behavior in product output.
awaiting: complete

## Tests

### 1. Browser-only startup and deck navigation
expected: Run `pnpm exec tsx src/cli/index.ts start --config fixtures/phase-18/config.browser-rendered-action.yml`. `Clock` and `Apps` render as browser-backed HTML/CSS buttons using the default `buttonFrame` chrome, moving between `main` and `apps` leaves no stale pixels, and breaking Chromium startup exits honestly instead of reviving a legacy fallback.
result: pass

### 2. Live browser-rendered runtime surfaces
expected: Run `pnpm exec tsx src/cli/index.ts start --config fixtures/phase-18/config.live-dom-buttons.yml`. The internal toggle flips visibly between `OFF` and `ON`, `date-time`, `analog-clock`, and `calendar-sheet` stay live on the browser surface, and runtime-owned surfaces such as lock or reload-error surfaces still appear through the browser path instead of freezing or falling back.
result: pass

### 3. Bounded sampled media on browser surfaces
expected: Run `pnpm exec tsx src/cli/index.ts start --config fixtures/phase-18/config.media-sampling.yml`. `Waves` shows browser-rendered sampled media behavior rather than fake continuous playback, repeated updates stay bounded and coalesce to the latest sampled frame, and there is no detectable legacy `text-image` or old render-contract behavior in product output.
result: pass

## Summary

total: 3
passed: 2
passed: 3
issues: 0
pending: 0
skipped: 0

## Gaps

none yet
