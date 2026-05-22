---
status: complete
phase: 18-react-dom-based-renderer-with-htmlcss
source:
  - 18-01-SUMMARY.md
  - 18-02-SUMMARY.md
  - 18-03-SUMMARY.md
  - 18-04-SUMMARY.md
started: 2026-05-21T00:00:00+02:00
updated: 2026-05-21T16:30:00+02:00
---

# Phase 18 UAT — Browser-Backed DOM Deck Rendering

## Current Test
number: 3
name: bounded media sampling stays browser-backed and honest on the device surface
expected: |
  Start the CLI from `packages/cli` with `pnpm exec tsx src/cli/index.ts start --config fixtures/phase-18/config.media-sampling.yml`. On `main`, confirm `Clip Loop` visibly advances across `SKY`, `MINT`, and `ROSE` as bounded sampled snapshots rather than smooth continuous playback, and confirm `One Shot` advances to `HOLD` then stops there. `DOM Action` should still render inside the implicit `buttonFrame` chrome beside the sampled buttons. Then enter `tools` and return to `main`; the browser-backed deck should come back cleanly with no stale capture residue.
awaiting: none

## Current outcome

- Automated implementation verification is complete.
- Manual real-device UAT has been recorded as passing across all three committed fixtures.
- The browser-rendered action path, live DOM invalidation path, and sampled-media path all passed on hardware.

## Fixture 1 — Browser-rendered action + change-deck path

expected: Start the CLI from `packages/cli` with `pnpm exec tsx src/cli/index.ts start --config fixtures/phase-18/config.browser-rendered-action.yml`. On `main`, verify `Run Clock` and `Go Tools` both render inside the implicit `buttonFrame` chrome on a browser-backed DOM surface. Press `Go Tools`, confirm the `tools` deck stays browser-backed and shows no stale pixels, then press `Back Main` and confirm the main deck restores cleanly.
fixture: `packages/cli/fixtures/phase-18/config.browser-rendered-action.yml`
result: pass
observed: Browser-backed DOM rendering was visible on both decks, framed buttons showed the shared buttonFrame chrome, and navigation to `tools` / back to `main` stayed clean with no stale pixels.
pass_if:
- Both decks are visibly browser-backed DOM surfaces.
- Default framed buttons show implicit shared chrome from `buttonFrame`.
- Navigation updates the active surface correctly after the move to the browser-backed renderer.
fail_if:
- Buttons fall back to the old SVG-looking path for this fixture.
- Navigation leaves stale pixels from the previous deck.
- Framed buttons do not visibly show the shared `buttonFrame` treatment.

1. From `packages/cli`, run the CLI with `fixtures/phase-18/config.browser-rendered-action.yml`.
2. Confirm the main deck renders through the browser-backed path rather than the old SVG-only path.
3. Verify key 0 (`Run Clock`) renders inside the implicit `buttonFrame` chrome.
4. Verify key 1 (`Go Tools`) renders inside the implicit `buttonFrame` chrome.
5. Press key 1 and confirm navigation switches to the `tools` deck without stale content remaining on the device.
6. Verify the `tools` deck also renders through the browser-backed path and that `Back Main` returns to the main deck cleanly.

## Fixture 2 — Live DOM buttons stay coherent across invalidation

expected: Start the CLI from `packages/cli` with `pnpm exec tsx src/cli/index.ts start --config fixtures/phase-18/config.live-dom-buttons.yml`. On `main`, confirm the deck is browser-backed, tap `Studio Lamp` and verify it flips cleanly between `OFF` and `ON`, then wait for time/date widgets to update and confirm the deck never shows a mixed stale/current surface. Enter `Tools`, confirm the second deck stays browser-backed, then return to `main` cleanly.
fixture: `packages/cli/fixtures/phase-18/config.live-dom-buttons.yml`
result: pass
observed: Live DOM buttons stayed browser-backed, `Studio Lamp` flipped cleanly between `OFF` and `ON`, and the time/date widgets refreshed without mixed stale/current deck state during navigation.
pass_if:
- Toggle, time, analog clock, and calendar buttons all render as DOM-authored buttons through the browser-backed path.
- Live invalidation never leaves a partially updated surface.
- Navigation between `main` and `tools` preserves the DOM renderer path.
fail_if:
- Any button in this fixture visibly falls back to the old SVG helper path.
- A live update leaves stale pixels or a mixed-generation deck surface.
- Navigation returns to a stale or partially updated browser capture.

1. From `packages/cli`, run the CLI with `fixtures/phase-18/config.live-dom-buttons.yml`.
2. Confirm the main deck renders as a browser-backed DOM surface instead of the old SVG helper path.
3. Tap `Studio Lamp` and verify the subtitle flips between `OFF` and `ON` with no mixed stale/current keys.
4. Wait long enough to see the time, analog clock, or calendar buttons change, and confirm the whole DOM-backed deck remains visually coherent after each live refresh.
5. Press `Tools`, confirm the second deck also stays browser-backed, then press `Back Main` and verify the return surface is clean.

## Fixture 3 — Bounded media sampling through the browser-backed renderer

expected: Start the CLI from `packages/cli` with `pnpm exec tsx src/cli/index.ts start --config fixtures/phase-18/config.media-sampling.yml`. Confirm `Clip Loop` visibly advances across `SKY`, `MINT`, and `ROSE` as bounded sampled snapshots, confirm `One Shot` advances to `HOLD` and stays there, confirm `DOM Action` remains framed, and verify leaving/returning through `Tools` does not leave stale captures behind.
fixture: `packages/cli/fixtures/phase-18/config.media-sampling.yml`
result: pass
observed: `Clip Loop` advanced across sampled frames, `One Shot` stopped on `HOLD`, `DOM Action` stayed framed, and leaving/returning through `Tools` did not leave stale captures behind.
pass_if:
- Sampled media buttons visibly advance in bounded snapshots.
- `Clip Loop` repeats through its frames, while `One Shot` stops on its final frame.
- The neighboring action and navigation buttons remain DOM-rendered and framed.
- Navigation away from and back to the sampled deck does not leave stale captures behind.
fail_if:
- Sampled buttons stay frozen on the initial frame.
- The implementation suggests or behaves like continuous video playback instead of bounded sampling.
- The one-shot sample loops when `loop: false` is configured.
- Browser-backed navigation leaves stale pixels or drops back to the old SVG helper path.

1. From `packages/cli`, run the CLI with `fixtures/phase-18/config.media-sampling.yml`.
2. Confirm `Clip Loop` visibly advances across its labeled frames (`SKY`, `MINT`, `ROSE`) as sampled snapshots, not continuous playback.
3. Confirm `One Shot` advances to `HOLD` and then stops there instead of looping forever.
4. Verify `DOM Action` still renders through the implicit `buttonFrame` chrome beside the sampled media buttons.
5. Press `Tools`, confirm the second deck is still browser-backed DOM, then return to `main` and verify sampling resumes without stale pixels.

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0

## Result Template

If this UAT is rerun later, update each fixture block like this:

- Set `result:` to `pass`, `fail`, or `skipped`
- Fill `observed:` with 1-3 lines of what you actually saw on hardware
- Update the summary counts at the bottom
- If anything fails, add the concrete issue under `## Gaps`

## Gaps

None. All three committed Phase 18 fixtures passed on the device path.
