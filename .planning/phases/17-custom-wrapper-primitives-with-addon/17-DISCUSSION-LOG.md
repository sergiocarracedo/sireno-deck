---
phase: 17
slug: custom-wrapper-primitives-with-addon
areas_discussed:
  - ButtonShape Model
  - Base Shape Default
  - Composition Boundary
  - First Rollout Scope
  - Full-Surface Opt-Out
  - Bespoke Variant Migration
created: 2026-05-20
---

# Phase 17: Custom Wrapper Primitives + Addon-Authored Rendering Variants - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `17-CONTEXT.md`.

**Date:** 2026-05-20
**Phase:** 17-custom-wrapper-primitives-with-addon
**Areas discussed:** ButtonShape Model, Base Shape Default, Composition Boundary, First Rollout Scope, Full-Surface Opt-Out, Bespoke Variant Migration

---

## ButtonShape Model

### Terminology and concept shift

| Option | Description | Selected |
|--------|-------------|----------|
| Keep wrapper terminology | Continue the Phase 13 naming model | |
| Rename to `buttonShape` | Treat the seam as a real button-shape composition model instead of a wrapper id | ✓ |
| Introduce multiple new primitive categories | Split into several parallel naming systems immediately | |

**User's choice:** "Lets rename wrappers to buttonShape"
**Notes:** The user reframed the feature away from wrapper ids and toward a component composition model.

### Shape kinds

| Option | Description | Selected |
|--------|-------------|----------|
| No shape or base shape | Either addon renders everything, or core renders base chrome and addon renders content | ✓ |
| Catalog of many named shapes first | Ship several shape families immediately | |
| Wrapper ids plus renderer variants | Keep the old primitive model and only widen allowed values | |

**User's choice:** "The wrappers must be react components... no shape... baseShape"
**Notes:** The user wants React-component-backed shapes, not just a richer string enum.

---

## Base Shape Default

### System default

| Option | Description | Selected |
|--------|-------------|----------|
| Default for all buttons | Every button gets the core base shape unless it explicitly opts out | ✓ |
| Default only for addon buttons | Built-ins and addons follow different defaults | |
| Opt-in only | No default base shape | |

**User's choice:** `Default for all buttons (Recommended)`
**Notes:** The user wants one coherent visual language across the system.

### Base shape responsibility

| Option | Description | Selected |
|--------|-------------|----------|
| Core-owned chrome and interaction states | Base shape renders border, background, color label, tap/hold styling | ✓ |
| Minimal border only | Base shape is mostly decorative | |
| Full content layout too | Base shape dictates everything including content semantics | |

**User's choice:** "The component provides the render of the wrapper... border and background, a color label, etc, and the tab and hold styles"
**Notes:** The user wants consistency from the shape layer, not just a thin wrapper shell.

---

## Composition Boundary

### Addon responsibility inside the base shape

| Option | Description | Selected |
|--------|-------------|----------|
| Content only | Addon renders content into a defined slot; shape owns chrome | ✓ |
| Content plus layout hints | Addon can influence slot layout with extra hints | |
| Arbitrary nested render tree | Shape only wraps whatever the addon returns | |

**User's choice:** `Content only (Recommended)`
**Notes:** This keeps the seam strict and preserves visual consistency.

### Reusable helper strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit content helpers | Core exports helpers like `icon + label` and `text`, addons import them directly | ✓ |
| Implicit renderer conventions | Core infers content layouts automatically | |
| Addon-local helpers only | No shared helper exports from core | |

**User's choice:** "we can provide some contentHelpers... but the addon button should import and use them explicitly"
**Notes:** The user explicitly rejected hidden renderer magic.

---

## First Rollout Scope

### Initial shipped set

| Option | Description | Selected |
|--------|-------------|----------|
| Base + 2 helpers | Ship the base shape plus `icon + label` and `text` helpers | ✓ |
| Base + small built-in shape set | Ship multiple named shapes now | |
| Base only | Defer helpers until later | |

**User's choice:** `Base + 2 helpers (Recommended)`
**Notes:** Keeps the phase narrow while still making the new model useful.

### Public id indirection

| Option | Description | Selected |
|--------|-------------|----------|
| No `shape_id` in first rollout | Default base shape plus explicit opt-out only | ✓ |
| Add `shape_id` now | Public shape catalog from day one | |
| Addon-specific shape references | Each addon invents its own shape selection model | |

**User's choice:** "forget about shape_id"
**Notes:** The user wants the first rollout to stay simpler than another registry-id surface.

---

## Full-Surface Opt-Out

### Opt-out contract

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit opt-out flag | A narrow shared flag says this button renders the full surface | ✓ |
| Null or missing shape id | Absence of shape means full control | |
| Addon-defined custom config | Each addon chooses its own opt-out contract | |

**User's choice:** "just a flag to opt-out"
**Notes:** This preserves a consistent default and makes full-surface rendering deliberate.

---

## Bespoke Variant Migration

### Existing variant scope

| Option | Description | Selected |
|--------|-------------|----------|
| Keep bespoke variants for now | Only move the shared/default text-oriented path first | ✓ |
| Migrate simple variants too | Move shared/default plus some easy bespoke variants | |
| Migrate everything | Put all current variants on the new model immediately | |

**User's choice:** `Keep bespoke variants for now (Recommended)`
**Notes:** Keeps the phase from turning into a full renderer rewrite.

---

## Agent's Discretion

- Exact API names for the full-surface opt-out flag and helper exports.
- Exact internal migration strategy from wrapper-oriented naming to button-shape naming.
- Exact first bundled buttons used as the proof path.

---

## Deferred Ideas

- Public `shape_id` indirection in the first rollout.
- Large built-in shape catalog.
- Immediate migration of bespoke variants such as toggle, metric, media, fan, emoji, calendar-sheet, analog-clock, and error.
- CSS-like styling or renderer-wide visual DSL expansion.

---

*Phase: 17-custom-wrapper-primitives-with-addon*
*Discussion log generated: 2026-05-20*
