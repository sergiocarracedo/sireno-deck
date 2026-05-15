# Architecture Research

**Domain:** v1.1 addon UI and live widgets
**Researched:** 2026-05-14
**Confidence:** HIGH

## Component Boundaries

### Main Architecture Constraint

This milestone should stay inside the current architecture:

- addon API defines stateful button instances
- runtime owns scheduling and invalidation
- reconciler owns custom React element interpretation
- text-image renderer owns SVG composition
- theme resolver owns visual tokens

That means the new work should extend boundaries, not replace them.

### Components Most Directly Touched

| Component | Current Role | Milestone Pressure |
|-----------|--------------|--------------------|
| `packages/cli/src/render/reconciler.ts` | custom deck element interpretation | add typed JSX support and maybe small prop-surface growth |
| `packages/cli/src/render/text-image.ts` | SVG text/card rendering | add typography-driven text output, text behavior modes, wrapper primitive, clock/calendar visuals |
| `packages/cli/src/deck/runtime.ts` | scheduler + lifecycle host | keep core-owned polling and support live date/time cadence correctly |
| `packages/cli/src/config/theme.ts` | theme YAML loading | expand theme contract for typography tokens |
| `builtin-addons/date-time/src/index.ts` | built-in date/time addon | fix refresh contract and add separate `analog-clock` / `calendar-sheet` button types |

## Data Flow

### Milestone-Specific Flow

1. Theme YAML resolves typography tokens in `packages/cli/src/config/theme.ts`
2. Config validation carries per-button settings such as `interval_ms` and future text behavior flags through `packages/cli/src/core/schemas.ts`
3. Addon button definitions declare default cadence and render custom deck elements
4. `packages/cli/src/deck/runtime.ts` schedules refresh based on definition defaults plus config override
5. `packages/cli/src/render/reconciler.ts` converts JSX/helper-authored custom elements into render descriptions
6. `packages/cli/src/render/text-image.ts` turns those descriptions into SVG and finally buffers for the device

### Key Architectural Recommendation

Keep the render surface narrow and evolve it minimally. TypeScript JSX support should mostly be a typing/documentation improvement over the existing `createElement('deck-button')` path, not a new rendering abstraction. [CITED: https://www.typescriptlang.org/docs/handbook/jsx.html]

## Build Order

Recommended order for the milestone domain:

1. Fix live `date-time` refresh using existing scheduler ownership
2. Add typed JSX intrinsic support for deck elements
3. Expand theme typography and explicit text behavior contract
4. Introduce optional shared wrapper primitive in the renderer
5. Add `analog-clock`
6. Add `calendar-sheet`
7. Update examples/docs to explain custom deck elements clearly

This ordering keeps the base contracts stable before shipping the new visuals.

## Integration Points

| Boundary | Current Contract | Milestone Guidance |
|----------|------------------|--------------------|
| Addon authoring -> reconciler | custom intrinsic strings through `createElement()` | expose typed JSX support for the same intrinsic names |
| Theme -> renderer | color tokens only | add typography tokens consumed by shared text rendering |
| Button definition -> runtime scheduler | `defaultIntervalMs` and `refresh()` | reuse this for clocks and date widgets instead of adding addon-local timers |
| Render description -> SVG text | label/subtitle/detail lines and variants | add explicit text behavior and wrapper semantics before growing variants further |

---
*Architecture research for: v1.1 addon UI and live widgets*
*Researched: 2026-05-14*
