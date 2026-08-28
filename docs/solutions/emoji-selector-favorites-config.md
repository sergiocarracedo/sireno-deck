# Emoji-selector `favorites`: valid on the launcher button AND the deck override

**Date:** 2026-08-27
**Status:** current

## Symptom

A user deck button of type `emoji-selector:launcher` with:

```yaml
- position: 9
  type: "emoji-selector:launcher"
  config:
    favorites: ["🐱", "🐙"]
```

failed config validation with `Unrecognized key: "favorites"` even though
`favorites` exists in `EmojiSelectorDeckSchema`
(`builtin-addons/emoji-selector/support.ts`). The key belonged to the
**deck** schema while the button schema (`EmojiLauncherButtonSchema`) was
`{ label }`-only and `.strict()`.

## Resolution

`favorites` is now a valid, **consumed** key on BOTH surfaces
(`EmojiLauncherButtonSchema.favorites`, `EmojiSelectorDeckSchema.favorites`).

Precedence in `materializeAddonDecks` (`cli/commands/addon-decks.ts`):

1. **Launcher button `config.favorites` — wins.** All launcher buttons
   across user decks concatenate in deck order; duplicates dedupe keeping
   the first occurrence.
2. **Per-deck override** `decks["emoji-selector:__multi__"].config.favorites`
   (`AddonDeckOverrideSchema.config`) — applies when no launcher carries a
   list. (The per-deck override's opaque `config` is now also forwarded to
   `createDecks` for the multi-dynamic lookup id, matching the contract
   documented on `AddonDeckOverrideSchema`.)
3. **`DEFAULT_FAVORITES`** — fallback when neither is set.

## Why the launcher wins

The button is the surface users naturally edit (it is the tap target);
the override record is the power-user escape hatch. First-launcher-only
semantics (the old `defaultButton` aggregation) were replaced by
concatenate+dedupe; the generic "multiple launcher buttons" warn from
`collectAddonDefaultButtonConfig` still fires.

## Gotchas

- The frontend's virtual `addons/registry` imports builtin `index.ts`
  files — any module reachable from an addon manifest must stay
  browser-safe (no static `node:*` imports), or the whole app crashes
  with vite's "externalized for browser compatibility" error. Node-side
  pieces belong in a separate `global-entry.ts` (see
  `builtin-addons/coding-agents`).
- The deck factory renders `favorites` via `buildEmojiDeck` — the frontend
  needs no changes to pick this up.
