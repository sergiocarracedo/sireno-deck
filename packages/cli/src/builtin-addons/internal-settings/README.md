# internal-settings

**Internal-only addon.** Provides the `settings` overlay deck (brightness, theme, about). The runtime injects `settings` automatically when the `core:settings-entry` button is invoked from the reserved `n-1` slot.

You don't reference this addon directly in `config.yml`. The settings overlay is always available via the back/settings entry button on every deck.

## Buttons

| Type                       | Description                                       |
| -------------------------- | ------------------------------------------------- |
| `core:settings-brightness` | Opens a brightness slider in the settings overlay |
| `core:settings-theme`      | Opens a theme picker in the settings overlay      |
| `core:settings-about`      | Shows the about panel                             |

## Decks

| Deck id    | Buttons                              |
| ---------- | ------------------------------------ |
| `settings` | brightness (0), theme (1), about (2) |

The `settings` deck is auto-generated. To customize the brightness slider's metric, edit the `system-status` addon's settings (see [system-status](../system-status/README.md)).

## See also

- [System status](../system-status/README.md) — provides the brightness metric
- [Session](../session/README.md) — provides the `session:locked` overlay
