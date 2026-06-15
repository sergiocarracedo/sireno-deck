# Plan 59-GC1 Summary

**Completed:** 2026-06-12

## What was built

Stripped `select_command` from the emoji-selector entry button's user-facing config so the addon's `pasteText` behavior is the only path. Previously, when a user set `select_command: "printf '%s' '{{emoji}}'"` in their `config.yml`, tapping an emoji ran the printf command to stdout and never called `methods.pasteText` — the emoji never reached the clipboard.

## Key files

- `packages/cli/src/builtin-addons/emoji-selector/support.tsx` — removed `select_command` from `EmojiEntryButtonSchema` and `EmojiSelectorDeckSchema`.
- `packages/cli/src/builtin-addons/emoji-selector/index.ts` — deck generator no longer propagates `config.select_command` to entry buttons.
- `packages/cli/src/builtin-addons/emoji-selector/buttons/entry.tsx` — removed the `EmojiEntryButtonWithActionsSchema` extension; entry button onTap always calls `methods.pasteText(config.emoji)`. Added `getEmojiFallbackLabel` import that was lost in the rewrite.
- `config.yml` — removed `select_command: "printf '%s' '{{emoji}}'"` from the `emoji:` deck.
- `packages/cli/src/builtin-addons/emoji-selector/index.test.ts` — removed 14 `select_command: "printf '%s' '{{emoji}}'"` lines from test configs. Replaced obsolete `'runs the select command with the chosen emoji'` test with `'pastes the emoji character on tap'`.
- `packages/cli/src/config/loader.test.ts` — removed 3 `select_command` references in inline YAML strings; updated 2 assertions that expected `select_command` on entry buttons to check `emoji` field instead.
- `packages/cli/src/deck/__tests__/runtime.test.ts` — updated `'navigates generated emoji decks and runs the favorites selection command'` test to `'navigates generated emoji decks and pastes the favorite on tap'`; removed `select_command` from the config; updated assertion to verify `executeAction` is NOT called (since the entry button no longer uses runCommand on tap). Added missing `addonRegistry: registry` to the runtime creation.
- `packages/cli/fixtures/phase-11/config.host-context.yml` — removed `select_command`.
- `packages/cli/fixtures/phase-20/config.asset-pipeline.yml` — removed `select_command`.
- `packages/cli/fixtures/phase-23/config.yml` — removed `select_command`.

## Decisions made

- **Removed `select_command` entirely from the emoji-selector user-facing config** rather than keeping it as a parallel path. The user's design insight was: `select_command` makes no sense in the emoji-selector context because the addon owns the behavior. The user shouldn't be overriding addon behavior via config. The action config extension (`AddonButtonActionConfigSchema`) was removed from the entry button's schema.
- **The deck generator's propagation of `config.select_command` was the leak** — removing the field from the user-facing schema fixes both the tap path (entry button) and the deck generator. No code change to the generator's button object was strictly required after the schema change, but the explicit removal is clearer.

## Notes for downstream

- The `select_command` field is now gone from the emoji-selector entirely. If the user previously relied on this field for shell-script injection of emojis, they will need to use a different mechanism (e.g., the bundled `action` button type with a `command` field, or a custom addon).
- The `action` button type still supports `select_command` — only the emoji-selector's entry button was changed.
- The test `'pastes the emoji character on tap'` is the new contract for the entry button onTap behavior. Any future regression that re-introduces the `select_command` branch would fail this test.
