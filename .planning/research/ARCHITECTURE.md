# Architecture Research

**Domain:** v1.2 session context and surface composition
**Researched:** 2026-05-17
**Confidence:** HIGH

## Component Boundaries

### Main Architecture Constraint

This milestone still fits the existing architecture, but only if the new capabilities are added at the right seams:

- config/schema layer owns declared precedence and allowed config surface
- addon registry owns globally named extension primitives
- runtime owns session observation, deck switching, restore state, and dim timers
- addon button instances consume injected context instead of probing the host directly
- reconciler owns the render contract for wrappers/styles/text-fit props
- renderer owns actual SVG/background/text composition

The repo currently has no session service, no config templating seam, and only a clip-only text contract. Those are the real architectural gaps. [HIGH: codebase scan]

### Components Most Directly Touched

| Component | Current Role | Milestone Pressure |
|-----------|--------------|--------------------|
| `packages/cli/src/core/schemas.ts` | config validation and deck/button expansion | add background layering fields, locked-deck config, toggle schemas, and templating input shape |
| `packages/cli/src/addon/api.ts` | addon button/deck contracts | inject session/OS context into render and command/status paths; possibly define wrapper/style registration contracts |
| `packages/cli/src/addon/registry.ts` | registry for buttons, decks, assets | widen to globally registered wrappers/styles |
| `packages/cli/src/deck/runtime.ts` | lifecycle, polling, navigation, render invalidation | add session observation, locked-deck switching, dim timer, and restore behavior |
| `packages/cli/src/render/reconciler.ts` and `render/types.ts` | narrow render node contract | add text-fit modes and wrapper/style references without blowing up the surface |
| `packages/cli/src/render/text-image.ts` | SVG composition and rasterization | resolve background layers once, then render variants against that resolved surface |
| `packages/cli/src/config/loader.ts` | YAML load and validation orchestration | likely host config templating expansion point before validation or during bootstrap |

## Data Flow

### Recommended Flow For This Milestone

1. Load YAML config.
2. Resolve a limited template context for config expansion using core-owned OS/session snapshot.
3. Validate config and expand addon decks/buttons.
4. Build a runtime session-context service that refreshes OS/session state on a core-owned cadence.
5. Inject the same normalized context into addon instances for render and action/status execution.
6. Resolve active deck surface, including locked-deck substitution when session state demands it.
7. Resolve background precedence once for each rendered button surface: config-level override, then deck background, then theme background.
8. Reconciler emits explicit text-fit and wrapper/style identifiers.
9. Renderer composes SVG from resolved background + wrapper/style + variant visual + text-fit behavior.

### Key Architectural Recommendation

Do not let three different layers invent their own idea of “context”:

- config templating should use the same normalized OS/session shape as runtime buttons
- action/status code should receive the same shape as render code
- lock-state switching should be owned by runtime, not buried inside button logic

That keeps the milestone from becoming a bag of parallel one-off mechanisms.

## Build Order

Recommended order for the milestone domain:

1. Add normalized OS/session context model and Linux lock-state discovery seam
2. Add config support for locked deck and background layering
3. Inject context into addon instance creation and command/status helpers
4. Add render contract growth: text-fit modes and wrapper/style references
5. Add renderer support for background layering and fitting behavior
6. Add registry-backed global wrappers/styles
7. Add richer built-in toggles on top of the new runtime/config contracts
8. Add lock-switch, dim timer, and restore-state runtime behavior

This order stabilizes the host contracts before shipping user-facing widgets and visuals that depend on them.

## Integration Points

| Boundary | Current Contract | Milestone Guidance |
|----------|------------------|--------------------|
| Config -> validation | bootstrap config then full registry-backed validation | add background and locked-deck config here, not in runtime-only hidden settings |
| Runtime -> addon button instances | `button`, `config`, `methods`, `theme` | extend with normalized session/OS context and keep it stable across render/actions/status |
| Addon registry -> renderer | buttons, decks, assets only | add globally named wrapper/style primitives if the user wants cross-addon reuse |
| Reconciler -> renderer | narrow props like `label`, `subtitle`, `variant`, `overflow`, `wrapper` | evolve this minimally into explicit fit/wrap and wrapper/style ids |
| Runtime -> deck controller | active deck / back stack only | runtime must own lock substitution and restore previous active deck after unlock |

---
*Architecture research for: v1.2 session context and surface composition*
*Researched: 2026-05-17*
