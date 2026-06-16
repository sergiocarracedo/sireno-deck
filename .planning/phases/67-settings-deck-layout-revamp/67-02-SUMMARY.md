# Plan 67-02 Summary

**Completed:** 2026-06-15

## What was built

Rewrote `createInternalSettingsDeck` to use fixed positions
`{0: dim, 1: bright, 2: percent, 4: logo}` (position 3 intentionally empty),
so the runtime-injected system back button at `n-1` is never collided with.
Dropped the `keyCount` parameter and the `keyCount<4` throw — the layout is
now grid-size-independent. The per-button JSX migrations from plan 67-01
(IconLabelSurface for brightness, `<Label>` for the percent subtitle,
`...rest` spread for the `data-sireno-settings-button` test marker) are
preserved untouched.

## Key files

- `packages/cli/src/deck/runtime.ts` — `createInternalSettingsDeck` is now a
  fixed-position builder. `createInternalDecks(keyCount)` no longer forwards
  `keyCount` to the settings deck builder.
- `packages/cli/src/deck/__tests__/internal-settings-deck.test.ts` — 3 tests:
  (a) fixed positions, (b) n-1 is free for back button across keyCount in
  `{6, 9, 15, 32}`, (c) system deck metadata (id=`'settings'`, name=`'Settings'`,
  system=true).
- `packages/cli/src/builtin-addons/internal-settings/67-01-SUMMARY.md` — appended
  a "Design correction" section recording the user-reported regression
  (back button missing) and the corrected fixed-position layout.

## Decisions made

- **Position 3 is intentionally empty.** It is the original `n-1` slot for a
  4-key grid, and the runtime uses `n-1` for the back button on any
  non-main deck. By keeping position 3 empty, the layout is consistent
  across 6/9/15/32-key grids and the back button always has a slot.
- **Logo+version moved from position 0 (CONTEXT D-01) to position 4** (user
  correction during UAT). The user prefers the brightness cluster on the
  left side, with the logo+version in the second row.
- **Drop `keyCount` param from `createInternalSettingsDeck`** — the previous
  n-aware math (`{0, n-3, n-2, n-1}`) is no longer used.
- **Test id assertion fixed from `'__sireno_internal_settings'` to `'settings'`**
  to match `SETTINGS_DECK_ID` (plan was wrong on the value; runtime constant
  is the source of truth).

## Commits

- `c647953` — fix(67): fixed-position settings deck (0/1/2/4) — n-1 free for back button
- `797fdc2` — docs(67): record design correction in 67-01 summary
- `6565006` — test(67): fix deck id assertion to 'settings' (SETTINGS_DECK_ID)

## Notes for downstream

- **CONTEXT.md D-01/D-02/D-03/D-08 are invalidated** by this design correction.
  Plan 67-01 was based on the n-aware layout; the implementation now uses
  fixed positions. The 67-CONTEXT.md should be re-confirmed or updated if
  the user wants the discussion log to match the shipped code.
- **REQUIREMENTS.md SETTINGS-06 wording is also invalidated.** It said
  "n-1 = project logo + version" but the shipped design puts the logo+version
  at position 4. Phase 70 (verification + metadata backfill) is the natural
  place to harmonize the requirement wording with the shipped code.
- **The 4 per-button tests and the addon-shape test (1) are all green** —
  no further test changes are needed for Phase 67.
- **UAT is paused.** `.planning/phases/67-settings-deck-layout-revamp/67-UAT.md`
  has `paused: 2026-06-15T20:00:00Z` and `pause_reason: 67-02 gap closure`.
  The next verify-work run on Phase 67 should resume the UAT file, mark
  tests 1/3-7 as invalidated, and walk through the corrected layout.
