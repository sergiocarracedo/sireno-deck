# Phase 34 Research — Button action command interface

**Researched:** 2026-06-02
**Phase goal:** Add a shared optional button action-command contract so addon buttons can declaratively map `tap`, `hold`, and `double-tap` events to system commands through one common schema and hook.

## Don't Hand-Roll

- Reuse the existing mounted-button lifecycle seams (`onPress`, `onRelease`, `onTap`) instead of widening core runtime with a new gesture subsystem. [VERIFIED: packages/cli/src/addon/api.ts] [VERIFIED: packages/cli/src/deck/runtime.ts]
- Reuse `methods.runCommand(...)` and the shared executor path instead of creating a second command-execution helper for gesture actions. [VERIFIED: packages/cli/src/action/executor.ts] [VERIFIED: packages/cli/src/addon/api.ts]
- Reuse one shared addon-facing schema fragment plus hook for command gestures rather than keeping per-addon flat fields like `command`, `tap_command`, and `hold_command`. [VERIFIED: .planning/phases/34-button-action-command-interface/34-CONTEXT.md] [VERIFIED: packages/cli/src/builtin-addons/core-buttons/buttons/action.tsx] [VERIFIED: packages/cli/src/builtin-addons/system-status/schemas.ts]
- Reuse Zod object composition plus `.partial()` for the nested `commands` object instead of duplicating optional gesture fields across every schema. Zod explicitly supports object reuse via spread/`.extend()` and optionalization through `.partial()`. [CITED: https://zod.dev/api?id=partial]

## Common Pitfalls

- Do not let single-tap and double-tap both fire.
  - What goes wrong: a quick double tap runs the single-tap command first and then the double-tap command, which violates the locked phase decision.
  - Why: double-tap recognition depends on elapsed time between consecutive taps, so immediate single-tap execution closes the window too early. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Touch_events/Using_Touch_Events] [VERIFIED: .planning/phases/34-button-action-command-interface/34-CONTEXT.md]
  - How to avoid: treat `double-tap` as owning the shared tap window whenever both handlers exist; queue the single tap briefly and suppress it when a second tap arrives in time. [VERIFIED: 34-CONTEXT.md]

- Do not hide gesture semantics in core runtime.
  - What goes wrong: runtime starts owning command-action capability policy, timing knobs, or button-specific behavior that should stay addon-facing.
  - Why: this repo already locked the architecture boundary that core stays capability-agnostic while addons own button semantics. [VERIFIED: .planning/phases/32-addon-owned-data-polling-contract/32-CONTEXT.md] [VERIFIED: packages/cli/src/deck/runtime.ts]
  - How to avoid: keep the shared command-action logic in the addon API seam as a reusable helper/hook that composes into mounted definitions using the runtime callbacks already present. [VERIFIED: packages/cli/src/addon/api.ts]

- Do not keep legacy config aliases after standardizing the contract.
  - What goes wrong: addon schemas accept both flat `tap_command` / `hold_command` and nested `commands.*`, creating drift and extra validation branches.
  - Why: the phase discussion explicitly chose a hard cut to the nested `commands.tap | hold | double-tap` shape with no dual-shape compatibility. [VERIFIED: .planning/phases/34-button-action-command-interface/34-DISCUSSION-LOG.md]
  - How to avoid: publish one reusable nested schema/interface and migrate adopters straight to it in the same phase. [VERIFIED: 34-CONTEXT.md]

- Do not over-couple gesture execution to UI refresh.
  - What goes wrong: the shared hook starts calling `methods.invalidate()` automatically even when a button has no visual state change, widening behavior beyond command dispatch.
  - Why: the phase decisions explicitly kept the hook narrow and left refresh ownership with each button. [VERIFIED: .planning/phases/34-button-action-command-interface/34-CONTEXT.md]
  - How to avoid: keep the shared helper limited to timer bookkeeping, gesture resolution, and awaited `methods.runCommand(...)`, with no implicit invalidation or second-layer failure UX. [VERIFIED: 34-CONTEXT.md] [VERIFIED: packages/cli/src/action/executor.ts]

## Existing Patterns in This Codebase

- `packages/cli/src/addon/api.ts` is already the public addon authoring seam and already exports the exact runtime methods the shared command-action helper needs. [VERIFIED: packages/cli/src/addon/api.ts]
- `packages/cli/src/index.ts` already re-exports addon API helpers from the package root, so a new public schema fragment/hook can become package-public without inventing a second export surface. [VERIFIED: packages/cli/src/index.ts]
- `packages/cli/src/deck/runtime.ts` already delivers `down -> onPress`, `up -> onRelease`, then `onTap`; that is enough to implement shared hold and delayed/double tap semantics addon-side. [VERIFIED: packages/cli/src/deck/runtime.ts]
- `packages/cli/src/builtin-addons/core-buttons/buttons/action.tsx` is the smallest live adopter and currently proves the migration target: replace flat `command` plus ad-hoc `onTap` execution with the shared nested `commands` contract. [VERIFIED: packages/cli/src/builtin-addons/core-buttons/buttons/action.tsx]
- `packages/cli/src/builtin-addons/system-status/buttons/bars.tsx` and `label-values.tsx` already contain duplicated 600ms hold-timer bookkeeping in button-local store state, which the shared hook should replace. [VERIFIED: packages/cli/src/builtin-addons/system-status/buttons/bars.tsx] [VERIFIED: packages/cli/src/builtin-addons/system-status/buttons/label-values.tsx]
- `packages/cli/src/builtin-addons/date-time/*` regular buttons currently have no gesture handlers, making them a clean rollout target for optional nested command support without touching locked tiles. [VERIFIED: packages/cli/src/builtin-addons/date-time/schemas.ts] [VERIFIED: packages/cli/src/builtin-addons/date-time/buttons/date-time.tsx] [VERIFIED: packages/cli/src/builtin-addons/date-time/buttons/analog-clock.tsx] [VERIFIED: packages/cli/src/builtin-addons/date-time/buttons/calendar-sheet.tsx]
- `packages/cli/src/builtin-addons/media-player/button.tsx` already has its own truthful tap/hold semantics and local invalidation behavior, and the phase explicitly keeps it separate. [VERIFIED: packages/cli/src/builtin-addons/media-player/button.tsx] [VERIFIED: 34-CONTEXT.md]

## Recommended Approach

1. Add one public addon-facing command-action contract in `packages/cli/src/addon/api.ts`, then re-export it from `packages/cli/src/index.ts`: a reusable nested `commands` schema/interface plus a narrow `useButtonActionCommand(...)` helper that returns mounted-button gesture handlers only. Keep the helper async, await commands, allow partial command maps, and encode the locked semantics: one shared hold threshold, long press owned by `hold`, and `double-tap` suppressing `tap`. [VERIFIED: 34-CONTEXT.md] [VERIFIED: packages/cli/src/addon/api.ts] [VERIFIED: packages/cli/src/index.ts] [CITED: https://zod.dev/api?id=partial] [CITED: https://developer.mozilla.org/en-US/docs/Web/API/Touch_events/Using_Touch_Events]
2. Prove the contract end-to-end on the bundled `action` button first. This is the smallest user-visible tracer bullet and the cleanest regression seam for validating the public contract without touching polling-heavy buttons yet. [VERIFIED: packages/cli/src/builtin-addons/core-buttons/buttons/action.tsx] [VERIFIED: packages/cli/src/builtin-addons/core-buttons/index.test.ts]
3. Migrate existing command-capable built-ins that currently duplicate or lack gesture-command behavior onto the same contract in two follow-up cuts: first system-status (replace flat fields and duplicated hold bookkeeping while preserving polling/unavailable behavior), then regular date-time buttons (add optional `commands` support across `date-time`, `time`, `analog-clock`, `clock`, and `calendar-sheet` while leaving locked tiles untouched). [VERIFIED: 34-CONTEXT.md] [VERIFIED: packages/cli/src/builtin-addons/system-status/index.test.ts] [VERIFIED: packages/cli/src/builtin-addons/date-time/index.test.ts]
4. Keep media-player out of the migration. It already owns distinct truthful play/pause semantics and would turn this phase into a second behavioral redesign instead of a shared command-action standardization pass. [VERIFIED: .planning/phases/30-content-helpers-system-status-and-media/30-CONTEXT.md] [VERIFIED: packages/cli/src/builtin-addons/media-player/button.tsx]
