# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-17)

**Core value:** Make Stream Deck customization programmable and extensible through a fast TypeScript CLI with real addon support and live-rendering buttons.
**Current focus:** Phase 18 execution is in progress; Waves 1-2 shipped the first browser-backed DOM button path, moved the bundled date/time addon onto it, and demoted the old SVG-era reconciler contract to legacy fallback status.

## Current Position

Phase: 18 — React DOM-Based Renderer With HTML/CSS Surface Support
Plan: 18-02 complete
Status: executing
Last activity: 2026-05-21 - Completed Plan 18-02 by demoting the legacy render contract, moving bundled date/time buttons onto DOM rendering, and adding the broader default-frame fixture

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
- **v1.2 research:** Session-aware behavior should be driven by one core-owned normalized context contract shared across config templating, addon render, and command/status execution.
- **v1.2 research:** Background precedence and text fitting need explicit renderer contracts before global wrapper/style primitives are added, or the milestone will turn into per-visual special cases.
- **Phase 11 discussion:** One canonical host context should carry OS `type` / `variant` / `version` plus session capability/state, and that exact shape should be reused across config templating, addon render, and command/status execution.
- **Phase 11 discussion:** Lock-aware behavior should use a top-level runtime/session config setting, allow an ordinary configured locked deck, and otherwise fall back to an implicit built-in date/time locked surface.
- **Phase 11 discussion:** Unlock must restore the full saved pre-lock navigation stack, while locked-mode navigation stays isolated from normal runtime state.
- **Phase 11 discussion:** Unsupported lock detection should not block startup; it should expose unsupported capability in context and warn once.
- **Phase 12 discussion:** Backgrounds stay color-only in this phase and resolve with button override, then deck background, then theme background.
- **Phase 12 discussion:** Text fitting becomes an explicit render contract with `shrink` as the default mode, `wrap` as the alternate mode, and a renderer-owned minimum readable size.
- **Phase 12 discussion:** The new fitting contract lands on shared/default text paths first; bespoke variants should only adopt it where reuse is low-risk.
- **Phase 13 discussion:** Wrapper and style primitives stay separate, are registered through the addon registry, and use global namespaced ids referenced directly as `wrapper_id` / `style_id`.
- **Phase 13 discussion:** Config-authored refs fail in config validation, addon-authored refs fail before rendering, missing providers hard-fail as unknown refs, and Phase 13 validation only checks existence plus wrapper/style kind.
- **Phase 13 discussion:** The first primitive rollout stays on the shared/default button path, keeps explicit props like `background` and `fit` authoritative, and must prove cross-boundary reuse with at least one bundled primitive consumer.
- **Phase 13 execution:** Wrapper/style primitives now live in the addon registry as separate namespaced definitions, and bundled addons register the same primitive contracts external addons use.
- **Phase 13 execution:** Config-authored primitive refs fail early with path-aware loader diagnostics, while addon-authored render refs fail before image generation through runtime-side validation.
- **Phase 13 execution:** Shared/default rendering consumes primitive-backed defaults without overriding explicit `background` and `fit`, and the repo now ships focused tests plus a committed Phase 13 review fixture for cross-boundary primitive reuse.
- **Phase 14 discussion:** Built-in toggles should ship as one `toggle` type with explicit `mode: internal | get-set | toggle-status`, shared base presentation plus per-state overrides, and no separate per-mode button types.
- **Phase 14 discussion:** Command-driven toggles are externally authoritative: `toggle-status` requires `status_command`, startup stays pending until the first read, failed writes preserve last authoritative truth plus error state, and output mapping uses explicit `on_values` / `off_values` token lists.
- **Phase 14 discussion:** Toggle visuals may differ by mode, but only through shared-base mode accents rather than three bespoke renderers; internal toggle state continuity remains scoped to the running daemon, not durable restart persistence.
- **Phase 18 execution:** Addon-owned visual payload now stays under `button.config`, the old reconciler/types seam is explicitly legacy-only, and the bundled date/time addon now renders through DOM content with default `buttonFrame` coverage.

### Pending Todos

- Decide whether to normalize planning docs that still mention `tsup` now that the codebase uses `tsdown`.

### Roadmap Evolution

- Phase 16 added: config hot-reload, external deck-file references, wrapper label removal, and customizable wrapper accent colors.
- Phase 17 added: custom wrapper primitives with addon-authored rendering variants.
- Phase 18 added: React DOM-based renderer with HTML/CSS surface support, including richer media such as GIFs and video.
- Phase 16 executed: deck-only `@path` references, watched config graph reloads, shared-wrapper footer removal, narrow `accent` overrides, and runtime-owned invalid-reload fallback are all implemented and verified.

### Progress Notes

- **Phase 16 execution:** Shipped deck-only file references through the existing loader contract, active config-graph watching with rebuild-and-restore reload semantics, shared-wrapper footer removal plus explicit per-button accent overrides, and a runtime-owned temporary error deck for invalid reloads.
- **Plan 16-05:** Closed the Phase 16 UAT startup blocker by making theme resolution config-owned, fixing the watched root-plus-ref file graph, and wiring the diagnosed gaps to a rerun-ready closure plan.
- **Plan 16-06:** Made shared/default accent overrides visibly affect shared card chrome, reran the final UAT check, and finished Phase 16 verification.
- **Phase 17 discussion:** Captured the shift from wrapper ids to a default base button-shape model, explicit full-surface opt-out, and narrow explicit content helpers while keeping bespoke variants on their current seams for now.
- **Phase 17 planning:** Broke the phase into three slices: contract and compatibility first, core base-shape plus helper extraction second, and reviewable default-vs-full-surface proof third.
- **Plan 17-04:** Closed the Phase 17 UAT regression by forwarding `full_surface` through the shipped CLI/device render path, preserving config-authored surface metadata across builtin runtime re-renders, and passing the real-device rerun.
- **Phase 18 discussion:** Captured the hard switch to browser-backed DOM button components, one persistent deck page, sampled media rendering, latest-state capture coalescing, and a core-owned React `buttonFrame` that wraps by default unless `full_surface: true`.
- **Plan 18-01:** Added the persistent browser renderer seam, the real `buttonFrame` + DOM host, the first shipped DOM-backed `action` / `change-deck` path, and a committed Phase 18 browser-rendered UAT fixture while keeping runtime ownership in place.
- **Plan 18-02:** Demoted the old SVG-era button contract to legacy fallback status, moved bundled date/time buttons onto DOM-authored renders, and added a broader fixture proving default `buttonFrame` behavior across more of the shipped DOM surface.
- **Phase 16 discussion:** Captured deck-only file references with owning-file-relative path resolution, root-plus-ref hot-reload, built-in temporary error-deck fallback on invalid reload, stack-preserving successful reload restore, full runtime instance rebuild on reload, shared-wrapper footer removal, and narrow per-button accent overrides accepting tokens or raw colors.
- **Phase 10 kickoff:** Milestone audit found that the documented addon authoring entrypoints do not line up with the built `packages/cli` exports, so release flow needs a gap-closure phase before `/review`.
- **Milestone v1.2 kickoff:** Captured session-context, layered background, text fitting, global wrapper/style, richer toggle, and lock-aware deck requirements plus the five-phase roadmap that sequences contract work before user-facing polish.
- **Phase 11 discussion:** Captured the canonical host/session contract, first minimal config templating seam, implicit built-in locked fallback, isolated lock-mode navigation, and unsupported-host degradation policy for downstream planning.
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
- **Plan 11-01:** Shipped the canonical host/session context through runtime-owned host normalization, addon instance input, config templating, action/status execution, and a committed host-context review fixture.
- **Plan 11-02:** Added the lock-aware session-monitor seam, validated `session.locked_deck`, implemented temporary locked-mode switching with exact unlock restore plus implicit fallback, and committed the Phase 11 lock-session fixture/UAT path.
- **Phase 11 verification:** Confirmed the canonical host/session contract is wired end-to-end and that locked-mode runtime behavior is covered by focused tests and committed review artifacts, with live host detector hardening still noted as follow-up work.
- **Phase 11 security follow-up discussion:** Captured that command safety must escape host values only at the shell boundary, Linux may only claim `supported` with a real detector, and the implicit locked fallback should move onto the bundled date-time addon path.
- **Phase 12 discussion:** Captured the color-only background contract, exact button->deck->theme precedence, narrow `shrink`/`wrap` fit modes, and the decision to keep the readability floor renderer-owned while scoping the first rollout to shared/default text paths.
- **Plan 12-01:** Shipped color-only deck/button background config, explicit `button -> deck -> theme` resolution, shared/default card tinting, and a committed background review path.
- **Plan 12-02:** Replaced the old `overflow` seam with explicit `fit` modes, shipped default shrink plus opt-in wrap on the primary shared/default label path, and added a committed text-fit review path.
- **Phase 12 verification:** Confirmed `SCS-03` and `SCS-04` are covered by focused config/runtime/render tests plus committed manual review fixtures, while wider wrapper/style primitives remain Phase 13 scope.
- **Phase 13 discussion:** Captured separate wrapper/style primitive registries, direct `wrapper_id` / `style_id` references, early unknown-ref failure boundaries, shared/default-first rollout scope, and the minimum cross-addon reuse proof expected from planning.
- **Plan 13-01:** Shipped registry-backed wrapper/style primitive definitions, direct config-authored `wrapper_id` / `style_id` references, early loader validation, and a bundled core-buttons primitive registration.
- **Plan 13-02:** Carried primitive ids through the public render contract, added pre-render runtime validation for addon-authored refs, applied primitive-backed defaults on the shared/default renderer path, and committed a Phase 13 review fixture/UAT path.
- **Phase 13 verification:** Confirmed `SCS-05` is covered by focused registry/config/reconciler/runtime/render tests plus bundled-addon coverage and a committed manual review path.
- **Phase 14 discussion:** Captured the single-type toggle contract, command-authority rules, honest pending/error lifecycle behavior, and the constrained shared-base visual divergence expected for planning.
- **Plan 14-01:** Shipped the bundled internal-mode toggle contract end-to-end, including runtime-owned in-process state continuity across deck re-activation and reconnect-style activation, plus the committed Phase 14 internal-toggle review fixture/UAT path.
- **Plan 14-02:** Added the strict `get-set` toggle branch, authoritative command reads/writes with pending and error treatment, real CLI render-path mode accents, and a committed command-driven review fixture/UAT path.
- **Plan 14-03:** Added the strict `toggle-status` toggle branch, write-then-status reconciliation without local inversion, restrained third-mode render accents, and the final committed Phase 14 fixture/UAT path covering all three modes.
- **Plan 14-04:** Fixed the runtime startup render-order race so stale deck-wide `PENDING` writes cannot overwrite the first settled authoritative `get-set` state on the real device path.

### Blockers/Concerns

- **Phase 5 (Addon System):** Addon API contract must be versioned from day one; design decisions here are hard to reverse.
- **Phase 5 (Addon System):** The addon-first architecture pivot is intentionally not backward-compatible with the current button config surface, so planning must account for schema, docs, examples, and migration fallout together.
- **Phase 11:** `session-monitor.ts` is currently a narrow seam with honest supported/unsupported classification and simulated event handling, but it still needs a real supported-host event source to close the live lock-detection promise completely.

## Session Continuity

Last session: 2026-05-21
Stopped at: Phase 17 gap-closure execution complete; next up is verification and UAT rerun.
Resume file: .planning/phases/17-custom-wrapper-primitives-with-addon/17-VERIFICATION.md

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
