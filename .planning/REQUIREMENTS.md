# Requirements — Sireno Deck

**Version:** v1.1
**Last updated:** 2026-05-15

## Milestone Scope

Milestone `v1.1 Addon UI and Live Widgets` builds on the completed `v1.0` CLI, rendering, advanced button, and addon-system work. This document tracks only the new requirements for the follow-on milestone so planning does not drift back into already-finished `v1.0` scope.

## v1.1 Requirements

| ID | Requirement | Category |
|----|-------------|----------|
| UIW-01 | Addon authors can use typed JSX for the existing custom render elements such as `deck-button`, `deck-text`, and `deck-surface` | Addon Authoring |
| UIW-02 | Helper-based authoring remains supported alongside JSX for the same custom render elements | Addon Authoring |
| UIW-03 | Docs and examples explain that custom deck elements target the Stream Deck renderer contract rather than the DOM | Docs |
| UIW-04 | Live addon buttons continue to refresh through the core-owned scheduler using per-button `defaultIntervalMs` defaults | Runtime |
| UIW-05 | Button config can override supported live-button cadence through `interval_ms` without introducing addon-local timers | Runtime |
| UIW-06 | The built-in `date-time` button refreshes correctly with a sensible default cadence for digital time output | Widgets |
| UIW-07 | The built-in date/time addon exposes a separate `analog-clock` button type with a sensible live-refresh default | Widgets |
| UIW-08 | The built-in date/time addon exposes a separate `calendar-sheet` button type with a slower date-appropriate refresh cadence | Widgets |
| UIW-09 | Theme configuration supports typography tokens that the renderer uses for shared text output | Theme |
| UIW-10 | Shared text rendering supports explicit behavior modes such as ellipsis and marquee instead of accidental overflow behavior | Render |
| UIW-11 | The renderer exposes a shared button wrapper primitive that buttons can opt into without making it mandatory | Render |
| UIW-12 | Tests, fixtures, and shipped examples cover the new JSX authoring, interval control, typography, and date/time widget behavior | Verification |

## Out of Scope For v1.1

| Item | Reason |
|------|--------|
| Full renderer redesign or replacement | The milestone should extend the existing custom reconciler and SVG pipeline, not replace it |
| Mandatory shared wrapper for every button | Analog clock and other bespoke visuals need a clear escape hatch |
| Dense month-grid calendar widget | The first calendar visual should stay readable as a single-key tear sheet |
| Addon-local timers or scheduler ownership | Core runtime scheduling is already the correct contract and should stay centralized |
| Broad design-system expansion beyond typography needs | The milestone only needs the text tokens required by the renderer |

## Phase Traceability

| Phase | Status | Requirements | Evidence |
|------|--------|--------------|----------|
| 6 — Base Contracts | Complete | UIW-01, UIW-02, UIW-04, UIW-05, UIW-06 | `.planning/phases/06-base-contracts/06-01-SUMMARY.md`, `.planning/phases/06-base-contracts/06-02-SUMMARY.md`, `.planning/phases/06-base-contracts/06-VERIFICATION.md` |
| 7 — Typography + Text Behavior | Complete | UIW-09, UIW-10, UIW-11, UIW-12 | `.planning/phases/07-typography-text-behavior/07-01-SUMMARY.md`, `.planning/phases/07-typography-text-behavior/07-02-SUMMARY.md`, `.planning/phases/07-typography-text-behavior/07-03-SUMMARY.md`, `.planning/phases/07-typography-text-behavior/07-VERIFICATION.md` |
| 8 — Clock Visuals | Complete | UIW-07, UIW-12 | `.planning/phases/08-clock-visuals/08-01-SUMMARY.md`, `.planning/phases/08-clock-visuals/08-02-SUMMARY.md`, `.planning/phases/08-clock-visuals/08-VERIFICATION.md` |
| 9 — Calendar + Authoring Clarity | Not started | UIW-03, UIW-08, UIW-12 | — |

---

*Requirements defined: 2026-05-14*
*Total v1.1 requirements: 12*
