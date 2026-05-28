# Requirements — Sireno Deck

**Version:** v1.3
**Last updated:** 2026-05-28

## Milestone Scope

Milestone `v1.3 Typography and Rich Formatting` builds on the shipped `v1.2` text and theme surface. This document tracks only the new milestone requirements needed to make typography sizing truly theme-relative, make `fit="shrink"` honest and live, and add bounded rich formatting to the built-in date-time widget without turning the whole text system into a markup engine.

## v1.3 Requirements

| ID | Requirement | Category |
|----|-------------|----------|
| TRF-01 | Theme typography roles expose a reusable base-size contract where `md` equals the active role base and other `Text` sizes scale proportionally from that base instead of fighting hard-coded final font sizes | Render |
| TRF-02 | The shared `Text` contract applies theme-relative size variants consistently across typography roles and theme UI presentation seams without hiding size behavior inside theme wrappers | Render |
| TRF-03 | The browser render path supports live `fit="shrink"` recomputation on text and container changes so text grows or shrinks toward the largest non-wrapping size | Render |
| TRF-04 | `fit="shrink"` stops at an explicit readable minimum floor and then falls back deterministically instead of shrinking indefinitely, while `wrap`, `ellipsis`, and `marquee` remain declarative and do not require JS observers | Render |
| TRF-05 | The built-in date-time widget standardizes on one rich `format` string that keeps Day.js token formatting and adds a bounded widget-local grammar for line breaks, highlight spans, inline size tags, and blink spans | Widgets |
| TRF-06 | Date-time rich formatting renders `|` line breaks, `*...*` accent-bold highlights, inline size override tags, and `<blink>...</blink>` segments with reduced-motion-safe behavior, without extending the generic `Text` component into a rich-text surface | Widgets |
| TRF-07 | Tests, fixtures, and shipped examples cover theme-relative typography sizing, live shrink-fit behavior, the single-field rich date-time format contract, and the new bounded formatting syntax | Verification |

## Implementation Sequencing Notes

- **Phase 1 landed (2026-05-28):** `TRF-01` and `TRF-02` — moved effective font-size responsibility off typography role classes, made `md` the exact typography-role base, kept relative size semantics in the shared `Text` contract, preserved size metadata through the theme UI seam, and swept shipped raw typography callers onto the honest contract.
- **Phase 2 should land:** `TRF-03` and `TRF-04` — add browser-path measured shrink-fit only for `fit="shrink"`, recompute on content/container changes, enforce a readable minimum floor, and keep `wrap`, `ellipsis`, and `marquee` CSS/declarative.
- **Phase 3 should land:** `TRF-05` and `TRF-06` — lock the built-in date-time config to one rich `format` string, parse the bounded widget-local grammar on top of Day.js output, render multi-line/rich spans, and implement blink through CSS with reduced-motion handling.
- **Phase 4 should land:** `TRF-07` — add regression coverage, fixtures, and shipped examples that prove the new typography, shrink-fit, and rich date-time contracts while removing stale assertions around split date/time config fields.

## Phase Traceability

| Req ID | Phase | Status | Notes |
|--------|-------|--------|-------|
| TRF-01 | Phase 1 | ✓ Complete (2026-05-28) | Typography role classes now publish role-base variables and the shared `Text` size tokens scale from the active base with `md` exact. |
| TRF-02 | Phase 1 | ✓ Complete (2026-05-28) | Theme text wrappers observe explicit `size` metadata, and shipped callers now rely on `Text` semantics rather than raw wrapper-based sizing. |
| TRF-03 | Phase 2 | Planned | Live shrink-fit recomputation remains Phase 2 scope. |
| TRF-04 | Phase 2 | Planned | Minimum-floor shrink-fit behavior remains Phase 2 scope. |
| TRF-05 | Phase 3 | Planned | Rich date-time formatting stays queued behind the Phase 1/2 typography contract work. |
| TRF-06 | Phase 3 | Planned | Date-time-only rich formatting grammar remains queued for Phase 3. |
| TRF-07 | Phase 4 | Planned | Final regression/fixture/examples cleanup remains Phase 4 scope. |

## v2 Candidates

| Item | Why Deferred |
|------|--------------|
| Share the rich formatting grammar with the generic `Text` component or other widgets | The first milestone should prove the grammar on one built-in widget before making it a platform-wide text contract |
| Support raw HTML, Markdown, or arbitrary nested markup in text surfaces | That would turn a bounded formatting improvement into a sanitization and layout-engine problem |
| Expand blink/animation effects beyond a narrow accessibility-safe contract | The milestone only needs one reduced-motion-safe blink behavior |
| Add richer Day.js plugin surface by default | Current scope only requires existing Day.js tokens unless a later milestone needs advanced calendar/timezone features |
| Rework all text fit modes under one new layout engine | The honest fix is narrow measured behavior for `shrink`, not a whole-system rewrite |

## Out of Scope For v1.3

| Item | Reason |
|------|--------|
| Generic rich formatting in the shared `Text` component | The requested syntax is intentionally date-time-only in this milestone |
| Raw HTML or Markdown rendering in text surfaces | The product needs a bounded trusted grammar, not an open markup surface |
| Unlimited nested formatting tags | A small predictable grammar is easier to validate, render, and test honestly |
| JS-driven layout logic for `wrap`, `ellipsis`, or `marquee` | Only `fit="shrink"` needs measurement; the other modes should stay declarative |
| Theme-specific hidden size lookup tables disconnected from typography base sizes | Size behavior must remain derived from the active typography bases so themes stay truthful |

---

*Requirements defined: 2026-05-28*
*Total v1.3 requirements: 7*
