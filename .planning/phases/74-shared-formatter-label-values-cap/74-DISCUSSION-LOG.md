# Phase 74: Label-values cap — Discussion Log

**Date:** 2026-06-18
**Mode:** deep
**Phase status at discussion start:** Pending discuss-phase

## Initial gray areas presented

1. **Formatter precedence (Bars)** — displayValue vs formatter prop
2. **Error message for 3+ label-values** — schema rejection text
3. **Default formatter edge cases** — null/NaN/very small/negative
4. **LabelValueList formatter reuse** — does the prop apply to label-values too

User selected: all 4.

## Area 1: Formatter precedence (Bars)

**Initial question:** When both `displayValue` and `formatter` are present, which wins?

**Options presented:**
- A: displayValue > formatter > default (recommended) — backward compatible
- B: formatter overrides displayValue — cleaner but breaks system-status-bars
- C: always run formatter, displayValue becomes ignored alias

**User response:** "What is displayvalue, is it the value to display? In that case the formatter applies over the display valur"

**Interpretation:** User did not understand the distinction. Re-asked with clarification.

**Second options presented (with clarification):**
- A: displayValue > formatter > default (recommended) — pre-formatted string wins
- B: formatter always runs, displayValue ignored — would force bars.tsx refactor
- C: both, formatter secondary — nonsensical

**User response:** "Formatter always runs, displayValue ignored"

**Friction surfaced:** If formatter always runs, system-status-bars breaks because:
- It uses `toSystemStatusDisplayMetric` to pre-format each metric differently (bytes/percent/frequency)
- The `formatter` prop is component-level (one function for all bars in a bar group)
- A single button can show 1-3 different metrics, each with its own format

So `formatter always runs` would either:
- Break system-status-bars (loses per-metric formatting), or
- Force 3 separate `Bars` components per metric (loses 1-3 metrics-per-button support)

**Re-presented options:**
- A: Revert to displayValue > formatter > default (recommended)
- B: Stick with formatter-always, refactor bars.tsx to 3 separate Bars per metric
- C: Per-item formatter on BarsItem (more flexible)

**User response:** "Ok. Forget about formatter, but allow To set the number format in displayvalue"

**Final decision:** Drop BUG-07 entirely. No formatter prop on Bars. Existing displayValue mechanism (system-status addon pre-formats via `toSystemStatusDisplayMetric`) already handles per-metric formatting.

**Rationale:** The BUG-07 spec as written doesn't fit the system's existing design. Forcing it would require either breaking the system-status-bars addon or losing its per-metric formatting capability. The `displayValue` field already provides what the spec was trying to achieve.

## Area 2: Default formatter edge cases

**Status:** Dropped. Not relevant after BUG-07 was dropped.

## Area 3: LabelValueList formatter reuse

**Status:** Dropped. Spec only mentions Bars; LabelValueList already uses pre-formatted strings from the addon.

## Area 4: Error message for 3+ label-values

**Question:** When 3+ metrics are configured, what should the schema error say?

**Options presented:**
- A: Point to value-display, brief (recommended) — zod default + custom hint via .superRefine
- B: Just z.array(...).max(2), no hint — zod default
- C: Long custom error with full text — verbose

**User response:** "Point to value-display, brief (Recommended)"

**Final decision:** Use `z.array(LabelValueMetricSchema).min(1).max(2, "system-status-label-values supports 1–2 metrics; for 3+ values use the value-display addon (FEAT-02)")`. The custom message on `.max(2, "...")` is the cleanest path — no need for `.superRefine`.

## Schema shape decision

**Question:** Current code uses `z.union([z.tuple([1...]), z.tuple([2...]), z.tuple([3...]), z.tuple([4...])])`. Replace with what?

**Options presented:**
- A: z.array(...).min(1).max(2) (recommended) — matches success criteria literally
- B: z.union([tuple1, tuple2]) — more restrictive, matches current style
- C: z.array(...).max(2) only — 0 metrics allowed, wrong

**User response:** "z.array(...).min(1).max(2) (Recommended)"

**Final decision:** `z.array(LabelValueMetricSchema).min(1).max(2, "...")`.

## Decisions delegated to agent's discretion

- Whether to update `REQUIREMENTS.md` to mark BUG-07 as "satisfied" or "moved out of scope".

## Deferred ideas

- **BUG-07 (Bars formatter prop)** — dropped. Document as out of scope.
- **Per-item formatter on BarsItem** — would conflict with displayValue. Re-evaluate only if a need emerges.
- **value-display addon (FEAT-02)** — its own phase (75).

## Summary

Phase 74 scope is now narrowly defined: cap `system-status-label-values` at 1-2 metrics, with a brief error message pointing to `value-display` (FEAT-02). BUG-07 is dropped entirely.
