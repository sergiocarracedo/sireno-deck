# session

**Internal-only addon.** Provides the `session:locked` overlay deck that appears when the OS reports the screen is locked (via the OS session provider from `os-providers/`).

You don't reference this addon directly in `config.yml`. The session overlay appears automatically when the OS session is locked and disappears on unlock.

## Decks

| Deck id         | Buttons                                            |
| --------------- | -------------------------------------------------- |
| `session:locked` | Single button: session-info (shows unlock countdown) |

## See also

- [Internal settings](../internal-settings/README.md) — settings overlay
