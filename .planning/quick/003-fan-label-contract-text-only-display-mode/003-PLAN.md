---
files_modified:
  - packages/cli/src/deck/runtime.ts
  - packages/cli/src/deck/runtime.test.ts
  - packages/cli/src/render/reconciler.ts
  - packages/cli/src/render/reconciler.test.ts
  - packages/cli/src/render/text-image.test.ts
  - CHANGELOG.md
  - .planning/STATE.md
autonomous: true
single_layer_justified: true
objective: "Fix the Phase 4 fan preview contract so fallback text only appears when unavailable, and make `display_mode: text` render true text-only metric output without progress metadata."
---

# Quick Task 003: Fix Fan Label Contract And True Text-Only Metric Mode

<objective>
Close the remaining Phase 4 contract drift without reopening the feature. Keep it narrow: remove the fan fallback text from the shared default preview model, and make CPU/memory `display_mode: text` omit progress-specific render metadata instead of merely relabeling the card.
</objective>

## Tasks

<task id="003-01">
<title>Align fan preview defaults with runtime behavior</title>
<files>
- packages/cli/src/render/reconciler.ts
- packages/cli/src/render/reconciler.test.ts
- CHANGELOG.md
</files>
<action>
Update the duplicate display-model helper so fan buttons only contribute their configured title and variant by default. The configured unavailable fallback remains runtime-only state that appears after an unreadable fan poll, not static preview text.
</action>
<verify>
pnpm --filter sireno-deck-cli test src/render/reconciler.test.ts
</verify>
<done>
Fan preview defaults match the live runtime contract instead of preloading the unavailable fallback.
</done>
</task>

<task id="003-02">
<title>Make text display mode truly text-only</title>
<files>
- packages/cli/src/deck/runtime.ts
- packages/cli/src/deck/runtime.test.ts
- packages/cli/src/render/text-image.test.ts
- CHANGELOG.md
</files>
<action>
Update CPU and memory polling so `display_mode: text` leaves the metric label in place but omits progress-bar metadata and the synthetic `TEXT` subtitle badge. Add focused tests that prove text-only metric payloads and images differ from progress-mode rendering.
</action>
<verify>
pnpm --filter sireno-deck-cli test src/deck/runtime.test.ts src/render/text-image.test.ts
</verify>
<done>
Text-mode metric buttons now render as actual text-only cards instead of progress cards with different badge copy.
</done>
</task>
