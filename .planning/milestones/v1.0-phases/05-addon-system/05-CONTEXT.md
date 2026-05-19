# Phase 5: Addon System - Context

**Gathered:** 2026-05-14
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 remains the addon/rendering extension surface: how addons author visuals, how live addon buttons refresh, and how shared rendering primitives and theme text tokens support built-in addons consistently. This context also captures the intended extension work on top of the completed addon system: fixing the built-in `date-time` addon refresh contract and adding new built-in date/time button types that validate the addon architecture more deeply.

</domain>

<decisions>
## Implementation Decisions

### Addon Authoring Surface
- Addon authors should be able to use typed JSX with custom intrinsic elements such as `<deck-button />`, `<deck-text />`, and `<deck-surface />`.
- The existing helper functions should stay available for authors who prefer them or for cases where JSX is less convenient.
- The underlying custom reconciler contract should remain intact; this is an authoring ergonomics improvement, not a runtime model change.

### Live Update Contract
- Live addon buttons should continue using core-owned scheduling.
- Button definitions should declare `defaultIntervalMs` as their default refresh cadence.
- Button config should be allowed to override that cadence with `interval_ms` where appropriate.
- The built-in `date-time` addon family should use per-button sensible defaults rather than a blanket scheduler cadence:
  - digital/date-time button: 1000ms default
  - analog clock button: 1000ms default
  - calendar-sheet button: a slower cadence appropriate for day/date rollover rather than constant polling

### Shared Visual Primitives
- Introduce a shared button wrapper primitive that buttons can opt into, but it must remain optional.
- Analog clock and other strongly custom visuals must be free to bypass the wrapper.
- Introduce shared text behavior helpers with explicit named modes rather than accidental overflow behavior.
- Text behavior should be an intentional contract, with explicit modes such as marquee and ellipsis.

### Theme Typography Contract
- Theme typography should use full typography tokens rather than a single `font_family` string.
- The current hardcoded font usage in SVG text rendering should be replaced by theme-driven typography decisions.
- Shared text rendering and helper behavior should consume theme typography consistently.

### New Built-in Date/Time Buttons
- Keep `date-time` as a digital/text-oriented button type.
- Add `analog-clock` and `calendar-sheet` as separate button types inside the same `builtin-addons/date-time` addon package.
- Do not collapse these into a single large variant union.
- `calendar-sheet` should prioritize a today-focused tear-sheet layout rather than a dense mini month grid.

### Render Surface Evolution
- Keep the current custom render surface (`deck-button`, `deck-text`, `deck-surface`) as the main contract.
- Expand that surface minimally and only when a real rendering limit is reached.
- Avoid addon-local hacks that bypass shared render primitives just to ship the new date/time visuals quickly.

### Agent's Discretion
- Exact typography token names and structure can be chosen during planning, as long as the result is clearly theme-driven and broader than a single `font_family` field.
- The exact calendar-sheet refresh cadence can be chosen during planning, as long as it reflects the slower-changing nature of date-only visuals.
- The exact wrapper component API can be chosen during planning, as long as it stays optional and compatible with bespoke visual layouts.

</decisions>

<specifics>
## Specific Ideas

- Explain clearly in docs and code intent that `createElement('deck-button')` is building a custom React element for the Stream Deck renderer, not a DOM node.
- Make JSX authoring feel first-class for addon authors rather than forcing raw `createElement(...)` calls.
- Avoid overflow-test-driven behavior; text layout rules should be explicit and testable by contract.
- The new `calendar-sheet` should feel like a readable tear sheet on a single Stream Deck key, not a cramped calendar grid.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `packages/cli/src/addon/api.ts`
- `packages/cli/src/deck/runtime.ts`
- `packages/cli/src/render/reconciler.ts`
- `packages/cli/src/render/text-image.ts`
- `packages/cli/src/config/theme.ts`
- `builtin-addons/date-time/src/index.ts`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/cli/src/addon/api.ts`: already defines addon button instances, `refresh()`, `defaultIntervalMs`, and the theme/methods injection points.
- `packages/cli/src/render/reconciler.ts`: already owns the custom React element collection path and exposes helper constructors for deck elements.
- `packages/cli/src/render/text-image.ts`: central place for current text and SVG card rendering; this is where hardcoded font usage and future shared text behavior currently converge.
- `packages/cli/src/config/theme.ts`: current theme schema entry point; typography expansion will route through here.

### Established Patterns
- Addon buttons are stateful instances that return React output and rely on core-owned scheduling/invalidation.
- Built-in addons are expected to use the same addon registry path as external addons.
- Rendering contracts are intentionally narrow and custom rather than DOM-like.

### Integration Points
- JSX authoring support will connect to the TypeScript typing layer around the existing reconciler contract.
- Live date/time refresh behavior will connect to `defaultIntervalMs`, per-button config parsing, and runtime polling in `packages/cli/src/deck/runtime.ts`.
- Shared wrapper and text helpers will connect to the rendering utilities in `packages/cli/src/render/text-image.ts` and any deck element prop model refinements.
- New built-in button types will connect inside `builtin-addons/date-time/src/index.ts` and likely require schema, tests, and config fixture updates.

</code_context>

<deferred>
## Deferred Ideas

- None yet, but planning should explicitly call out if any typography ambitions exceed the immediate needs of Phase 5 extension work.

</deferred>

---
*Phase: 05-addon-system*
*Context gathered: 2026-05-14*
