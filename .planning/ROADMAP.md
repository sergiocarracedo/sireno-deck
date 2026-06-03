# Roadmap — Sireno Deck

**Version:** v1.3
**Milestone:** Typography and Rich Formatting
**Last updated:** 2026-06-03

## Milestone Summary

Milestone `v1.3 Typography and Rich Formatting` fixes the typography-size contract, adds honest live shrink-fit where measurement is actually needed, and extends the shared text surface with a strict-whitelist rich-markup contract that the built-in date-time widget consumes after Day.js expansion.

The roadmap is intentionally narrow: typography sizing is fixed once in the shared text/theme seam, measured layout is limited to `fit="shrink"`, and the rich formatting work expands only into a strict shared `Text` mini markup language rather than arbitrary HTML/Markdown or theme-owned parsing behavior.

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

### Phase 2: Live Shrink-Fit Measurement ✓ Complete (2026-05-28)
**Goal:** Make `fit="shrink"` recompute live in the browser render path so text seeks the largest non-wrapping size while respecting a readable minimum floor.
**Requirements:** `TRF-03`, `TRF-04`
**Depends on:** 1
**Success criteria:**
- [x] Browser-rendered `fit="shrink"` text recomputes on content and container changes instead of relying on a static CSS clamp
- [x] Shrink-fit stops at a defined minimum floor and then applies the documented fallback behavior deterministically
- [x] `wrap`, `ellipsis`, and `marquee` remain declarative and do not depend on JS measurement observers
- [x] Regression coverage proves shrink-fit behavior without introducing resize-observer loops or mounted-host regressions
**Research needed:** No

### Phase 3: Rich Date-Time Formatting Surface ✓ Complete (2026-05-29)
**Goal:** Add a strict-whitelist shared `Text` mini markup language that date-time consumes after Day.js token expansion, so rich formatting becomes nested, reusable, and still tightly bounded.
**Requirements:** `TRF-05`, `TRF-06`
**Depends on:** 1, 2
**Success criteria:**
- [x] Shared `Text` parses string children through a strict-whitelist nested mini markup language while date-time keeps one `format` field and runs Day.js expansion first
- [x] Rich text supports `|` line breaks, `*...*` highlight shorthand, shared size tags, existing tone-token tags, and `<blink>...</blink>` composition through one core render path
- [x] Invalid or unsupported markup falls back to the original literal source text rather than partially rendering broken structure
- [x] Theme wrappers remain outer metadata observers and do not become inner markup or parsing owners
**Research needed:** No

### Phase 4: Verification and Contract Cleanup ✓ Complete (2026-05-29)
**Goal:** Lock the milestone by updating tests, fixtures, examples, and planning truth so the shipped contract matches the live implementation and no stale date-time assumptions remain.
**Requirements:** `TRF-07`
**Depends on:** 3
**Success criteria:**
- [x] Tests and fixtures cover theme-relative typography sizing, live shrink-fit, and rich date-time formatting on the single-field `format` contract
- [x] Stale assertions and fixtures referencing split date/time config fields are removed or rewritten to the live v1.3 contract
- [x] Shipped examples or review fixtures demonstrate the new formatting grammar and typography behavior end-to-end
- [x] Milestone docs truthfully reflect the delivered contract and no longer carry conflicting text-format assumptions
**Research needed:** No

### Phase 5: Hot Refresh and Button Error Helper ✓ Complete (2026-05-30)
**Goal:** Restore honest hot refresh for config and React source edits, and provide a shared button-facing error helper that renders a warning icon plus a four-digit error code while logging deck/button-aware diagnostics.
**Status:** [x] Complete
**Depends on:** Phase 4

**Success criteria:**
- [x] The in-process daemon reload path now goes through one explicit runtime rebuild seam while preserving the temporary full-deck config reload fallback.
- [x] The workspace-root `cli:dev` `tsx watch` loop is pinned and documented as the full-process raw-source restart seam, distinct from the narrower daemon reload path.
- [x] Button-scoped runtime failures now render a compact warning-icon plus four-digit code helper and emit deck/button-aware diagnostics without replacing the separate config error deck.
- [x] Focused loader/start/runtime tests prove the truthful boundaries and error-helper behavior without regressing the existing config reload surface.

**Research needed:** Yes - completed in `05-RESEARCH.md`

### Plans
- [x] 05-01: Truthful in-process runtime reload
- [x] 05-02: Truthful external source-edit refresh
- [x] 05-03: Shared button error helper
- [x] 05-04: Close button warning helper visual gap
- [x] 05-05: Close apiVersion mismatch UAT wording gap

### Phase 30: Content Helpers, System Status, and Media Player Addons ✓ Complete (2026-05-30)
**Goal:** Add shared content helper components for bars and label-value layouts, then use them to ship configurable built-in system-status and media-player addons with platform adapter seams.
**Status:** [x] Complete
**Depends on:** Phase 29

### Plans
- [x] 30-01: Publish the shared helper components
- [x] 30-02: Ship the template-driven system-status addon
- [x] 30-03: Ship the cross-platform media-player button

### Phase 31: CLI Dev Watch Mode Argument Forwarding ✓ Complete (2026-06-01)
**Goal:** Make `pnpm cli:dev ...` start the real CLI watch mode and honor forwarded command arguments such as `emulate --port 8912`.
**Status:** [x] Complete
**Depends on:** Phase 30

### Plans
- [x] 31-01: Restore the runtime watch launcher contract
- [x] 31-02: Re-sync regression and README truth
- [x] 31-03: Close the shared cli:dev watch-loop blocker
- [x] 31-04: Harden bare-start cleanup and re-sync verification truth
- [x] 31-05: Restore the live cli:dev seam
- [x] 31-06: Shell-proof the root cli:dev script

### Phase 32: Addon-Owned Data Polling Contract ✓ Complete (2026-06-01)
**Goal:** Move addon-specific polling/data-fetching logic out of core system modules into addon-owned callbacks so core only schedules intervals, passes command output props to render, and publishes rendered frames.
**Status:** [x] Complete
**Depends on:** Phase 31

### Plans
- [x] 32-01: Land the core-agnostic payload and split-cadence runtime contract
- [x] 32-02: Migrate system-status to addon-owned polling and domain modules
- [x] 32-03: Migrate media-player to addon-owned polling and OS adapters
- [x] 32-04: Close the big-bang migration and regression gate

### Phase 33: Add full tailwind support ✓ Complete (2026-06-02)

**Goal:** Enable full Tailwind support across the browser-rendered UI surface so shared components, themes, and addon-authored TSX can rely on a consistent utility-first styling contract.
**Status:** [x] Complete
**Depends on:** Phase 32

### Plans
- [x] 33-01: Land the real Tailwind build and browser delivery seam
- [x] 33-02: Hard-cut shared UI and built-ins onto canonical Tailwind utilities
- [x] 33-03: Wire workspace theme and addon sources into the Tailwind contract

### Phase 34: Button action command interface ✓ Complete (2026-06-02)

**Goal:** Add a shared optional button action-command contract so addon buttons can declaratively map `tap`, `hold`, and `double-tap` events to system commands through one common schema and hook.
**Status:** [x] Complete (2026-06-02)
**Depends on:** Phase 33

### Plans
- [x] 34-01: Publish the shared command-action contract and prove it on the action button
- [x] 34-02: Migrate system-status onto the shared command-action contract
- [x] 34-03: Roll the shared command contract across regular date-time buttons

### Phase 35: Live hardware resampling at 250ms ✓ Complete (2026-06-03)

**Goal:** Keep browser-rendered animated button surfaces live on physical Stream Deck hardware by resampling the mounted deck surface at roughly 250ms cadence without restarting the page on every frame.
**Status:** [x] Complete (2026-06-03)
**Depends on:** Phase 34

### Plans
- [x] 35-01: Keep the physical hardware deck live between HTML changes
- [x] 35-02: Harden live hardware resampling across placeholder, reload, and reconnect edges

### Phase 36: Remove Text Marquee

**Goal:** Remove the `marquee` text overflow mode because it requires very frequent rapid updates that are too expensive to sustain.
**Status:** [ ] Not started
**Depends on:** Phase 35

### Plans
*Not yet planned — run `plan-phase 36`*

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
- Phase 3 now intentionally widens into shared `Text`, but only through a strict whitelist mini markup language; it must still avoid arbitrary HTML/Markdown, theme-owned parsing, and open-ended text-language scope.
- Phase 4 is not optional cleanup; it closes the known stale test/live seam around the date-time config contract.

---

*Roadmap defined: 2026-05-28*
*Total phases: 9*
