---
phase: 7
slug: typography-text-behavior
areas_discussed:
  - Theme Typography Contract
  - Overflow Behavior Contract
  - Shared Wrapper Scope
  - Marquee Timing Contract
created: 2026-05-14
---

# Phase 7: Typography + Text Behavior - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `07-CONTEXT.md`.

**Date:** 2026-05-14
**Phase:** 7-typography-text-behavior
**Areas discussed:** Theme Typography Contract, Overflow Behavior Contract, Shared Wrapper Scope, Marquee Timing Contract

---

## Theme Typography Contract

| Option | Description | Selected |
|--------|-------------|----------|
| Three semantic roles | Theme carries `main_text`, `auxiliary_text`, and `monospace` typography roles | ✓ |
| Broader semantic role set | Theme carries more roles such as label, value, badge, detail, and micro | |
| Single font token | Theme only exposes one shared font family | |

**User's choice:** `Three semantic roles`
**Notes:** This preserves the requirement for theme-driven typography tokens but intentionally narrows the first cut so Phase 7 does not sprawl into a larger design-system exercise.

---

## Overflow Behavior Contract

| Option | Description | Selected |
|--------|-------------|----------|
| Clip only | Shared text contract supports explicit clipping only | ✓ |
| Explicit modes | Shared text contract exposes named modes such as clip, ellipsis, and marquee | |
| Renderer auto-decides | Overflow remains implementation-defined | |

**User's choice:** `Clip only`
**Notes:** This overrides the earlier broader direction toward marquee and ellipsis. Phase 7 should keep overflow explicit, but the only approved behavior in scope is clipping.

---

## Shared Wrapper Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Optional shared wrapper | `deck-button` becomes a reusable shared wrapper primitive that buttons may opt into | ✓ |
| Mandatory wrapper | All buttons must render through one shared shell | |
| Internal-only helper | Keep wrapper logic hidden inside renderer internals with no render-contract meaning | |

**User's choice:** `Optional shared wrapper`
**Notes:** The wrapper should stay available to built-in and external addons, but analog clock and other bespoke visuals must remain free to bypass it.

---

## Marquee Timing Contract

| Option | Description | Selected |
|--------|-------------|----------|
| Existing cadence only | Marquee may animate only when a button already refreshes through an existing cadence | |
| Behavior-implied cadence | Declaring marquee is allowed to imply a core-managed refresh cadence | ✓ |
| No marquee yet | Defer marquee entirely | |

**User's choice:** `Behavior-implied cadence`
**Notes:** This conflicts with the narrower `clip only` overflow decision. If planning keeps marquee out of Phase 7 scope, this timing decision becomes deferred rather than actionable.

---

## Contradictions And Risks

- `Clip only` conflicts with the separate marquee timing choice. Marquee timing only matters if marquee exists in the Phase 7 text behavior contract.
- Earlier milestone context asked for explicit named behaviors such as marquee and ellipsis. The updated choice narrows that contract materially, so planning must treat the previous wording as superseded for this phase.
- If the team still wants marquee later, Phase 7 should avoid painting itself into a corner with a text prop shape that assumes clipping is the only possible mode forever.

---

## Agent's Discretion

- Exact token field names under the three approved typography roles.
- Exact wrapper prop naming, as long as it stays optional and uses the shared typography/text behavior contract.
- Whether marquee timing is captured as a deferred rule or a reserved future contract in planning, given the current `clip only` scope choice.

---

## Deferred Ideas

- Ellipsis and marquee as user-visible text behaviors are deferred unless planning explicitly reopens them.

---

*Phase: 07-typography-text-behavior*
*Discussion log generated: 2026-05-14*
