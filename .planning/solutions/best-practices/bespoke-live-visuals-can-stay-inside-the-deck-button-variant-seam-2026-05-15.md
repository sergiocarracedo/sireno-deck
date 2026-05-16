---
title: Bespoke live visuals can stay inside the deck-button variant seam
date: 2026-05-15
category: best-practices
module: render/addon-runtime
problem_type: best_practice
severity: medium
tags: [analog-clock, render-contract, deck-button, scheduler, uat]
applies_when: Adding a new live visual to a built-in or addon button without wanting to widen the renderer into new primitives or DOM-like elements.
---

# Bespoke live visuals can stay inside the deck-button variant seam

## Context
Phase 8 needed to add a real analog clock on top of the existing addon/runtime/render contracts. The risk was widening the renderer too early with new primitives or forcing the new visual through the shared wrapper even though earlier phases explicitly preserved an escape hatch for bespoke visuals.

## Guidance
When the new visual is still conceptually “one button”, keep it inside the existing `deck-button` seam and add one narrow `variant` value rather than inventing new render nodes.

For the analog clock, that pattern looked like this:

- add a separate built-in button type in the addon (`analog-clock`)
- keep core scheduling unchanged with `defaultIntervalMs: 1000`
- carry one new `variant: "analog-clock"` value through the existing render contract
- implement a dedicated SVG branch in `packages/cli/src/render/text-image.ts`
- ship a committed fixture and UAT path for the real CLI/device review surface

This keeps the transport contract narrow while still allowing a bespoke visual.

## Why This Matters
Adding new renderer primitives too early creates long-term surface area that later phases have to support forever. For a one-key visual like an analog clock, the extra abstraction buys very little and makes the custom render contract harder to reason about.

Keeping the visual inside the `deck-button` variant seam preserves the existing addon authoring model, keeps scheduler ownership in core, and makes it easier to verify that the new visual uses the same real path the product already relies on.

## When to Apply
- The new UI is still fundamentally a single button/key visual.
- The feature can be expressed as one more renderer variant without exposing low-level scene primitives.
- Core scheduling already exists and the feature only needs a sensible default cadence plus optional override.
- You need a bespoke visual, but not a new rendering model.

## Examples
Phase 8 analog clock:

- `builtin-addons/date-time/src/index.ts` defines a separate `analog-clock` button type.
- `packages/cli/src/render/types.ts` and `packages/cli/src/render/reconciler.ts` carry `variant: "analog-clock"` end-to-end.
- `packages/cli/src/render/text-image.ts` renders the analog face in a dedicated branch.
- `packages/cli/fixtures/phase-8/config.analog-clock.yml` and `.planning/phases/08-clock-visuals/08-UAT.md` verify the real review path instead of leaving the feature proven only by synthetic unit tests.

## Related
- `.planning/phases/08-clock-visuals/08-01-SUMMARY.md`
- `.planning/phases/08-clock-visuals/08-02-SUMMARY.md`
- `.planning/phases/08-clock-visuals/08-UAT.md`
- `.planning/solutions/ui-bugs/theme-typography-difference-hidden-by-font-fallback-2026-05-15.md`
