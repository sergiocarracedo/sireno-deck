# Requirements — Sireno Deck

**Version:** v1.3
**Last updated:** 2026-05-29

## Milestone Scope

Milestone `v1.3 Typography and Rich Formatting` builds on the shipped `v1.2` text and theme surface. This document tracks only the new milestone requirements needed to make typography sizing truly theme-relative, make `fit="shrink"` honest and live, and add a strict-whitelist rich-markup contract to shared `Text` while keeping date-time responsible only for Day.js token expansion plus its existing single `format` field.

## v1.3 Requirements

| ID | Requirement | Category |
|----|-------------|----------|
| TRF-01 | Theme typography roles expose a reusable base-size contract where `md` equals the active role base and other `Text` sizes scale proportionally from that base instead of fighting hard-coded final font sizes | Render |
| TRF-02 | The shared `Text` contract applies theme-relative size variants consistently across typography roles and theme UI presentation seams without hiding size behavior inside theme wrappers | Render |
| TRF-03 | The browser render path supports live `fit="shrink"` recomputation on text and container changes so text grows or shrinks toward the largest non-wrapping size | Render |
| TRF-04 | `fit="shrink"` stops at an explicit readable minimum floor and then falls back deterministically instead of shrinking indefinitely, while `wrap`, `ellipsis`, and `marquee` remain declarative and do not require JS observers | Render |
| TRF-05 | Shared `Text` accepts a strict-whitelist nested mini markup language for line breaks, highlight shorthand, shared size tags, blink spans, and existing tone-token tags, while built-in date-time keeps one `format` field and performs Day.js token expansion before passing markup through | Widgets |
| TRF-06 | Shared rich text rendering supports `|` line breaks, `*...*` accent-bold highlights, inline size tags, `<blink>...</blink>`, and existing tone-token tags with literal fallback on invalid markup, while theme wrappers remain outer observers rather than markup owners | Widgets |
| TRF-07 | Tests, fixtures, and shipped examples cover theme-relative typography sizing, live shrink-fit behavior, the shared `Text` rich-markup contract, and the single-field date-time `format` passthrough path that consumes it | Verification |

## Implementation Sequencing Notes

- **Phase 1 landed (2026-05-28):** `TRF-01` and `TRF-02` — moved effective font-size responsibility off typography role classes, made `md` the exact typography-role base, kept relative size semantics in the shared `Text` contract, preserved size metadata through the theme UI seam, and swept shipped raw typography callers onto the honest contract.
- **Phase 2 landed (2026-05-28):** `TRF-03` and `TRF-04` — replaced the fake shrink clamp with browser-path measured shrink-fit on shared `Text`, recompute on content/container changes through the browser helper seam, enforce a readable minimum floor plus deterministic ellipsis fallback, keep `wrap`, `ellipsis`, and `marquee` CSS/declarative, and ship a committed browser/emulator review path.
- **Phase 3 landed (2026-05-29):** `TRF-05` and `TRF-06` — shared `Text` now parses/renders the strict-whitelist nested mini markup language for string children, the built-in date-time button keeps one `format` field plus Day.js-first token expansion, markup literals survive the formatting seam, theme wrappers stay outer observers, and invalid markup falls back to the original literal text.
- **Phase 4 landed (2026-05-29):** `TRF-07` — focused regression coverage now proves the unmatched-angle invalid-markup edge case and the live single-field date-time `format` passthrough path, while active workflow-truth artifacts no longer preserve stale Phase 3 rerun guidance.

## Phase Traceability

| Req ID | Phase | Status | Notes |
|--------|-------|--------|-------|
| TRF-01 | Phase 1 | ✓ Complete (2026-05-28) | Typography role classes now publish role-base variables and the shared `Text` size tokens scale from the active base with `md` exact. |
| TRF-02 | Phase 1 | ✓ Complete (2026-05-28) | Theme text wrappers observe explicit `size` metadata, and shipped callers now rely on `Text` semantics rather than raw wrapper-based sizing. |
| TRF-03 | Phase 2 | ✓ Complete (2026-05-28) | Browser decks now inject a shared shrink-fit helper so canonical `Text fit="shrink"` surfaces remeasure from real DOM boxes instead of relying on the old clamp. |
| TRF-04 | Phase 2 | ✓ Complete (2026-05-28) | Shrink-fit now stops at a fixed readable floor, falls back to deterministic ellipsis, keeps other fit modes declarative, and ships a real browser/emulator review path. |
| TRF-05 | Phase 3 | ✓ Complete (2026-05-29) | Shared `Text` now owns the strict-whitelist markup parser/render seam, while built-in date-time keeps one `format` field and passes Day.js-expanded strings through after preserving markup literals. |
| TRF-06 | Phase 3 | ✓ Complete (2026-05-29) | Shared rich text now supports nested line breaks, highlight shorthand, size/tone tags, blink spans, and deterministic literal fallback without giving themes inner-markup ownership. |
| TRF-07 | Phase 4 | ✓ Complete (2026-05-29) | Focused date-time regression coverage now proves unmatched-angle literal fallback plus token expansion, and active workflow artifacts were reconciled so the delivered Phase 3/4 contract truth matches the live implementation. |

## v2 Candidates

| Item | Why Deferred |
|------|--------------|
| Broader author-facing markup controls beyond the strict shared whitelist | The milestone already stretches into a shared `Text` markup contract; anything looser would turn it into an open-ended text language |
| Support raw HTML, Markdown, or arbitrary nested markup in text surfaces | That would turn a strict shared formatting improvement into a sanitization and layout-engine problem |
| Expand blink/animation effects beyond the current narrow product contract | The milestone only needs one always-on blink behavior and does not widen animation semantics further |
| Add richer Day.js plugin surface by default | Current scope only requires existing Day.js tokens unless a later milestone needs advanced calendar/timezone features |
| Rework all text fit modes under one new layout engine | The honest fix is narrow measured behavior for `shrink`, not a whole-system rewrite |

## Out of Scope For v1.3

| Item | Reason |
|------|--------|
| Arbitrary or theme-defined rich formatting in the shared `Text` component | Phase 3 only admits the strict shared whitelist locked in context, not open-ended markup ownership |
| Raw HTML or Markdown rendering in text surfaces | The product needs a bounded trusted grammar, not an open markup surface |
| Unlimited nested formatting tags | A strict whitelist with proper nesting is easier to validate, render, and test honestly |
| JS-driven layout logic for `wrap`, `ellipsis`, or `marquee` | Only `fit="shrink"` needs measurement; the other modes should stay declarative |
| Theme-specific hidden size lookup tables disconnected from typography base sizes | Size behavior must remain derived from the active typography bases so themes stay truthful |

---

*Requirements defined: 2026-05-28*
*Total v1.3 requirements: 7*
