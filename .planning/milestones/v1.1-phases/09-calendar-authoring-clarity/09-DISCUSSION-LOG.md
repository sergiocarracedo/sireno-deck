---
phase: 9
slug: calendar-authoring-clarity
areas_discussed:
  - Calendar layout
  - Refresh cadence
  - Render contract usage
  - Authoring clarity docs
  - Verification shape
created: 2026-05-16
---

# Phase 9: Calendar + Authoring Clarity - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `09-CONTEXT.md`.

**Date:** 2026-05-16
**Phase:** 9-calendar-authoring-clarity
**Areas discussed:** Calendar layout, Refresh cadence, Render contract usage, Authoring clarity docs, Verification shape

---

## Calendar layout

| Option | Description | Selected |
|--------|-------------|----------|
| Tear-sheet with big day number plus small weekday/month | Single-key tear-sheet visual with one dominant date number and supporting context | ✓ |
| Big day number only | Extremely minimal tear-sheet with no weekday/month context | |
| Dense month grid | Mini month calendar compressed into one key | |

**User's choice:** `Tear-sheet with big day number plus small weekday/month`
**Notes:** This matches the roadmap direction and keeps the calendar readable at Stream Deck key size.

---

## Refresh cadence

| Option | Description | Selected |
|--------|-------------|----------|
| `3600000ms` default | Refresh hourly by default | |
| `60000ms` default | Refresh once per minute by default | ✓ |
| `86400000ms` default | Refresh once per day by default | |

**User's choice:** `60000ms default`
**Notes:** This is intentionally more conservative than the hourly recommendation so midnight rollover and visible date transitions are always prompt without requiring restart timing luck.

---

## Render contract usage

| Option | Description | Selected |
|--------|-------------|----------|
| `deck-button` calendar variant | Keep the calendar inside the existing `deck-button` seam as `variant: "calendar-sheet"` | ✓ |
| Shared wrapper calendar | Force the calendar through the shared wrapper shell | |
| New render nodes | Add new render node types or layout primitives | |

**User's choice:** `deck-button calendar variant`
**Notes:** This continues the Phase 8 pattern of adding a bespoke visual without widening the renderer more than necessary.

---

## Authoring clarity docs

| Option | Description | Selected |
|--------|-------------|----------|
| Focused docs page plus explicit addon-style example | Ship a clear non-DOM explanation and a concrete example of JSX/helper authoring | ✓ |
| README edits only | Scatter the explanation across existing docs | |
| Example only | Rely on example code without explicit docs narrative | |

**User's choice:** `Focused docs page plus explicit addon-style example`
**Notes:** This is the smallest choice that still satisfies the requirement to explain the custom render model clearly instead of leaving addon authors to infer it.

---

## Verification shape

| Option | Description | Selected |
|--------|-------------|----------|
| Addon test + renderer test + committed fixture + docs/example verification | Cover widget behavior and authoring clarity together | ✓ |
| Widget tests only | Focus only on calendar-sheet runtime/render behavior | |
| Docs-heavy verification with minimal widget coverage | Focus mostly on authoring explanation | |

**User's choice:** `Addon test + renderer test + committed fixture + docs/example verification`
**Notes:** This keeps the phase honest on both surfaces: the calendar visual and the clarity/docs promise.

---

## Contradictions And Risks

- No contradiction in the selected set. The choices are internally consistent with the Phase 6-8 render and scheduling constraints.
- The main implementation risk is overcrowding the tear-sheet. Planning should keep the day number dominant and use only small supporting weekday/month text.
- The main runtime risk is accepting the minute-level cadence as “slow” enough without letting tests/UAT get flaky around rollover behavior. Planning should verify cadence by contract rather than trying to prove literal midnight behavior in unit tests.
- The main docs risk is writing too much prose and too little example. The docs page needs one concrete addon-style example that actually uses the current non-DOM contract.

---

## Agent's Discretion

- Exact visual composition and theme-token usage for weekday/month/day typography.
- Exact schema fields for `calendar-sheet`, as long as it remains a separate built-in button type.
- Exact docs file location and whether the example lives in README, a dedicated guide, or both.

---

## Deferred Ideas

- Dense month-grid or multi-week calendar visuals.
- Rich timezone/date formatting options beyond what the tear-sheet needs.
- Broader renderer primitives for arbitrary composed layouts.

---

*Phase: 09-calendar-authoring-clarity*
*Discussion log generated: 2026-05-16*
