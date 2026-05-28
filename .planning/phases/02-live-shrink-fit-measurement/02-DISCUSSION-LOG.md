---
phase: 2
slug: live-shrink-fit-measurement
areas_discussed:
  - Measurement ownership
  - Fallback after min floor
  - Recompute triggers
  - Scope of rollout
created: 2026-05-28
---

# Phase 2: Live Shrink-Fit Measurement - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-28
**Phase:** 02-live-shrink-fit-measurement
**Areas discussed:** Measurement ownership, Fallback after min floor, Recompute triggers, Scope of rollout

---

## Measurement ownership

| Option | Description | Selected |
|--------|-------------|----------|
| Browser DOM seam | Keep measurement in the browser-render path only, near hosted DOM/deck rendering. | |
| Inside Text component | `Text` owns the public seam and measurement logic is conceptually attached there, while browser-only activation still needs to stay honest. | ✓ |
| Theme wrapper owned | Let theme presentation layers perform shrink measurement. | |

**User's choice:** `Inside Text component`
**Notes:** I pushed back that live layout must not leak into mounted/static rendering. We resolved this as: `Text` owns the public API, but live measurement only activates on the browser path and non-browser paths degrade honestly.

### CSS Clamp Fate

| Option | Description | Selected |
|--------|-------------|----------|
| Remove as primary logic | Replace the fake clamp with measured sizing; keep only a harmless marker/base class if needed. | ✓ |
| Keep as fallback behavior | Leave clamp active underneath measured logic. | |
| Keep unchanged | Layer measurement on top of the current clamp. | |

**User's choice:** `Remove as primary logic (Recommended)`
**Notes:** This keeps one truthful shrink-fit system instead of two competing ones.

### Measurement Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Only fit=shrink text | Measure only `Text` surfaces using `fit="shrink"`. | ✓ |
| All text fits | Use one measurement engine across shrink, wrap, ellipsis, and marquee. | |
| All text by default | Make browser text generally measured unless opted out. | |

**User's choice:** `Only fit=shrink text (Recommended)`
**Notes:** This preserves the earlier narrow-contract decisions.

### Non-Browser Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Degrade honestly | Only browser output measures live; mounted/static paths stay declarative. | ✓ |
| Emulate measurement everywhere | Try to reproduce live measurement in mounted/static paths too. | |
| Special-case mounted path later | Leave the contract ambiguous for mounted output. | |

**User's choice:** `Degrade honestly (Recommended)`
**Notes:** This explicitly preserves the browser-only roadmap boundary.

---

## Fallback after min floor

| Option | Description | Selected |
|--------|-------------|----------|
| Wrap after floor | Shrink first, then allow wrapping once the readable floor is reached. | |
| Clip after floor | Stop shrinking at the floor, then clip. | |
| Ellipsis after floor | Stop shrinking at the floor, then truncate. | ✓ |

**User's choice:** `Ellipsis by default, but allow user to decide fallback, we can use fit and fit-wrap` followed by final scoped choice `Ellipsis after floor`
**Notes:** The initial answer opened scope creep by proposing a new public fallback-selection API. I pushed back because configurable fallback/floor is a new capability, not just a Phase 2 implementation detail. The final scoped Phase 2 choice is a fixed `ellipsis` fallback after the floor.

### Floor Ownership

| Option | Description | Selected |
|--------|-------------|----------|
| Renderer-owned fixed floor | Keep the floor as implementation-owned, matching Phase 12. | |
| Theme-controlled floor | Expose the minimum through theme tokens. | |
| Per-Text prop | Let each `Text` node override the floor. | ✓ |

**User's choice:** `Per-Text prop`
**Notes:** This was not accepted into scoped Phase 2 because it creates a new public API surface. It is captured as a deferred idea instead.

### Deferred Note

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, defer it | Keep Phase 2 narrow and note configurable shrink behavior for later. | ✓ |
| No, drop it | Do not carry the configurability idea forward. | |

**User's choice:** `Yes, defer it (Recommended)`
**Notes:** Configurable fallback/floor selection is explicitly noted for a later phase.

---

## Recompute triggers

| Option | Description | Selected |
|--------|-------------|----------|
| Content + container changes | Remeasure when text content or available box changes. | ✓ |
| Every render | Always recompute on render. | |
| Container changes only | Ignore content-driven changes. | |

**User's choice:** `Content + container changes (Recommended)`
**Notes:** This matches the milestone intent without widening into render-loop churn.

### Theme And Size Changes

| Option | Description | Selected |
|--------|-------------|----------|
| Treat as content-affecting inputs | Remeasure when size, typography, or theme-driven font metrics change. | ✓ |
| Ignore until remount | Only refresh after remount. | |
| Manual invalidation only | Require explicit caller-driven remeasurement. | |

**User's choice:** `Treat as content-affecting inputs (Recommended)`
**Notes:** This keeps live fit truthful when visible text metrics change.

### Loop Avoidance

| Option | Description | Selected |
|--------|-------------|----------|
| Guard aggressively | Only apply meaningful size changes through a loop-safe scheduling path. | ✓ |
| Minimal guard | Keep loop prevention minimal. | |
| No observer, polling | Use polling rather than ResizeObserver-style reactions. | |

**User's choice:** `Guard aggressively (Recommended)`
**Notes:** This explicitly avoids resize-observer feedback loops becoming the phase's main bug source.

---

## Scope of rollout

| Option | Description | Selected |
|--------|-------------|----------|
| Shared Text shrink surfaces only | Land the first measured rollout on shared `Text fit="shrink"` surfaces only. | ✓ |
| All Text consumers immediately | Force every `Text` use into measured behavior. | |
| Shared + bespoke variant rewrite | Expand into broader variant/layout rewrites. | |

**User's choice:** `Shared Text shrink surfaces only (Recommended)`
**Notes:** This preserves the earlier “narrow contract” rule and avoids a broad visual-system rewrite.

### Mounted Host Coverage

| Option | Description | Selected |
|--------|-------------|----------|
| Keep browser-only measurement, test honest degradation elsewhere | Browser path measures; mounted/static outputs remain unmeasured and are tested honestly. | ✓ |
| Make mounted output match browser exactly | Force parity through more machinery. | |
| Ignore mounted/static tests | Leave non-browser seams unverified. | |

**User's choice:** `Keep browser-only measurement, test honest degradation elsewhere (Recommended)`
**Notes:** This matches the roadmap's browser-only boundary.

### Verification Style

| Option | Description | Selected |
|--------|-------------|----------|
| Focused browser-path regressions + one reviewable fixture | Use targeted DOM/browser tests plus a visible review path. | ✓ |
| Unit tests only | Avoid review fixtures/manual proof. | |
| Manual review only | Avoid focused automated regressions. | |

**User's choice:** `Focused browser-path regressions + one reviewable fixture (Recommended)`
**Notes:** This keeps the feature both reviewable and mechanically guarded.

---

## Agent's Discretion

- Exact browser-only measurement helper placement and scheduling strategy.
- Exact readable minimum floor value and search algorithm.
- Exact regression/fixture design as long as browser measurement, loop avoidance, and honest non-browser degradation remain visible.

## Deferred Ideas

- User-configurable shrink fallback selection.
- User-configurable readable minimum floor.
- Broadening measured behavior beyond `fit="shrink"`.

---

*Phase: 02-live-shrink-fit-measurement*
*Discussion log generated: 2026-05-28*
