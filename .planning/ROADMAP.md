# Roadmap — Sireno Deck

**Version:** v1.3
**Milestone:** Typography and Rich Formatting
**Last updated:** 2026-05-28

## Milestone Summary

Milestone `v1.3 Typography and Rich Formatting` fixes the typography-size contract, adds honest live shrink-fit where measurement is actually needed, and extends the built-in date-time widget with bounded rich formatting on top of the existing Day.js-based `format` field.

The roadmap is intentionally narrow: typography sizing is fixed once in the shared text/theme seam, measured layout is limited to `fit="shrink"`, and the rich formatting grammar remains local to the date-time widget instead of becoming generic markup support.

## Phases

### Phase 1: Theme-Relative Typography Contract ✓ Complete (2026-05-28)
**Goal:** Make typography-role base sizes and shared `Text` size variants line up so `md` means the active theme base and the other sizes scale honestly from it.
**Requirements:** `TRF-01`, `TRF-02`
**Depends on:** None
**Success criteria:**
- [x] Typography role classes no longer hard-code the final effective font size in a way that breaks relative `Text` size variants
- [x] `Text` size variants resolve proportionally from each active typography role base with `md` matching the role base exactly
- [x] Theme UI presentation seams preserve explicit `size` intent without moving size logic into theme wrappers
- [x] Focused tests prove the same `size` token behaves relatively across `main`, `aux`, and `mono`
**Research needed:** No

### Phase 2: Live Shrink-Fit Measurement
**Goal:** Make `fit="shrink"` recompute live in the browser render path so text seeks the largest non-wrapping size while respecting a readable minimum floor.
**Requirements:** `TRF-03`, `TRF-04`
**Depends on:** 1
**Success criteria:**
- [ ] Browser-rendered `fit="shrink"` text recomputes on content and container changes instead of relying on a static CSS clamp
- [ ] Shrink-fit stops at a defined minimum floor and then applies the documented fallback behavior deterministically
- [ ] `wrap`, `ellipsis`, and `marquee` remain declarative and do not depend on JS measurement observers
- [ ] Regression coverage proves shrink-fit behavior without introducing resize-observer loops or mounted-host regressions
**Research needed:** No

### Phase 3: Rich Date-Time Formatting Surface
**Goal:** Extend the built-in date-time widget with one bounded rich `format` grammar for multi-line and inline emphasis behavior while keeping Day.js token formatting as the base layer.
**Requirements:** `TRF-05`, `TRF-06`
**Depends on:** 1, 2
**Success criteria:**
- [ ] Date-time config standardizes on one `format` field rather than split date/time config surfaces
- [ ] The widget supports `|` line breaks, `*...*` highlight spans, inline size tags, and `<blink>...</blink>` segments
- [ ] Blink behavior is implemented with reduced-motion-safe output instead of timer-driven widget logic
- [ ] The rich formatting grammar stays local to the date-time widget and does not expand the generic `Text` component into a markup engine
**Research needed:** No

### Phase 4: Verification and Contract Cleanup
**Goal:** Lock the milestone by updating tests, fixtures, examples, and planning truth so the shipped contract matches the live implementation and no stale date-time assumptions remain.
**Requirements:** `TRF-07`
**Depends on:** 3
**Success criteria:**
- [ ] Tests and fixtures cover theme-relative typography sizing, live shrink-fit, and rich date-time formatting on the single-field `format` contract
- [ ] Stale assertions and fixtures referencing split date/time config fields are removed or rewritten to the live v1.3 contract
- [ ] Shipped examples or review fixtures demonstrate the new formatting grammar and typography behavior end-to-end
- [ ] Milestone docs truthfully reflect the delivered contract and no longer carry conflicting text-format assumptions
**Research needed:** No

## Coverage Check

| Requirement | Phase |
|-------------|-------|
| `TRF-01` | Phase 1 |
| `TRF-02` | Phase 1 |
| `TRF-03` | Phase 2 |
| `TRF-04` | Phase 2 |
| `TRF-05` | Phase 3 |
| `TRF-06` | Phase 3 |
| `TRF-07` | Phase 4 |

## Planning Notes

- Phase 1 must come first because the date-time formatter and shrink-fit behavior both sit on top of the shared typography contract.
- Phase 2 stays browser-specific on purpose; mounted/static rendering should not inherit browser-only measurement machinery.
- Phase 3 deliberately avoids generic rich text so the milestone can ship one honest parser/render seam without opening sanitization or arbitrary nesting scope.
- Phase 4 is not optional cleanup; it closes the known stale test/live seam around the date-time config contract.

---

*Roadmap defined: 2026-05-28*
*Total phases: 4*
