---
files_modified:
  - packages/cli/src/cli/commands/start.ts
  - packages/cli/src/deck/runtime.ts
  - packages/cli/src/deck/runtime.test.ts
  - packages/cli/src/render/reconciler.ts
  - packages/cli/src/render/reconciler.test.ts
  - packages/cli/src/render/text-image.ts
  - packages/cli/src/render/text-image.test.ts
  - packages/cli/src/system/live-metrics.ts
  - packages/cli/src/system/live-metrics.test.ts
  - CHANGELOG.md
autonomous: true
single_layer_justified: true
objective: "Finish the remaining Phase 4 review regressions by wiring fan/media buttons through runtime and rendering, keeping duplicated display defaults in sync, and proving the fixes with focused regression coverage."
---

# Quick Task 002: Finish Remaining Phase 4 Review Regressions

<objective>
Close the remaining Phase 4 review regressions without reopening the architecture. Keep the fix surgical: complete the fan/media runtime-to-render path, make unsupported fan hosts degrade cleanly, and cover the duplicate display-model path that had drifted from runtime behavior.
</objective>

## Tasks

<task id="002-01">
<title>Finish fan and media runtime/render wiring</title>
<files>
- packages/cli/src/cli/commands/start.ts
- packages/cli/src/deck/runtime.ts
- packages/cli/src/deck/runtime.test.ts
- packages/cli/src/render/reconciler.ts
- packages/cli/src/render/reconciler.test.ts
- packages/cli/src/render/text-image.ts
- packages/cli/src/render/text-image.test.ts
</files>
<action>
Carry the Phase 4 fan/media button state all the way through the runtime and render pipeline. Add detail-line support to the shared button view model, make media buttons poll authoritative status and display metadata, make media taps use the existing action path, and render stable rich layouts for fan unavailable and media metadata states.
</action>
<verify>
pnpm --filter sireno-deck-cli test src/deck/runtime.test.ts src/render/reconciler.test.ts src/render/text-image.test.ts
</verify>
<done>
Fan and media buttons behave like real Phase 4 buttons instead of schema-only placeholders, and the render path can express their richer states.
</done>
</task>

<task id="002-02">
<title>Harden fan metric fallback and duplicate display defaults</title>
<files>
- packages/cli/src/system/live-metrics.ts
- packages/cli/src/system/live-metrics.test.ts
- packages/cli/src/render/reconciler.ts
- packages/cli/src/render/reconciler.test.ts
- CHANGELOG.md
</files>
<action>
Normalize fan metric reads into an explicit available/unavailable contract, including the case where `systeminformation.graphics()` throws. Keep the shared display-model helper in sync with the runtime defaults for CPU, memory, fan, and media buttons so preview rendering cannot silently diverge from live runtime rendering.
</action>
<verify>
pnpm --filter sireno-deck-cli test src/system/live-metrics.test.ts src/render/reconciler.test.ts && pnpm --filter sireno-deck-cli build
</verify>
<done>
Unsupported hosts degrade predictably, and the duplicated default-model path no longer regresses advanced-button previews.
</done>
</task>
