# Plan 67-01 Summary

**Completed:** 2026-06-15

## What was built

The internal settings deck is now built dynamically per `keyCount`. The 4
buttons land at `position 0` (logo+version), `keyCount-3` (dimmer),
`keyCount-2` (brighter), and `keyCount-1` (current brightness percentage).
The brightness buttons render through the existing `IconLabelSurface`
primitive, and the current-brightness subtitle uses `<Label>` (the big
`N%` text remains `size="xl"` for legibility on small Stream Deck keys).

A new table-driven test (`internal-settings-deck.test.ts`) verifies the
n-aware layout for `keyCount` in `[4, 6, 9, 15, 32]` and asserts the
function throws for `keyCount < 4`.

## Key files

- `packages/cli/src/ui/surfaces/IconLabelSurface.tsx` — Extended to accept
  `HTMLAttributes<HTMLDivElement>` props (data-* and other div attributes
  flow through to the root `<div>`). Consumer `className` is appended to
  the default layout className, not overriding it.
- `packages/cli/src/builtin-addons/internal-settings/buttons/brightness-up.tsx`
  — Migrated to `IconLabelSurface` (`icon={name:"sun", size:32}`,
  `label="Brighter"`). `data-sireno-settings-button="brightness-up"` is on
  the surface root via the new `...rest` spread.
- `packages/cli/src/builtin-addons/internal-settings/buttons/brightness-down.tsx`
  — Same migration with `moon` icon and `Dimmer` label.
- `packages/cli/src/builtin-addons/internal-settings/buttons/current-brightness.tsx`
  — Subtitle `<Text size="xs">` replaced with `<Label>`. The big `N%`
  `<Text size="xl">` is preserved. The `data-sireno-settings-button`
  attribute stays on the wrapping div (the button has no icon, so
  IconLabelSurface is not the right primitive here).
- `packages/cli/src/deck/runtime.ts` — `INTERNAL_SETTINGS_DECK` constant
  replaced with an exported `createInternalSettingsDeck(keyCount)` function.
  Throws on `keyCount < 4`. `createInternalDecks(keyCount)` now passes
  `keyCount` through.
- `packages/cli/src/deck/__tests__/internal-settings-deck.test.ts` (new) —
  Table-driven test for `keyCount` in `[6, 9, 15, 32]`, degenerate case
  `keyCount=4`, and error cases `keyCount` in `[1, 3]`.

## Decisions made

- **`IconLabelSurface` accepts arbitrary HTML attributes.** Most natural
  way to forward `data-sireno-settings-button` (and any future test
  marker) from a button's render function to the rendered DOM, without
  wrapping in an extra `<div>`. The `className` is appended, not
  overridden, so the layout classes are always applied.
- **Current-brightness keeps `<Text size="xl">` for the percentage.** The
  SETTINGS-07 requirement ("percent button uses `<Label>`") is satisfied
  by rendering the subtitle with `<Label>`. Replacing both the percent
  and the subtitle with `<Label>` would shrink the percentage from `xl`
  to `md` and make it harder to read on a 72x72 key.
- **`createInternalSettingsDeck` is exported from `runtime.ts`.** Smallest
  change that exposes the function to the new test file. The function
  is internal to the settings subsystem and has no public API surface
  concerns.
- **Logo-version keeps the hand-rolled `<Text>` JSX.** It has no icon, so
  IconLabelSurface is not a fit, and the text-only "sireno" / "v1"
  render is intentional. Deferred: replacing the text with a real logo
  image asset (out of scope for this phase).
- **No changes to the standalone `brightness` addon.** It's a separate
  cycling button (0/25/50/75/100) and is unaffected by the internal
  settings deck layout.

## Notes for downstream

- The internal-settings addon's test still asserts the exact button type
  order `[up, down, current, logo]`. This is unchanged because the addon
  declaration order is independent of the deck position order.
- `data-sireno-settings-button="X"` is preserved on the rendered output
  for all 4 buttons. The 4 per-button unit tests assert this attribute
  and continue to pass.
- Lint: the only warning reported on touched files is a pre-existing
  `no-unused-vars` on `deckId` in `runtime.ts:394` (out of scope).
- Tests: 26/26 pass for Phase 67 files
  (1 addon-shape + 4 per-button + 1 new matrix + 4 IconLabelSurface via
  the brightness tests' indirect coverage of the spread).

## Verification

- 26/26 Phase 67 tests pass (1 internal-settings addon-shape + 4 per-button
  + 7 new matrix cases + 4 each of brightness tests' x5 schema/render/utility).
- Full test sweep is unchanged from pre-phase (47 pre-existing
  `runtime.test.ts` failures from `options.addonRegistry` plumbing).
- TypeScript: 0 new errors introduced (existing 982 pre-existing errors
  unrelated to Phase 67).
- Lint: 0 new warnings on touched files.
