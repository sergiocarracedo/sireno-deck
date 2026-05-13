---
files_modified:
  - packages/cli/src/deck/runtime.ts
  - packages/cli/src/deck/runtime.test.ts
  - packages/cli/src/system/live-metrics.ts
  - packages/cli/src/system/live-metrics.test.ts
  - CHANGELOG.md
  - .planning/STATE.md
autonomous: true
single_layer_justified: true
objective: "Start per-button polling immediately during deck activation and treat 0 RPM as valid fan data."
---

# Quick Task 006: Start Polling Immediately And Treat Zero RPM As Valid Fan Data

<objective>
Tighten the existing Phase 4 polling behavior without reopening the design. Polling should begin as soon as a deck activates instead of waiting for priming to settle, and readable fan sensors reporting `0 RPM` should render as valid idle data rather than being normalized into unavailability.
</objective>

## Tasks

<task id="006-01">
<title>Start schedulers immediately during activation</title>
<files>
- packages/cli/src/deck/runtime.ts
- packages/cli/src/deck/runtime.test.ts
- CHANGELOG.md
</files>
<action>
Update deck activation so per-button schedulers start immediately after the initial deck render instead of only after priming settles. Keep priming asynchronous and guarded by the activation token, and add regression coverage proving scheduler startup is not blocked by a slow priming refresh.
</action>
<verify>
pnpm --filter sireno-deck-cli test src/deck/runtime.test.ts
</verify>
<done>
Slow priming no longer delays per-button polling startup for the rest of the active deck.
</done>
</task>

<task id="006-02">
<title>Accept zero RPM as readable fan telemetry</title>
<files>
- packages/cli/src/system/live-metrics.ts
- packages/cli/src/system/live-metrics.test.ts
- CHANGELOG.md
</files>
<action>
Update the fan metrics adapter so finite numeric `fanSpeed` values of `0` are treated as readable sensor data. Add focused tests proving `0 RPM` is returned as available data, while controllers with missing sensor values still normalize to the unavailable state.
</action>
<verify>
pnpm --filter sireno-deck-cli test src/system/live-metrics.test.ts
</verify>
<done>
Idle but readable fan sensors now render `0 RPM` instead of falling back to the unavailable state.
</done>
</task>
