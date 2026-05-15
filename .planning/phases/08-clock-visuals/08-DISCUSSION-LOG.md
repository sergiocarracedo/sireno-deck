---
phase: 8
slug: clock-visuals
areas_discussed:
  - Visual composition
  - Text usage
  - Live cadence
  - Verification shape
created: 2026-05-15
---

# Phase 8: Clock Visuals - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `08-CONTEXT.md`.

**Date:** 2026-05-15
**Phase:** 8-clock-visuals
**Areas discussed:** Visual composition, Text usage, Live cadence, Verification shape

---

## Visual composition

| Option | Description | Selected |
|--------|-------------|----------|
| `deck-button` analog variant | Add `variant: "analog-clock"` to the existing `deck-button` render contract | ✓ |
| Shared wrapper clock | Draw the clock inside the shared wrapper shell | |
| New render primitives | Add new render elements or DOM-like clock parts | |

**User's choice:** `deck-button analog variant`
**Notes:** This keeps renderer expansion minimal and stays aligned with the existing narrow non-DOM render contract.

---

## Text usage

| Option | Description | Selected |
|--------|-------------|----------|
| Pure analog face | No text on the clock visual | ✓ |
| Optional small label | Small label or caption around the clock | |
| Analog plus date/time text | Combine the analog face with extra text annotations | |

**User's choice:** `Pure analog face`
**Notes:** This preserves legibility at 72x72 and avoids dragging Phase 8 back into typography/layout questions that belong elsewhere.

---

## Live cadence

| Option | Description | Selected |
|--------|-------------|----------|
| `1000ms` default | Update once per second by default | ✓ |
| `60000ms` default | Update once per minute by default | |
| `500ms` default | Update twice per second by default | |

**User's choice:** `1000ms default`
**Notes:** This matches the earlier milestone direction, keeps the second hand live, and remains compatible with existing `interval_ms` override behavior.

---

## Verification shape

| Option | Description | Selected |
|--------|-------------|----------|
| Addon test + renderer test + committed review fixture | Cover definition, render output, and manual review input | ✓ |
| Unit tests only | Skip committed review fixtures | |
| Fixture/UAT only | Rely mainly on manual review | |

**User's choice:** `Addon test + renderer test + committed review fixture`
**Notes:** This gives both contract-level protection and a real review surface for the new visual.

---

## Contradictions And Risks

- No contradiction in the selected set. The decisions are internally consistent with earlier phase constraints.
- The main implementation risk is making the analog clock drawing path too special-case-heavy inside `text-image.ts`. Planning should keep the clock renderer isolated enough that later calendar work does not inherit unnecessary clock-specific assumptions.
- The main product risk is legibility: a pure analog face on 72x72 has to read clearly enough that the second hand and hour/minute positions are actually useful.

---

## Agent's Discretion

- Exact hand/face styling and how much theme color influences the analog clock visual.
- Exact schema shape for the new `analog-clock` button type, as long as it remains a separate type inside the built-in date/time addon.
- Exact review fixture shape and command examples used for manual UAT.

---

## Deferred Ideas

- Optional labels or date annotations on the analog clock.
- Any broader render-surface expansion beyond the single analog clock variant.

---

*Phase: 08-clock-visuals*
*Discussion log generated: 2026-05-15*
