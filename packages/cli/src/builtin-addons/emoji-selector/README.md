# emoji-selector

Adds an emoji deck to your config. Users open it via the `emoji-selector:launcher` button (or any `core:change-deck` pointing to `emoji-selector`), pick from 11 categories (Smileys, People, Animals, Nature, Food, Drink, Activities, Travel, Objects, Symbols, Flags). Each category deck is paginated automatically using `core:page-nav` buttons.

Tapping an emoji sends it directly through the core `type://` dispatch channel — the OS key-input tool (ydotool on Linux with `wtype` as wlroots-only fallback, osascript on macOS, Win32 SendInput on Windows) types the character verbatim, including emoji. On Linux non-ASCII text routes through `wl-copy` + ctrl+v because `ydotool type` does not handle non-BMP characters; the `wl-clipboard` package and `ydotoold` daemon are both required. Double-tapping an emoji with a shortcode types `:shortcode:` as literal text instead.

## Decks

The addon produces:

- `emoji-selector` — the top-level routing deck with one button per category
- `emoji-selector-<categoryId>` — one deck per category (e.g., `emoji-selector-smileys`). Each is marked `paginated: true` so the core splits it into pages with `core:page-nav` buttons.

## Buttons

| Type                      | Gesture    | Behavior                                       |
| ------------------------- | ---------- | ---------------------------------------------- |
| `emoji-selector:launcher` | tap        | Navigate to the `emoji-selector` routing deck  |
| `emoji-selector:category` | tap        | Navigate to the target category deck           |
| `emoji-selector:emoji`    | tap        | Dispatch `type://<emoji>` to type it           |
| `emoji-selector:emoji`    | dblTap     | Dispatch `type://:<shortcode>:` to type it     |
| `emoji-selector:back`     | tap        | Navigate to previous deck                      |
| `core:page-nav`           | tap/dbltap | Navigate to next/previous page (auto-injected) |

## Config

```yaml
decks:
  main:
    name: Main
    buttons:
      # Launcher button (type shortcut uses the addon name)
      - position: 9
        type: emoji-selector
        config:
          favorites: ["😀", "😃", "😄"] # optional: shown first in the Smileys category
```

### How pagination works

Each category deck is marked `paginated: true`. The core automatically splits decks containing more buttons than `keyCount - 2` (13 on a 15-key device) into multiple pages and injects `core:page-nav` buttons. You do not need to configure page navigation manually.

## See also

- [../core/README.md](../core/README.md) — `core:page-nav` and the dispatch channel
