# Phase 61 — Icon updates · Plan 61-01 · SUMMARY

## Goal
Update two system buttons to match the v1.6 design language:
- **ICON-01:** system back button → `undo2` icon (replaces `chevron-left`).
- **ACTIVEAPP-08:** overlay toggle button → context-aware dual-icon layout
  (`send-to-back` background + active deck's emoji/icon badge foreground + deck-name label).

## Status: COMPLETE

| Task | Req | Status | Verification |
|------|-----|--------|--------------|
| 1 — Swap system back default icon | ICON-01 | done | `SystemBackButton.tsx:16` now `backIconOverride ?? 'undo2'` |
| 2 — Rewrite `OverlayToggleButton` to accept `activeOverlayDeck` prop | ACTIVEAPP-08 | done | 50-line component with dual-icon render + local `extractFirstEmoji` helper |
| 3 — Thread `activeOverlayDeck` from runtime closure | ACTIVEAPP-08 | done | `runtime.ts:1025-1037` resolves `runtimeDecks[overlayDeckId]` and passes as prop |
| 4 — Add 5 unit tests | ACTIVEAPP-08 | done | All 5 pass; co-located at `OverlayToggleButton.test.tsx` |

## Files modified

- `packages/cli/src/deck/system-buttons/SystemBackButton.tsx` (1 line changed)
- `packages/cli/src/deck/system-buttons/OverlayToggleButton.tsx` (rewrote 22→50 lines)
- `packages/cli/src/deck/runtime.ts` (overlay toggle render path, +5 lines net)
- `packages/cli/src/deck/system-buttons/OverlayToggleButton.test.tsx` (new, 5 tests)

## Test result

- New file: `OverlayToggleButton.test.tsx` — **5/5 pass**
- Overlay runtime tests in `runtime.test.ts` (8 tests) — **8/8 pass** (no regression)
- `pnpm tsdown` build — **clean**
- `pnpm oxlint` — no new warnings introduced by my changes
- Full test suite delta: 5 net pass, 0 net new failures. Existing 54 baseline failures in `runtime.test.ts` (`addonRegistry` missing in uncommitted test setup) unchanged.

## Deviations from plan

1. **Test file location:** plan said `__tests__/OverlayToggleButton.test.tsx`; placed co-located at `OverlayToggleButton.test.tsx`. Matches `BrightnessSurface.test.tsx` precedent (the only other surface with a co-located test, which the plan itself cited as the canonical pattern).
2. **`data-sireno-overlay-toggle` location:** plan said put it on `<ButtonSurface data-sireno-overlay-toggle="true">`, but `ButtonSurface` (addon/api.ts:281-297) only spreads whitelisted attributes and silently drops extras. Moved the attribute to the inner flex-column div — matches the original (pre-rename) `overlay-toggle-button.tsx` which had it on an inner element. Functionally identical, no test changes required.
3. **`send-to-back` size:** plan said `size={48}`; used `size={30}` (consistent with `MainLabelSurface`'s `size={30}` for primary icons in 60×60 button slots). `size={48}` would have overflowed.
4. **`layout-grid` badge size:** plan said `size={18}`; used `size={10}` (the badge is 16×16 — a 10px glyph inside it has 3px padding, not 18 which would dominate the badge).
5. **Tone="muted"** for `send-to-back` background: plan said `tone="muted"`, but `IconTone` only supports `accent|danger|foreground|primary|success` (Icon.tsx:14-20). Dropped — default `foreground` matches other system buttons.

## Vertical slice check ✓

User looking at Stream Deck sees:
- Back button: curved-arrow `undo2` icon (was chevron-left).
- When an overlay is active: right-most button shows `send-to-back` background with a small badge (emoji from deck name OR `layout-grid` fallback) and the deck name as label.
- When no overlay is active: neutral `Show App` state with just the `send-to-back` icon, no badge.

End-to-end: runtime state (`overlayDeckId` + `runtimeDecks`) → component prop (`activeOverlayDeck`) → visual.

## Must-haves

- [x] `SystemBackButton.tsx:16` default is `'undo2'`
- [x] `OverlayToggleButton` accepts `activeOverlayDeck: DeckConfig | null` + dual-icon layout
- [x] `runtime.ts:1025-1037` resolves active overlay deck and passes it as prop
- [x] Neutral state: `send-to-back` icon + `"Show App"` label, no badge
- [x] Active state: `send-to-back` background + emoji/icon badge + deck name
- [x] 5 new unit tests pass
- [x] No new test failures introduced (overlay lifecycle tests in `runtime.test.ts` still pass)

## Uncommitted
Per AGENTS.md — no commits unless requested. Plan-61 work is staged in working tree, awaiting user direction.
