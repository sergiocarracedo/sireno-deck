---
title: Skip Playwright screenshot when HTML hash unchanged
date: 2026-06-11
category: performance-issues
module: packages/cli/src/render/browser-renderer.ts
problem_type: performance_issue
severity: medium
tags: browser-renderer, playwright, screenshot, sha1, hash, performance, perf-01, perf-02, perf-03
---

# Skip Playwright screenshot when HTML hash unchanged

## Problem

In the browser-rendered Stream Deck path, `runCaptureLoop` (browser-renderer.ts:297) calls `activePage.screenshot({ fullPage: true })` on every update. The Chromium IPC for the screenshot is the dominant cost in the in-process hop chain (Phase 57 profile showed runtime hop chain was already fast at avg=0.37ms — the missing cost was the browser side).

Two specific user-visible problems:

1. **Back button on a previously-rendered deck** — the runtime re-fires `updateDeck(html)` with HTML the browser already has, but the capture loop calls `screenshot` again anyway. Perceived ~1s delay.
2. **Weather page cycle** — daily/hourly page transitions produce HTML with small visual diffs (only the day label changes), but the entire screenshot is re-taken.

## Symptoms

- PERF-01: back button transitions >200ms target (user-perceived ~1s)
- PERF-02: weather page transitions >300ms target
- 250ms resample cadence (Phase 35) means each re-screenshot takes 100-300ms of Chromium IPC

## What Didn't Work

- **Naive length-only check** — `if (html.length === lastHtml.length)` skips hash compute but two visually identical decks can have different attribute ordering or whitespace.
- **No length check at all** — comparing full strings on every capture is O(n) and wasteful for large decks.
- **Caching the screenshot result on the caller side** — runtime doesn't have access to the last-rendered HTML; the browser-renderer is the only place that has the complete history.

## Solution

Cache the sha1 hash of the last-rendered HTML in the browser-renderer closure. In `runCaptureLoop`, before calling `activePage.screenshot`, compute the hash of the requested HTML and compare to the cached hash. If they match AND the capture is an "update" (not "steady-state"), skip the screenshot and reuse the cached `lastCapturedBuffers`.

```ts
// In the createBrowserRenderer closure
let lastRenderedHtmlLength = -1
let lastRenderedHtmlHash: string | null = null

// In runCaptureLoop, before screenshot:
const requestedHtmlHash = computeHtmlHash(requestedHtml)
const canSkipCapture =
  captureReason === "update" &&
  renderedVersion > 0 &&
  requestedHtml.length === lastRenderedHtmlLength &&
  requestedHtmlHash === lastRenderedHtmlHash &&
  lastCapturedBuffers.size > 0

if (canSkipCapture) {
  markHop("screenshot.skipped")
  // ... reuse lastCapturedBuffers, call frameHandler with reason: "unchanged"
  continue
}

// Otherwise: normal screenshot path
// ... after screenshot, update cache:
lastRenderedHtmlLength = requestedHtml.length
lastRenderedHtmlHash = requestedHtmlHash
```

`computeHtmlHash` uses `node:crypto.createHash("sha1")` — fast (<0.1ms for typical 50KB deck HTML), zero dependencies, sufficient for "did this string change?" purposes (collision risk is irrelevant).

**Critical:** the skip is gated on `captureReason === "update"`. Steady-state captures in `liveHardwareMode` exist specifically to re-sample animated surfaces (blink/marquee) and MUST NOT be skipped — confirmed by the "does not skip the screenshot in steady-state live hardware mode" test (browser-renderer.test.ts).

## Why This Works

1. **Cheap pre-check** — string length comparison is O(1), fails fast for obviously different inputs.
2. **O(1) hash lookup** — sha1 is fast enough to run on every capture; the saving is the 30-100ms Chromium IPC.
3. **Gated on "update" only** — preserves the 250ms steady-state cadence for animated surfaces.
4. **No state leaked to callers** — the `frameHandler` callback receives a new `BrowserRendererFrame` with `reason: "unchanged"` (new in this fix) so consumers can distinguish cached vs fresh captures if they care.

## Prevention

- **Always add a "sentinel" guard** for first-render. The `renderedVersion > 0` check ensures the very first capture always runs (no cache to compare against).
- **Distinguish "update" from "steady-state" capture reasons** at the call site. Never blanket-skip screenshots — animation surfaces need re-sampling.
- **Test both directions** — same HTML should skip (count=1), different HTML should not skip (count=N).
- **Test the steady-state path** explicitly to guard against accidental over-skipping in the animation case.

## Related

- `gesture-state-spread-not-replace-2026-06-10.md` — same pattern: instrument with care, do not mutate runtime state in profile code
- `collision-map-built-never-read-2026-06-10.md` — anti-pattern: building data structures that are never read; the fix here is the opposite (cache the hash because it IS read on the hot path)
- Phase 35 (live hardware resampling) — established the 250ms resample cadence that this fix is complementary to
- Phase 57 (RESEARCH.md) — established that runtime hop chain is fast; the bottleneck is the browser side
