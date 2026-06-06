# Plan 49-03 Summary

**Completed:** 2026-06-06

## What was built

Shipped the n-2 page nav layout (Tap=next, Dbl Tap=prev with chip overlays) and the addon-decorated system back behavior. The page nav button is a single `change-deck` instance at position 13 with `meta: 'page-nav'`, `target_deck` (next or self on last page), and `target_deck_double_tap` (prev or self on first page). The change-deck's render detects `meta === 'page-nav'` and shows a chevron with two corner chips: "Tap" (top-left) and "Dbl Tap" (bottom-right). When the corresponding tap/double-tap is a no-op (target equals current page), the chip is hidden.

The addon-decorated system back uses two new optional fields on the deck config: `system_back_tap_command` and `system_back_hold_command`. When the active deck sets either field, the runtime routes the system back gesture through `executeAction` (the action executor) instead of the default goBack/restoreStack behavior. Default behavior is preserved when the fields are unset.

The createDecks function was rewritten for the new per-page layout: 12 emojis (positions 0-11), position 12 empty (visual breathing room), position 13 is the n-2 page nav (only on multi-page categories), position 14 is the system back (injected by the runtime, not by the addon). `EMOJI_PAGE_SIZE` changed from 14 to 12 and `restPageSize` is now uniform (no prev-displacement adjustment needed since the n-2 page nav is at position 13, outside the emoji grid).

## Key files

- `packages/cli/src/builtin-addons/core-buttons/buttons/change-deck.tsx` — MODIFIED. Added `meta` (optional) and `target_deck_double_tap` (optional) fields to the schema. Custom onTap with timestamp-based double-tap detection using `store.button.snapshot.tapAt` (300ms window). Render detects `meta === 'page-nav'` and renders the chip overlay. The overlay conditionally hides "Tap" or "Dbl Tap" chips based on whether the corresponding tap/double-tap is a no-op (target equals current page).
- `packages/cli/src/builtin-addons/emoji-selector/support.tsx` — MODIFIED. Added optional `system_back_tap_command` and `system_back_hold_command` to `EmojiSelectorDeckSchema`. Changed `EMOJI_PAGE_SIZE` from 14 to 12 and made `paginateEmojis` use a uniform page size (no prev-displacement adjustment).
- `packages/cli/src/builtin-addons/emoji-selector/index.ts` — MODIFIED. Rewrote `createDecks` for the new layout. The `buildPageNavButton` helper builds the page nav button with the right `target_deck` (next or self) and `target_deck_double_tap` (prev or self) based on the current page index.
- `packages/cli/src/builtin-addons/emoji-selector/index.test.ts` — MODIFIED. Updated the pagination tests to use 12-emoji pages. The "treats EMOJI_PAGE_SIZE+1 favorites as 2 pages" test now asserts the page nav at position 13 with `meta: 'page-nav'` and `target_deck_double_tap`.
- `packages/cli/src/core/schemas.ts` — MODIFIED. Added `system_back_hold_command?: string` and `system_back_tap_command?: string` to the `DeckConfig` interface.
- `packages/cli/src/deck/runtime.ts` — MODIFIED. The system-back case in `instantiateRuntimeButtonInstance` now reads `runtimeDecks[deckId]?.system_back_tap_command` and `system_back_hold_command` at instance creation time. When set, `onTap` and `onPress` route through `executeAction` instead of the default goBack/restoreStack behavior.
- `packages/cli/src/deck/runtime.test.ts` — MODIFIED. Added two new tests: "routes the system-back tap through system_back_tap_command when set on the active deck" and "routes the system-back press through system_back_hold_command when set on the active deck". Both use `subscribeKeyEvents` to capture the registered listener and trigger a synthetic press at keyIndex 14.

## Decisions made

- The plan called for "reusing the Phase 34 commands.tap / commands.double-tap action contract" on change-deck. That contract's `commands.tap` is a literal string run via `methods.runCommand`, but navigation needs `methods.navigateToDeck`. There is no `sireno navigate` CLI subcommand. Pragmatic deviation: implemented double-tap detection directly in change-deck's onTap using a per-button `store.button.snapshot.tapAt` timestamp (300ms window). The user-visible contract is preserved (tap=next, double-tap=prev, chip overlays).
- The page nav button is a single `change-deck` at position 13 with `meta: 'page-nav'`. The render is detected in the change-deck's render function and switched to the chip overlay layout. The `meta` field is a stringly-typed hint that the change-deck's render knows about.
- The system back is read at instance creation time, not at tap time. This means the `system_back_tap_command` / `system_back_hold_command` must be set on the deck config that's passed to `createDeckRuntime` BEFORE `runtime.start()` is called. Mutating the deck config after start has no effect.
- The `runtimeDecks[deckId]?.system_back_tap_command` lookup uses the `runtimeDecks` object (the union of `options.deck` and the implicit locked-session deck), not `options.deck` directly. This ensures the locked-session deck (if any) can also have its own system back override.
- The change-deck's chip overlay uses two `div`s with `absolute` positioning, not the `Chip` component. The reason: `Chip` is a styled component with a defined typography/background, while the chip here is a tiny corner label with `text-[10px]` and `opacity-70`. The smaller custom markup keeps the chevron visually centered.

## Notes for downstream

- Plan 49-04 (the new `emoji-launcher` button type with 2×3 grid) does not depend on the page nav or system back changes. The launcher is a separate button type rendered on the main deck.
- The pre-existing 43 runtime.test.ts failures (unrelated to Phase 49) remain. They are out of scope for this phase.
- The system back decoration is a runtime-level feature — any addon-decorated deck can use it, not just the emoji-selector. The `system_back_tap_command` / `system_back_hold_command` fields are on the global `DeckConfig` interface.
- The change-deck's double-tap detection uses `Date.now()` for timestamp comparison. This is sufficient for the 300ms window; if the runtime ever becomes a more time-sensitive consumer (e.g. for higher-rate gesture detection), consider switching to `performance.now()`.
