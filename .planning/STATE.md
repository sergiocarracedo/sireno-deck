# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-12)

**Core value:** Make Stream Deck customization programmable and extensible through a fast TypeScript CLI with real addon support and live-rendering buttons.
**Current focus:** Phase 10 verified; next up is milestone review on the rebuilt public authoring surface

## Current Position

Phase: 10 — Public Authoring Exports *(gap closure)*
Plan: 10-02-PLAN.md
Status: Phase 10 verified against the built package surface; next up is `/review`
Last activity: 2026-05-16 - Verified the emitted public root and `./jsx` package surface via build output, built-package typecheck, and focused render parity coverage

Progress: [##########] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 7
- Average duration: 1 session
- Total execution time: 1 session

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 — Foundation | 2 | 1 session | 0.5 session |
| 2 — Device + Rendering | 3 | 1 session | 0.33 session |

**Recent Trend:**
- Phase 1 implementation completed in a single execution pass, with verification catching multiple build/runtime mismatches before handoff.

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- **Phase 1 (v1.0):** Followed recommended standard tooling (pnpm, ESM, strict TS) with tsdown for the CLI build output. Full forward-looking config schema. PID-file daemon lifecycle. pino + colored error UX.
- **Execution:** Config validation errors must preserve metadata through schema, loader, and formatter layers or the CLI loses file/line/suggestion context.
- **Execution:** yargs command handlers that return promises require `.parseAsync()`, and a foreground daemon must keep the event loop alive explicitly.
- **Phase 5 discussion:** Button behavior should move behind addon-owned stateful instances that render React output, declare their own schemas, and use core-owned scheduling, command helpers, invalidation, and navigation methods.
- **Phase 5 discussion:** Built-in buttons should become bundled addons loaded through the same registry path as external addons, and the button config surface should be redesigned around a core envelope plus inline addon fields.

### Pending Todos

- Decide whether to normalize planning docs that still mention `tsup` now that the codebase uses `tsdown`.

### Progress Notes

- **Phase 10 kickoff:** Milestone audit found that the documented addon authoring entrypoints do not line up with the built `packages/cli` exports, so release flow needs a gap-closure phase before `/review`.
- **Plan 05-01:** Completed the addon API, bundled registry, bootstrap-aware config validation, and the first generic addon-host runtime slice.
- **Plan 05-02:** Completed addon manifest validation, unified local/npm loading, startup warning isolation, and external-addon regression coverage.
- **Plan 05-03:** Completed addon asset resolution, deck-type expansion, and the bundled emoji selector proof with runtime coverage.
- **Plan 05-04:** Replaced stale shipped local/npm addon examples with disabled illustrative declarations so the repo no longer claims nonexistent addons are ready to run.
- **Plan 05-05:** Fixed SVG addon icon composition in the renderer and switched emoji-entry tiles to deterministic ASCII-safe visuals that do not depend on host emoji fonts.
- **Plan 05-06:** Clarified disabled addon semantics in the shipped config and pinned the skip-vs-warning contract in loader/startup tests.
- **Plan 05-07:** Realigned bundled SVG assets with the icon-slot contract and strengthened renderer verification around icon-region pixels.
- **Plan 05-08:** Restored image-backed emoji tiles for the bundled emoji selector with bundled per-emoji assets and fallback coverage.
- **Phase 5 re-discussion:** Captured follow-on context for typed JSX addon authoring, core-owned live update defaults plus `interval_ms` overrides, optional shared button wrapper/text helpers, full theme typography tokens, and separate `analog-clock` / `calendar-sheet` button types inside the built-in date-time addon.
- **Plan 08-01:** Shipped the first Phase 8 analog-clock tracer bullet end-to-end, including the separate bundled button type, runtime render-contract propagation, and a bespoke analog SVG render path.
- **Plan 08-02:** Added the committed Phase 8 analog-clock fixture, UAT script, and review-path regression coverage so the shipped clock can be judged on the real CLI/device path.
- **Plan 09-01:** Shipped the bundled `calendar-sheet` button type, tear-sheet render path, and committed Phase 9 review fixture/UAT script.
- **Plan 09-02:** Added the focused non-DOM authoring guide, verified JSX/helper example, and review-visible authoring clarity checks.
- **Plan 10-01 / 10-02 execution:** Added explicit public root and `./jsx` package build entries, moved JSX type augmentation onto the built opt-in entrypoint, switched docs/example imports to `sireno-deck-cli`, and replaced source-path verification with a build-first package-surface typecheck.
- **Phase 10 verification:** Confirmed `packages/cli/package.json#exports` now matches emitted `dist/` artifacts, the shipped authoring example resolves through the built package surface, and focused reconciler coverage keeps the helper/JSX parity example visible in tests.

### Blockers/Concerns

- **Phase 5 (Addon System):** Addon API contract must be versioned from day one; design decisions here are hard to reverse.
- **Phase 5 (Addon System):** The addon-first architecture pivot is intentionally not backward-compatible with the current button config surface, so planning must account for schema, docs, examples, and migration fallout together.

## Session Continuity

Last session: 2026-05-16
Stopped at: Phase 10 verified; next up is `/review` for milestone closure.
Resume file: .planning/phases/10-public-authoring-exports/README.md

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | update example config so taps are demoable in UAT | 2026-05-12 | `ea5b2d6` | `.planning/quick/001-example-config-demoable-taps` |
| 002 | finish remaining Phase 4 review regressions | 2026-05-13 | uncommitted | `.planning/quick/002-phase-4-review-regressions` |
| 003 | fix fan label contract and make display_mode text truly text-only | 2026-05-13 | uncommitted | `.planning/quick/003-fan-label-contract-text-only-display-mode` |
| 004 | fix Phase 4 activation blocking and stale-key priming regressions | 2026-05-13 | uncommitted | `.planning/quick/004-activation-blocking-stale-key-priming` |
| 005 | fix independent priming, priming error handling, and stale media metadata | 2026-05-13 | uncommitted | `.planning/quick/005-fix-independent-priming-priming-err` |
| 006 | start polling immediately per button and treat 0 RPM as valid fan data | 2026-05-13 | uncommitted | `.planning/quick/006-start-polling-immediately-zero-rpm-valid` |
| 007 | preserve internal toggle state across deck activation and reconnect | 2026-05-13 | uncommitted | `.planning/quick/007-preserve-internal-toggle-state-across-deck-activation-and-reconnect` |
| 008 | guard async deck activation after render and prevent stop from being undone | 2026-05-13 | uncommitted | `.planning/quick/008-guard-async-deck-activation-after-render-and-preserve-stop` |
| 009 | align fan heuristic review with v1 contract and finalize Phase 4 review | 2026-05-13 | uncommitted | `.planning/quick/009-align-fan-review-contract-finalize-phase-4-review` |
| 010 | add Phase 5 verification fixtures under packages/cli/fixtures | 2026-05-13 | uncommitted | `.planning/quick/010-add-phase-5-verification-fixtures-under-packages-cli-fixtures` |
| 011 | commit learnings | 2026-05-13 | `0f6981a` | `.planning/quick/011-commit-learnings` |
| 012 | honor token-based formatting in the bundled date-time addon | 2026-05-14 | uncommitted | `.planning/quick/012-date-time-token-formatting` |
| 013 | add the config needed for review (UAT) in the fixtures folder | 2026-05-15 | `8f321c9` | `.planning/quick/013-add-uat-review-config-fixtures` |
