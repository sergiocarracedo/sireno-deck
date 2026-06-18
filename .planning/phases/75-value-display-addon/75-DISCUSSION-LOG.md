# Phase 75: value-display addon — Discussion Log

**Date:** 2026-06-18
**Mode:** deep
**Phase status at discussion start:** Pending discuss-phase

## Initial gray areas presented

1. **Component reuse** — Reuse LabelValueList vs new ValueDisplay surface
2. **Polling cadence** — On-activation only vs poll_interval_ms / render_interval_ms
3. **Formatters reuse location** — Import from system-status vs lift to shared module
4. **Action commands scope** — Per-button vs per-value

User selected: all 4.

## Area 1: Component reuse

**Question:** Reuse LabelValueList (1-4 lines) for value-display (1-3 values), or build a new surface?

**Options presented:**
- A: Reuse LabelValueList (recommended) — pass 1-3 lines, layouts already work
- B: New ValueDisplay surface — purpose-built
- C: Refactor LabelValueList into a generic surface — bigger refactor

**User response:** "Reuse LabelValueList (Recommended)"

**Final decision:** Reuse LabelValueList. No new surface. Layout divergence over time is a minor risk accepted for not duplicating a 146-line TSX component.

## Area 2: Polling cadence

**Question:** How should value-display run per-value commands? The success criteria doesn't mention polling. The system-status addon polls on a cadence; value-display is reactive.

**Options presented:**
- A: On-activation + on-tap (recommended) — reactive, no polling
- B: Add `poll_interval_ms` / `render_interval_ms` (matches system-status)
- C: Single fixed 1s poll

**User response:** "Add poll_interval_ms and render_interval_ms per button"

**Final decision:** Add `poll_interval_ms` and `render_interval_ms` to the value-display schema, default 1_000ms each (like system-status). User added this even though success criteria didn't mention it, for consistency with system-status.

## Area 2b: Command parallelism

**Question:** When running 2-3 commands per button, parallel or sequential?

**Options presented:**
- A: Parallel via Promise.all (recommended)
- B: Sequential in declaration order
- C: Parallel with stagger

**User response:** "Parallel via Promise.all (Recommended)"

**Final decision:** Parallel via `Promise.all`. Total wait = `max(individual times)`.

## Area 2c: Command error handling

**Question:** What happens when a per-value command fails?

**Options presented:**
- A: Show "N/A" (recommended) — matches system-status unavailable pattern
- B: Show error message — clutters UI
- C: Keep last successful value — state complexity

**User response:** "Show 'N/A' (Recommended)"

**Final decision:** Mark value as `available: false`, render with "N/A" value. No retry, no keep-last-known.

## Area 2d: Command timeout

**Question:** Command timeout per value?

**Options presented:**
- A: 5s default, schema allows override (recommended)
- B: 1s default
- C: No timeout

**User response:** "5s default, schema allows override (Recommended)"

**Final decision:** 5s default timeout per command. Optional `timeout_ms?` field on each value entry.

## Area 3: Formatters reuse location

**Question:** Where should SystemStatusFormatter live so value-display can use it?

**Options presented:**
- A: Import from `@/builtin-addons/system-status/schemas` (recommended) — direct, no refactor
- B: Lift to shared module + system-status re-imports — cleaner long-term
- C: Inline copy + dedupe later — duplicate code

**User response:** "Import from system-status/schemas (Recommended)"

**Final decision:** Direct import from system-status/schemas. Slight oddity (addon imports from another addon's schema) accepted for v1.7. Lift later if a 3rd consumer emerges.

## Area 4: Action commands scope

**Question:** Per-button (whole button) or per-value actions?

**Options presented:**
- A: Per-button, same shape as system-status (recommended)
- B: Per-value actions
- C: Per-button only, no per-value actions

**User response:** "Per-button, same shape as system-status (Recommended)"

**Final decision:** Single `commands: { tap?, hold?, 'double-tap'? }` block on the button. Use `useButtonActionCommand(({ config }) => config.commands)`. No per-value actions.

## Decisions delegated to agent's discretion

- Where to put the `formatValue(formatter, raw, units)` helper (private to value-display folder).
- Test fixture commands (use `printf` or `echo` for portable).

## Deferred ideas

- **4+ values**: use multiple buttons. Future phase.
- **Lift SystemStatusFormatter to shared module**: when a 3rd consumer emerges.
- **Per-value action commands**: not requested.

## Summary

Phase 75 is well-defined: a new `value-display` addon that reuses `LabelValueList`, polls at 1s, runs 1-3 commands in parallel with 5s default timeout, falls back to "N/A" on error, imports `SystemStatusFormatter` directly from system-status, and uses the shared `useButtonActionCommand` for per-button tap/hold/dbltap actions.
