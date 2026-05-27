---
phase: 28
slug: component-first-tsx-theme-ui-kit-cli
areas_discussed:
  - Migration boundary
  - Theme UI kit contract
  - Text behavior contract
  - CLI watch loop
  - Icon libraries
created: 2026-05-27
---

# Phase 28: Component-First TSX Theme UI Kit + CLI Watch Mode - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-27
**Phase:** 28-component-first-tsx-theme-ui-kit-cli
**Areas discussed:** Migration boundary, Theme UI kit contract, Text behavior contract, CLI watch loop, Icon libraries

---

## Migration Boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Break old helpers now | Remove `createDomIcon`, `createDomTextLabel`, `createDomStack`, and `createBaseShape*` from the supported public addon API in this phase and migrate built-ins/fixtures/docs to TSX components. | ✓ |
| Deprecate first, remove later | Migrate built-ins now but keep helper exports as compatibility shims for another phase. | |
| Keep public helpers, rewrite internals only | Stop using helpers inside core while leaving them as a supported public API. | |

**User's choice:** `Break old helpers now (Recommended)`
**Notes:** The user wants a real contract cutover to component-first TSX authoring rather than another transition phase with two supported render styles.

---

## Theme UI Kit Contract

| Option | Description | Selected |
|--------|-------------|----------|
| Core exports default kit, themes override visuals | Core owns the stable `Icon`/`Chip`/`Text` API and themes can customize presentation. | ✓ |
| Core-only kit, no theme overrides | Ship reusable components from core only and rely on tokens/CSS for theme customization. | |
| Each theme ships its own full kit API | Themes fully own the component contract and addons consume them indirectly. | |

**User's choice:** `Core exports default kit, themes override visuals (Recommended)`
**Notes:** The user explicitly wants themes to customize these components, but not at the cost of a fragmented addon-facing API.

---

## Text Behavior Contract

| Option | Description | Selected |
|--------|-------------|----------|
| Text becomes the new canonical contract | Replace the old helper-level fit seam with `Text` as the real API for adapt-to-width, marquee, ellipsis, and wrap. | ✓ |
| Keep old fit contract underneath | Make `Text` mostly a wrapper over the current `fit: shrink | wrap` behavior and add other cases later. | |
| Text only covers typography, not fitting | Keep fitting elsewhere and make `Text` only a styled text primitive. | |

**User's choice:** `Text becomes the new canonical contract (Recommended)`
**Notes:** This locks Phase 28 as a contract replacement, not a cosmetic wrapper layer.

### Text Marquee Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Always animate when overflowed | Marquee auto-starts whenever the rendered text overflows. | ✓ |
| Opt-in animate prop | Marquee mode exists, but animation still requires another explicit prop. | |
| Static fallback first | Marquee mode initially behaves more like clipped or ellipsized text. | |

**User's choice:** `Always animate when overflowed (Recommended)`
**Notes:** The user preferred deterministic authoring over a second activation prop.

### Theme Override Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Presentation only | Themes can change visuals within a stable core behavior contract. | ✓ |
| Full component replacement | Themes can change both look and behavior as long as props match. | |
| Per-component mixed policy | Some kit components stay core-behavior-only while others are fully replaceable. | |

**User's choice:** `Presentation only (Recommended)`
**Notes:** This keeps `Text` semantics stable across themes and avoids behavior drift.

---

## CLI Watch Loop

| Option | Description | Selected |
|--------|-------------|----------|
| Run real start with repo config | `p cli:dev` runs the real CLI `start --config config.yml` seam through `tsx` with restart-on-change. | ✓ |
| Run emulator mode by default | Use emulator mode as the first-class dev target. | |
| Provide selector wrapper | Prompt or branch between multiple dev targets. | |

**User's choice:** `Run real start with repo config (Recommended)`
**Notes:** The user wants the real runtime seam exercised, not a dev-only alternate mode.

### Watch Scope

| Option | Description | Selected |
|--------|-------------|----------|
| CLI source plus repo config/theme/addon files | Restart on CLI source and the repo-local config/theme/addon files that matter for live iteration. | ✓ |
| Only CLI source files | Watch code only. | |
| Whole workspace restart | Restart on nearly any repo change. | |

**User's choice:** `CLI source plus repo config/theme/addon files (Recommended)`
**Notes:** The user wants edits to the real local development inputs to trigger reload, not just TypeScript changes.

---

## Icon Libraries

| Option | Description | Selected |
|--------|-------------|----------|
| Expose brand library in the same Icon API | One `Icon` API can render both generic and brand icons. | ✓ |
| Document brands separately | Keep `Icon` limited to Lucide in the first rollout. | |
| Ship a separate BrandIcon component | Keep generic and brand icons as separate public components. | |

**User's choice:** `Expose brand library in the same Icon API (Recommended)`
**Notes:** The user wants one icon component contract rather than multiple icon primitives.

### Brand Source

| Option | Description | Selected |
|--------|-------------|----------|
| Use Simple Icons | Lock Simple Icons as the brand source paired with Lucide. | ✓ |
| Research and choose later | Only lock the license/category requirements for the brand source. | |
| Keep it abstract forever | Describe API shape only and never name a concrete library. | |

**User's choice:** `Use Simple Icons (Recommended)`
**Notes:** The user accepted a concrete permissive-license brand-icon source for planning.

---

## Agent's Discretion

- Exact module/file structure for the new component kit.
- Exact prop names and implementation details for the `Icon`, `Chip`, and `Text` components.
- Exact restart orchestration for the `tsx`-driven `cli:dev` loop.
- Exact utility-class additions needed to support the component-first migration while staying inside the Sireno-owned utility layer.

## Deferred Ideas

- Full Tailwind adoption as a compile-time/build-tool subsystem.
- Theme-specific behavior overrides that would make text semantics differ between themes.

---

*Phase: 28-component-first-tsx-theme-ui-kit-cli*
*Discussion log generated: 2026-05-27*
