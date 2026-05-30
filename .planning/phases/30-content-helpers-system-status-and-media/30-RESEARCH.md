# Phase 30 Research - Content Helpers, System Status, and Media Player Addons

## Don't Hand-Roll

- Reuse `systeminformation` as the first system-metrics source instead of introducing a second general-purpose host-inspection stack. [VERIFIED: `packages/cli/package.json`] [VERIFIED: `packages/cli/src/system/live-metrics.ts`] [CITED: https://systeminformation.io]
- Reuse `numbro` for configurable numeric formatting instead of inventing a local formatter mini-language. Its documented object-based options already cover the kinds of output this phase needs, including percentages, bytes, abbreviations, mantissa control, and localization hooks. [CITED: https://numbrojs.com/format.html]
- Reuse the existing mounted button runtime seams for polling and interaction (`defaultIntervalMs`, `refresh`, `onTap`, `onPress`, `onRelease`) instead of widening the runtime contract for system-status or media-player buttons. [VERIFIED: `packages/cli/src/addon/api.ts`] [VERIFIED: `packages/cli/src/deck/runtime.ts`]
- Reuse shared `Text` marquee for media overflow rather than authoring a custom scrolling subsystem. [VERIFIED: `packages/cli/src/ui/Text.tsx`] [VERIFIED: `.planning/phases/30-content-helpers-system-status-and-media/30-CONTEXT.md`]
- Reuse the existing bundled-addon registry path (`packages/cli/src/builtin-addons/*`, `packages/cli/src/addon/builtin.ts`) rather than special-casing new built-ins. [VERIFIED: `packages/cli/src/addon/builtin.ts`] [VERIFIED: `packages/cli/src/builtin-addons/core-buttons/index.ts`]
- On Linux, prefer documented MPRIS integrations (`playerctl` or the already-present `dbus-next`) over an ad hoc media-control shim. The user-mentioned `playctrl` did not show up as the mainstream documented path; `playerctl` did. [VERIFIED: `packages/cli/package.json`] [CITED: https://manpages.ubuntu.com/manpages/jammy/man1/playerctl.1.html] [CITED: https://acrisci.github.io/doc/node-dbus-next/] [CITED: https://specifications.freedesktop.org/mpris-spec/latest/Player_Interface.html]

## Common Pitfalls

- Scope creep into a generic layout DSL is the biggest risk in this phase. The phase context explicitly forbids config-authored structural layout control; keep config at helper-template selection plus metadata overrides only. [VERIFIED: `.planning/phases/30-content-helpers-system-status-and-media/30-CONTEXT.md`]
- Hiding unsupported metrics by collapsing rows would violate the locked decision to keep unavailable metrics visible in-place. Plan and implementation both need an explicit unavailable rendering path. [VERIFIED: `.planning/phases/30-content-helpers-system-status-and-media/30-CONTEXT.md`] [VERIFIED: `.planning/STATE.md`]
- Baking formatting policy into the shared helpers would contradict the decision that helpers stay presentation-only. Numbro should sit in built-in/system-status support code or external addon callers, not inside `Bars` or `LabelValueList`. [VERIFIED: `.planning/phases/30-content-helpers-system-status-and-media/30-CONTEXT.md`] [CITED: https://numbrojs.com/format.html]
- Overclaiming cross-platform media parity is risky. Linux has the clearest verified path via MPRIS; Windows has an official likely target (`GlobalSystemMediaTransportControlsSessionManager`) but was only discovery-verified here, and macOS evidence is weaker. Adapter seams must therefore degrade honestly rather than promising uniform metadata depth. [CITED: https://manpages.ubuntu.com/manpages/jammy/man1/playerctl.1.html] [CITED: https://specifications.freedesktop.org/mpris-spec/latest/Player_Interface.html] [ASSUMED] Windows adapter implementation will need fresh implementation-time validation. [ASSUMED] macOS adapter implementation will need fresh implementation-time validation.
- Treating MPRIS progress as a continuously pushed property is wrong. The spec says `Position` does not emit `PropertiesChanged`, so Linux progress must be sampled or derived carefully rather than assumed event-driven. [CITED: https://specifications.freedesktop.org/mpris-spec/latest/Player_Interface.html]
- Creating horizontal implementation slices such as “all helper components first, then all adapters, then all configs” would violate the planner persona and make execution harder to demo. Each plan should deliver a user-visible end-to-end behavior. [VERIFIED: `/home/sergio/.config/opencode/learnship/agents/planner.md`]

## Existing Patterns in This Codebase

- `packages/cli/src/addon/api.ts` already provides the mounted button contract the new built-ins should use, including explicit runtime hooks for tap, hold-like press/release, polling, and invalidation. [VERIFIED: `packages/cli/src/addon/api.ts`]
- `packages/cli/src/system/live-metrics.ts` already contains a small metrics seam with honest unavailable behavior (`getFanMetric` returns `{ available: false }` on failures or no data). This is the strongest in-repo precedent for the Phase 30 canonical metric adapter surface. [VERIFIED: `packages/cli/src/system/live-metrics.ts`]
- `packages/cli/src/system/host-context.ts` already normalizes OS selection to `linux | macos | windows | unknown`, which is the right branch point for per-OS system/media adapters. [VERIFIED: `packages/cli/src/system/host-context.ts`]
- `packages/cli/src/ui/index.ts` and `packages/cli/src/index.ts` are the current public export seams for shared UI primitives. New helpers must be added there if they are meant for external addon authors. [VERIFIED: `packages/cli/src/ui/index.ts`] [VERIFIED: `packages/cli/src/index.ts`]
- `packages/cli/src/builtin-addons/core-buttons/buttons/media-sample.tsx` already demonstrates a media-adjacent full-surface mounted button that uses `ButtonSurface` metadata and sampled state. [VERIFIED: `packages/cli/src/builtin-addons/core-buttons/buttons/media-sample.tsx`]
- `packages/cli/src/addon/builtin.ts` centralizes bundled-addon registration. New built-in addon families should register through that same seam rather than being smuggled in through runtime exceptions. [VERIFIED: `packages/cli/src/addon/builtin.ts`]
- The prior-art solution `.planning/solutions/best-practices/bespoke-live-visuals-can-stay-inside-the-deck-button-variant-seam-2026-05-15.md` reinforces keeping new single-button visuals inside the current render/addon seams rather than widening renderer primitives early. That fits both the bars helper and the media-player progress/status card. [VERIFIED: `.planning/solutions/best-practices/bespoke-live-visuals-can-stay-inside-the-deck-button-variant-seam-2026-05-15.md`]

## Recommended Approach

Confidence: HIGH for helper/API direction and system-metrics foundation; MEDIUM for Linux media implementation direction; LOW-MEDIUM for exact macOS/Windows media adapter details until implementation-time validation.

1. Land the shared helper surface first as public TSX components on the existing `src/ui` / root export path.
   - `Bars` should support exactly 1-3 bars with title, color, value, and max value props. [VERIFIED: `.planning/phases/30-content-helpers-system-status-and-media/30-CONTEXT.md`]
   - `LabelValueList` should support 1-4 lines and auto-select 1-line, 2-line, and 3-4-line layouts from line count. [VERIFIED: `.planning/phases/30-content-helpers-system-status-and-media/30-CONTEXT.md`]
   - Keep the components presentation-only: formatted strings in, bounded layout out. [VERIFIED: `.planning/phases/30-content-helpers-system-status-and-media/30-CONTEXT.md`]

2. Build system-status as a helper-template-driven bundled addon on top of a canonical metric catalog.
   - Extend the existing `live-metrics.ts` seam into a named metric-catalog service instead of scattering `systeminformation` calls inside button renderers. [VERIFIED: `packages/cli/src/system/live-metrics.ts`] [CITED: https://systeminformation.io]
   - Normalize metrics into a shared value shape that can express percentage, absolute number, optional max, units, and unavailability. [ASSUMED]
   - Use `numbro` in addon/support code to turn metric values into display strings, with configuration limited to formatter choice plus metadata overrides. [CITED: https://numbrojs.com/format.html] [VERIFIED: `.planning/phases/30-content-helpers-system-status-and-media/30-CONTEXT.md`]
   - Keep unavailable metrics visible in the helper layout rather than removing them. [VERIFIED: `.planning/phases/30-content-helpers-system-status-and-media/30-CONTEXT.md`]

3. Build media-player as a separate bundled addon with a truthful cross-platform adapter seam.
   - Keep the user-facing contract bounded to `status`, best-effort metadata (`title`, `artist`, `app`), and progress. [VERIFIED: `.planning/phases/30-content-helpers-system-status-and-media/30-CONTEXT.md`]
   - Fix tap to play/pause and route optional hold through the existing action/config seam. [VERIFIED: `.planning/phases/30-content-helpers-system-status-and-media/30-CONTEXT.md`] [VERIFIED: `packages/cli/src/addon/api.ts`]
   - On Linux, plan around either `playerctl` subprocess polling or a `dbus-next` MPRIS adapter, but keep the adapter abstraction thin enough that one Linux implementation can ship first without blocking the other OS seams. `playerctl` is the most directly verified command-line path today; `dbus-next` is the richer in-repo dependency for future event-driven work. [CITED: https://manpages.ubuntu.com/manpages/jammy/man1/playerctl.1.html] [CITED: https://acrisci.github.io/doc/node-dbus-next/] [CITED: https://specifications.freedesktop.org/mpris-spec/latest/Player_Interface.html]
   - Treat macOS and Windows as best-effort adapters with explicit unavailable-state fallback until their implementation paths are verified in code. [ASSUMED]

4. Slice the phase into three execution plans to stay vertical and reviewable.
   - Plan 30-01: external/bundled addons can consume the new public helpers end-to-end.
   - Plan 30-02: users can configure a real system-status button through helper templates and canonical metrics.
   - Plan 30-03: users can configure a real media-player button with truthful status, best-effort metadata, progress, and tap play/pause.

This keeps the phase aligned with the locked decisions, avoids renderer/runtime expansion, and uses the repo's existing seams instead of starting new abstractions from scratch. [VERIFIED: `.planning/phases/30-content-helpers-system-status-and-media/30-CONTEXT.md`] [VERIFIED: `.planning/solutions/best-practices/bespoke-live-visuals-can-stay-inside-the-deck-button-variant-seam-2026-05-15.md`]
