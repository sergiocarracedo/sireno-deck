---
wave: 1
depends_on: []
gap_closure: true
files_modified:
  - packages/cli/src/builtin-addons/emoji-selector/buttons/entry.tsx
  - packages/cli/src/builtin-addons/emoji-selector/index.ts
  - packages/cli/src/builtin-addons/emoji-selector/support.tsx
  - config.yml
autonomous: true
objective: Strip `select_command` from the emoji-selector entry button's user-facing config so the addon's paste behavior is the only path. Closes test 2 + test 6 gaps from 59-UAT.md.
created: 2026-06-12
---

# 59-GC1 — Strip `select_command` from emoji-selector entry button

> Real UAT on a real Stream Deck found: when the user has `select_command: "printf '%s' '{{emoji}}'"` in their `config.yml`, tapping an emoji runs `printf` to **stdout** and never calls `methods.pasteText`. The emoji never reaches the clipboard. This breaks the whole point of EMO-15/16.
>
> **User design insight (verbatim):** "select command makes no sense in the emoji buttons, those are addon buttons, and the addon provides the behavior not the user, remove the select_command, at least for user, lets discuss if that is the best way."

## Context

The emoji-selector entry button (`packages/cli/src/builtin-addons/emoji-selector/buttons/entry.tsx`) extends the shared `AddonButtonActionConfigSchema` (which includes `select_command`) and the deck generator (`packages/cli/src/builtin-addons/emoji-selector/index.ts:98`) propagates `config.select_command` from the user's deck config to every entry button. The entry button onTap branches: `if (cmd) runCommand(cmd) else pasteText(emoji)`. So a user-set `select_command` defeats the addon's default paste behavior.

The fix is to **strip `select_command` from the entry button's effective config** before the entry button sees it, so the addon's `pasteText` path is the only behavior. This restores the addon ownership boundary: the addon owns the behavior, the user does not override it.

## Tasks

### Task 1: Define a non-action entry button schema

**File:** `packages/cli/src/builtin-addons/emoji-selector/support.tsx`

Add a new schema (or strip helper) for the entry button's effective config that **does not** include `select_command`. The current `EmojiEntryButtonSchema` is used for type validation; the new schema should match the existing one but exclude `select_command`.

The cleanest approach: define a `EmojiEntryButtonEffectiveSchema = EmojiEntryButtonSchema.omit({ select_command: true })` (or `passthrough` strip). Use it in the entry button's `defineMountedButton({ configSchema: ... })` instead of the action-extended one.

### Task 2: Strip `select_command` from the deck generator

**File:** `packages/cli/src/builtin-addons/emoji-selector/index.ts`

In `emojiSelectorDeck.createDecks` (around line 91-101), the entry buttons are generated with `select_command: config.select_command` attached. Remove the `select_command` line from the button object — the addon no longer accepts it. The `select_command` field on the user's `EmojiSelectorDeckSchema` should also be removed from the user-facing schema (it's a leaky knob).

Verify: `EmojiSelectorDeckSchema` is in `support.tsx`. Remove `select_command` from there too.

### Task 3: Remove the action config extension from the entry button

**File:** `packages/cli/src/builtin-addons/emoji-selector/buttons/entry.tsx`

Remove the `EmojiEntryButtonWithActionsSchema` extension and use the non-action schema from Task 1. The onTap body simplifies — it no longer needs to check `select_command`; it always calls `methods.pasteText(config.emoji)`. The onDblTap body is unchanged (it always called `pasteText`).

### Task 4: Update `config.yml` example

**File:** `/works/opensource/sireno-deck/config.yml`

The `emoji:` deck has `select_command: "printf '%s' '{{emoji}}'"` — remove that line. The shipped example was misleading because it suggested `select_command` was the way to inject the emoji; under the new design the addon handles it.

### Task 5: Build and verify

**Action:** Run build and the emoji-selector test suite. The `emoji-selector/index.test.ts` has tests at lines 14, 154-189 that exercise the entry button's tap/dbl-tap with `pasteText` — these should still pass (and become stricter, since the entry button no longer has a `select_command` branch).

**Verify:** `pnpm --filter sireno-deck-cli build` exits 0. `pnpm --filter sireno-deck-cli test src/builtin-addons/emoji-selector/index.test.ts` — same baseline + any new assertions. The test at line 175-189 (`'calls methods.runCommand with the select_command-replaced emoji on tap'`) will need to be removed/updated since the entry button no longer has a `select_command` path.

**Done:** The emoji-selector entry button ignores `select_command` entirely; the addon's `pasteText` is the only behavior.

## Must Haves

- [ ] `EmojiEntryButtonSchema` (effective, no action config) replaces `EmojiEntryButtonWithActionsSchema` in the entry button's `defineMountedButton`
- [ ] `emojiSelectorDeck.createDecks` does not propagate `select_command` to entry buttons
- [ ] `EmojiSelectorDeckSchema` no longer exposes `select_command` to the user
- [ ] `config.yml` no longer sets `select_command` on the `emoji:` deck
- [ ] Emoji-selector tests pass (with the now-obsolete `select_command` tap test removed/updated)
- [ ] Build is clean
