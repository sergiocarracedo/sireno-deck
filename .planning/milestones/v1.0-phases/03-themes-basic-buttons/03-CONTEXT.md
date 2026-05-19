# Phase 3: Themes + Basic Buttons - Context

**Gathered:** 2026-05-12
**Mode:** synthesized from direct `/plan-phase 3`
**Status:** Ready for execution planning

<domain>
## Phase Boundary

Replace the Phase 2 polling demo with the first real config-driven deck runtime: load a theme, render a configured main deck, support display-only and action buttons, and add change-deck navigation with an automatic back button for sub-decks.

</domain>

<decisions>
## Implementation Decisions

### Theme System
- The top-level `theme` value should resolve either to a built-in theme name (`dark`, `light`) or to a filesystem path pointing to a YAML theme file.
- Built-in themes should live in the repo under `themes/` and ship as normal project assets.
- Theme tokens should at minimum cover `background`, `accent`, and `primary`, with room for a few derived text/border tokens if rendering needs them.

### Deck Model
- Startup deck selection should be explicit through a required top-level `main_deck` field.
- Deck definitions should stay config-driven and keyed by id, with button positions declared per deck.
- Sub-decks should receive an automatic back button in key `0`; key `0` is therefore reserved on generated sub-deck surfaces.

### Button Model
- Introduce a small built-in button registry now so Phase 3 creates the boundary Phase 5 will extend.
- Phase 3 built-ins are `display`, `action`, `change-deck`, plus the generated `back` behavior for sub-decks.
- Action buttons should execute on a same-key `down` -> `up` tap sequence.
- Action buttons may optionally poll a display command at a configured interval and re-render only their own key when the output changes.
- Action execution should show transient per-key success or failure feedback before restoring the normal button display.

### Runtime Shape
- Keep the Phase 2 scheduler and per-key buffer dedupe path; extend them rather than replacing them.
- Add key event handling to the device layer so button runtime logic is driven by real Stream Deck input instead of startup-only demos.
- Move button/deck orchestration out of `start.ts` into small runtime modules before more button types pile up.

### Agent's Discretion
- Exact internal file split between button registry, deck controller, and action execution.
- Exact visual treatment of button cards so long as theme switching is visibly obvious on-device.
- Exact timeout value and text phrasing for action feedback.

</decisions>

<specifics>
## Specific Ideas

- The Phase 2 whole-deck polling demo served its purpose and should be removed once config-driven rendering is live; it will otherwise fight real button semantics.
- `main_deck` should fail fast if it points to a missing deck id. Silent fallback would hide misconfiguration.
- Theme loading should reuse the existing YAML validation/error pipeline so bad theme files get the same file-path and line-number quality bar as `config.yml`.
- Display-only buttons should support both plain text and icon-path config, but Phase 3 only needs one renderer path. If icon compositing is not yet worth the complexity, treat icon-path support as a text-image composition enhancement inside the same rendering helper rather than creating a second rendering engine.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- .planning/ROADMAP.md
- .planning/REQUIREMENTS.md
- .planning/phases/02-device-rendering/02-CONTEXT.md
- .planning/phases/02-device-rendering/02-01-SUMMARY.md
- .planning/phases/02-device-rendering/02-02-SUMMARY.md
- .planning/phases/02-device-rendering/02-03-SUMMARY.md

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/cli/src/core/schemas.ts`: already defines the broad config shape, but it is still too generic for `main_deck`, typed built-in button configs, and theme resolution rules.
- `packages/cli/src/config/loader.ts`: already preserves file path and line-number context for config errors; theme loading should reuse this quality bar instead of inventing a second parser path.
- `packages/cli/src/render/reconciler.ts`: currently converts React elements into text-only per-key render descriptions. It is the right place to generalize from demo labels into button render descriptions.
- `packages/cli/src/render/text-image.ts`: currently generates text images and blank keys; it should become the themed button card/image compositor.
- `packages/cli/src/render/scheduler.ts`: already provides bounded-jitter polling and should be reused for command-backed display refreshes.
- `packages/cli/src/device/stream-deck.ts`: already owns per-key write dedupe and reconnect replay; it now needs key event subscription for real button taps.
- `packages/cli/src/cli/commands/start.ts`: currently still boots the Phase 2 demo. Phase 3 should move real runtime setup out of this file so it becomes orchestration only.

### Established Patterns
- Errors are expected to preserve metadata through schema, loader, and formatter layers.
- The repo has favored the real architecture with a narrow feature slice over temporary demos.
- Tests are colocated with implementation files and should continue to cover behavior at the module boundary.

### Integration Points
- Config schema -> config loader -> theme resolver -> deck runtime is the main new startup path.
- Device key events need to flow into a runtime dispatcher that can execute command actions or navigate decks.
- Button polling should terminate cleanly through the same daemon shutdown path used for reconnect and scheduler cleanup.
- Change-deck and back actions should trigger a full active-deck re-render while preserving per-key dedupe.

</code_context>

<deferred>
## Deferred Ideas

- Toggle buttons and external-state toggle logic belong to Phase 4.
- Addon-defined button types belong to Phase 5, but Phase 3 should leave a clean registration seam.
- Multi-device deck routing and per-device deck selection remain out of scope.

</deferred>

---
*Phase: 03-themes-basic-buttons*
*Context gathered: 2026-05-12*
