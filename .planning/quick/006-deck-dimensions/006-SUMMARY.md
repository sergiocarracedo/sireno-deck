# Quick Task 006 Summary

**Task:** Emulator deck size is not correct — frontend should force its own dimensions based on device model (button count, columns, rows). In emulation mode, the emulator shell adds gap to align overlay buttons. In hardware mode, no gap.

**Completed:** 2026-06-27

## What was done

1. **Frontend forces its own dimensions** (`packages/cli/frontend/src/components/Deck.tsx`):
   - Removed hardcoded `repeat(5, 72px)` grid
   - Now reads device model from `window.__SIRENO_DEVICE_MODEL__` or `?device=<id>` query param
   - Uses `gridForKeyCount(model.keyCount)` to determine columns/rows
   - Computes width/height from `buttonSize × cols/rows` (with 16px padding on each side)

2. **Emulator shell sizes iframe to match** (`packages/cli/frontend-emulator/src/DeckFrame.tsx`):
   - Iframe now has explicit `width: 72 × columns` and `height: 72 × rows` to match the frontend
   - Added `?device=<id>` query param to the iframe URL so frontend knows the device model
   - No more scrollable deck — all buttons visible at correct size

## Verified end-to-end

- 11 buttons from deck-config render correctly in 5×3 grid (mk2 model)
- No scrollbars — deck fits the iframe perfectly
- Iframe is 360×216px (72px × 5 cols × 72px × 3 rows)
- All 409 tests pass

## Files changed

- `packages/cli/frontend/src/components/Deck.tsx`: Device model resolution + dynamic dimensions
- `packages/cli/frontend-emulator/src/DeckFrame.tsx`: Iframe sized to device model + `?device` query param

## Commit

`28ec043` — feat(quick-006): frontend forces its own deck dimensions based on device model