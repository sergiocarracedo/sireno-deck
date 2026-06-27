# emoji-selector

Adds an emoji deck to your config. Users open it via `core:change-deck` and pick from 8 categories (Smileys, Nature, Food, Activity, Travel, Objects, Symbols, Flags), each with up to 32 emojis paginated across multiple decks.

Selecting an emoji in the UI sends the emoji character to the system clipboard (via `xclip` / `pbcopy` / `clip.exe`).

## Decks

The addon auto-generates one deck per category. Each category deck has up to 32 emoji buttons (1 page), plus prev/next nav buttons if paginated.

Deck ids follow the pattern `emoji:{category}` (e.g., `emoji:smileys`, `emoji:nature`).

## Buttons

| Type                          | Description                                  |
| ----------------------------- | -------------------------------------------- |
| `core:emoji-emoji-button`     | Renders one emoji; on tap, copies to clipboard |
| `core:emoji-page-nav`         | Internal: prev/next page navigation          |

## Config

```yaml
decks:
  main:
    name: Main
    buttons:
      - position: 9
        type: core:change-deck
        config:
          deck: emoji:smileys

      # Optional: favorite emojis that appear first
  emoji:smileys:
    name: Smileys
    config:
      favorites: ["😀", "😃", "😄"]
    buttons:
      - position: 0
        type: core:change-deck
        config:
          deck: main
```

## Example

In your `main` deck:

```yaml
- position: 9
  type: core:change-deck
  config:
    deck: emoji:smileys
```

Press position 9 → opens the Smileys deck → tap an emoji → it's on your clipboard.

## See also

- [core-buttons](../core-buttons/README.md) — `core:change-deck` to open the emoji deck
