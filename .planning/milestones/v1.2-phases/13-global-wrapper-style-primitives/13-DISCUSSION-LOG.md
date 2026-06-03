---
phase: 13
slug: global-wrapper-style-primitives
areas_discussed:
  - Primitive Shape
  - Reference Model
  - Validation Boundary
  - Reuse Scope
created: 2026-05-18
---

# Phase 13: Global Wrapper/Style Primitives - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `13-CONTEXT.md`.

**Date:** 2026-05-18
**Phase:** 13-global-wrapper-style-primitives
**Areas discussed:** Primitive Shape, Reference Model, Validation Boundary, Reuse Scope

---

## Primitive Shape

### Contract shape

| Option | Description | Selected |
|--------|-------------|----------|
| Separate wrapper and style ids | Distinct registries and public references for structure/chrome vs visual treatment | ✓ |
| One combined primitive id | One bundled visual primitive shape | |
| Wrapper ids only | Defer style primitives to a later phase | |

**User's choice:** `Separate wrapper and style ids`
**Notes:** Keeps the contract explicit and prevents Phase 13 from collapsing back into one vague style blob.

### Definition ownership

| Option | Description | Selected |
|--------|-------------|----------|
| Addon registry definitions | Register primitives alongside addon-owned definitions | ✓ |
| Theme-only YAML definitions | Put primitive definitions in themes | |
| Core hardcoded catalog | Only ship a built-in primitive set | |

**User's choice:** `Addon registry definitions`
**Notes:** Matches the roadmap and current registry architecture.

### Naming scope

| Option | Description | Selected |
|--------|-------------|----------|
| Global namespaced ids | Use globally unique names such as `addon/primitive` | ✓ |
| Bare global names | Short ids with higher collision risk | |
| Addon-local names only | Only the defining addon can use its primitives | |

**User's choice:** `Global namespaced ids`
**Notes:** Matches the existing addon asset naming pattern and keeps cross-addon reuse viable.

---

## Reference Model

### Public reference shape

| Option | Description | Selected |
|--------|-------------|----------|
| Direct `wrapper_id` and `style_id` props | Narrow explicit render props | ✓ |
| Nested `primitive_refs` object | One nested reference bag | |
| Theme alias indirection | Resolve references through theme aliases | |

**User's choice:** `Direct wrapper_id and style_id props`
**Notes:** Best fit for the existing narrow public render contract.

### First supported surfaces

| Option | Description | Selected |
|--------|-------------|----------|
| `deck-button` and `deck-surface` buttons first | Focus the first rollout on the real button path | ✓ |
| `deck-button`, `deck-text`, and `deck-surface` all at once | Uniform rollout across all render surfaces | |
| Config only, not JSX/render props | Keep addon render props untouched for now | |

**User's choice:** `deck-button and deck-surface buttons first`
**Notes:** Covers the real seam without widening immediately into thinner paths like `deck-text`.

### Explicit-prop coexistence

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit props still win | Primitive ids compose with existing explicit props | ✓ |
| Primitive ids are exclusive mode | Primitive ids disable explicit overrides | |
| Allow with warnings only | Mixed mode but with policy warnings | |

**User's choice:** `Explicit props still win`
**Notes:** Keeps Phase 13 compositional and consistent with the Phase 12 precedence approach.

---

## Validation Boundary

### Failure point

| Option | Description | Selected |
|--------|-------------|----------|
| Config validation plus render-contract collection | Config refs fail in config validation; addon-authored refs fail before render | ✓ |
| Registry registration only | Fail during primitive registration | |
| Render-time only | Let the renderer discover invalid refs late | |

**User's choice:** `Config validation plus render-contract collection`
**Notes:** Preserves early failure for both config-authored and addon-authored paths.

### Missing provider behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Hard fail as unknown reference | Missing/unloaded addon makes the ref invalid | ✓ |
| Soft fallback to no primitive | Ignore the missing primitive | |
| Warn and continue | Best-effort behavior with a runtime warning | |

**User's choice:** `Hard fail as unknown reference`
**Notes:** Keeps the primitive contract deterministic and trustworthy.

### Validation depth

| Option | Description | Selected |
|--------|-------------|----------|
| Validate existence and basic kind only | Ensure the id exists and matches wrapper vs style kind | ✓ |
| Validate full compatibility matrix now | Enforce deeper semantic compatibility rules immediately | |
| Existence only | Ignore kind mismatches | |

**User's choice:** `Validate existence and basic kind only`
**Notes:** Keeps the first primitive contract tight without over-designing a compatibility system too early.

---

## Reuse Scope

### First consuming render path

| Option | Description | Selected |
|--------|-------------|----------|
| Shared/default button path first | Land primitives on the already-hardened shared/default seam | ✓ |
| Shared/default plus selected built-ins | Broaden the first rollout to more render branches | |
| All variants including bespoke ones | Apply primitives across the whole renderer immediately | |

**User's choice:** `Shared/default button path first`
**Notes:** Keeps Phase 13 about the primitive contract instead of becoming a renderer rewrite.

### Minimum proof of reuse

| Option | Description | Selected |
|--------|-------------|----------|
| One addon registers primitives, built-in/shared path consumes them | Cross-boundary reuse proof | ✓ |
| Two addons share one primitive family | Multi-addon proof immediately | |
| One addon reuses its own primitives across two buttons | Addon-local reuse only | |

**User's choice:** `One addon registers primitives, built-in/shared path consumes them`
**Notes:** Satisfies the roadmap requirement without overloading the first proof.

### Built-in participation

| Option | Description | Selected |
|--------|-------------|----------|
| Ship at least one bundled primitive too | Real product-visible consumer plus addon proof | ✓ |
| Only addon fixture proof first | Keep the rollout fixture-only | |
| Only bundled primitives, no addon proof | Skip external reuse proof | |

**User's choice:** `Ship at least one bundled primitive too`
**Notes:** Prevents Phase 13 from feeling like infrastructure without a product-facing consumer.

---

## Agent's Discretion

- Exact API and schema field names.
- Exact bundled primitive chosen as the first product-visible consumer.
- Exact fixture/test strategy proving reuse across addon and built-in surfaces.

---

## Deferred Ideas

- CSS-like styling system.
- Theme alias indirection for primitive references.
- Immediate rollout to `deck-text` and all bespoke variants.
- Full primitive compatibility matrix validation.

---

*Phase: 13-global-wrapper-style-primitives*
*Discussion log generated: 2026-05-18*
