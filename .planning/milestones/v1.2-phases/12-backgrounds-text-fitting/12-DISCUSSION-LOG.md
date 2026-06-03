---
phase: 12
slug: backgrounds-text-fitting
areas_discussed:
  - Background contract shape
  - Background precedence scope
  - Text fitting API
  - Readability limit and variant scope
created: 2026-05-18
---

# Phase 12: Backgrounds + Text Fitting - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `12-CONTEXT.md`.

**Date:** 2026-05-18
**Phase:** 12-backgrounds-text-fitting
**Areas discussed:** Background contract shape, Background precedence scope, Text fitting API, Readability limit and variant scope

---

## Background contract shape

| Option | Description | Selected |
|--------|-------------|----------|
| Color-only backgrounds | Keep Phase 12 limited to color fills that match the current theme model | ✓ |
| Color plus simple gradient | Add a small richer background surface immediately | |
| Image/assets allowed immediately | Widen the phase into media-backed backgrounds | |

**User's choice:** `Color-only backgrounds`
**Notes:** This is the smallest correct step, matches the existing theme shape, and avoids turning Phase 12 into a background asset system.

---

## Background precedence scope

| Option | Description | Selected |
|--------|-------------|----------|
| Button override -> deck -> theme | Resolve backgrounds from per-button config, then deck fallback, then theme fallback | ✓ |
| Top-level config -> deck -> theme | Interpret "config override" as a global runtime-level override | |
| Both top-level and button-level override | Support multiple override layers immediately | |

**User's choice:** `Button override -> deck -> theme`
**Notes:** This gives the roadmap requirement a concrete and useful meaning without duplicating theme selection at a global config layer.

---

## Text fitting API

| Option | Description | Selected |
|--------|-------------|----------|
| `fit: "shrink"` default plus `fit: "wrap"` | Introduce the narrow named modes required by the roadmap | ✓ |
| `fit: "shrink" | "wrap" | "clip"` | Add a third explicit mode immediately | |
| Keep `overflow` and bolt on wrap separately | Extend the old contract instead of replacing it | |

**User's choice:** ``fit: "shrink"` default plus `fit: "wrap"``
**Notes:** This maps directly to the requirement and avoids carrying forward an underspecified clip-only seam.

---

## Readability limit and variant scope

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed renderer-owned minimum on shared/default paths first | Keep the minimum readable size internal and avoid forcing bespoke variants through the same abstraction immediately | ✓ |
| Theme-configurable minimum size | Expose the readability floor as a new public customization surface | |
| Apply the new fit contract to every variant immediately | Force all bespoke SVG variants onto the new logic in this phase | |

**User's choice:** `Fixed renderer-owned minimum on shared/default paths first`
**Notes:** The current bespoke variants are intentionally custom. Forcing them all through one fit abstraction now would make Phase 12 sprawl into a render rewrite.

---

## Contradictions And Risks

- No contradiction in the selected decisions. The chosen set is internally consistent and keeps Phase 12 scoped to explicit render-contract work.
- The main implementation risk is trying to retrofit the new fit contract into every bespoke SVG path instead of landing it cleanly in the shared/default path first.
- The main schema risk is adding too many background levels or richer media semantics before the precedence contract is proven.
- The main verification risk is asserting these behaviors through snapshots alone instead of observable precedence and wrap/shrink checks.

---

## Agent's Discretion

- Exact public/config field names for background and fit mode.
- Exact renderer-owned readable minimum size and text measurement approach.
- Exact low-risk reuse points for bespoke variants.
- Exact test fixture shape needed to keep the contract visible.

---

## Deferred Ideas

- Gradient backgrounds.
- Image or asset-backed backgrounds.
- Theme-driven readability-floor customization.
- Full migration of bespoke render variants onto shared fitting primitives.

---

*Phase: 12-backgrounds-text-fitting*
*Discussion log generated: 2026-05-18*
