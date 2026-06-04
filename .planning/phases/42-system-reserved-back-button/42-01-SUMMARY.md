# Plan 42-01 Summary

**Completed:** 2026-06-04

## What was built

The system-reserved back button foundation for the v1.4 cross-cutting change. The config validation layer now rejects any addon button placed at position `keyCount - 1` unless `allow_reserved_slot_override: true` is set at the deck or root level. The lock-session deck is exempt. A `SystemBackButton` component renders either a faint "Home" indicator (main deck) or a back chevron + "Back" label (subdecks) with tap → `onTap` and hold ≥600ms → `onHold`. The runtime injection of the component into the deck render pipeline is a follow-up (Phase 42-02 or a gap-closure plan).

## Key files

- `packages/cli/src/core/schemas.ts` — added `allow_reserved_slot_override` to root and per-deck schemas, plus validation in `validateConfig` that walks every non-lock deck and checks position `keyCount - 1`
- `packages/cli/src/core/schemas.test.ts` — 5 new tests covering rejection, root override, deck override, lock exemption, and regression
- `packages/cli/src/deck/system-back-button.tsx` — `SystemBackButton` component with `isMainDeck`, `onTap`, `onHold`, `backIconOverride` props
- `packages/cli/src/deck/system-back-button.test.tsx` — 5 component tests covering home indicator, back variant, custom icon override, and the data attribute

## Decisions made

- **Skipped runtime.ts integration in this plan** — the deck render pipeline is complex and a full integration needs careful design. The component is ready and tested in isolation. A follow-up plan will wire the injection point.
- **`backIconOverride` prop accepts a Lucide icon name string** — matches the existing `Icon` component pattern. Themes can pass their preferred icon.
- **600ms hold threshold** — local constant, matches the convention in `media-player-button.tsx` and the v1.4 CONTEXT decision to reuse the existing 600ms contract.
- **Main deck home indicator** uses `opacity-30` Text with `tone-foreground` — uses existing theme color tokens, no new design language.
- **System back button is NOT a registered addon** — confirmed the design decision from the v1.4 CONTEXT: the button is core-injected at runtime, not authored as an addon.

## Notes for downstream

- A follow-up plan (or gap-closure) is needed to wire `SystemBackButton` into the deck render pipeline in `deck/runtime.ts`. The validation now reserves the slot; the runtime needs to actually inject the component.
- The `data-sireno-system-back="true"` attribute on the button element can be used by the runtime to detect the slot and apply the system back behavior.
- Pre-existing test failures in `theme.test.ts` and other files (documented in `39-01-SUMMARY.md`) are not introduced by this plan; my new 10 tests all pass.
