# internal-settings

**Internal-only addon.** Provides the `settings` overlay deck (brightness up/down, app info). The runtime injects `settings` automatically when the `internal-settings:settings` deck is opened from the reserved `n-1` slot.

You don't reference this addon directly in `config.yml`. The settings overlay is always available via the back/settings entry button on every deck.

## Buttons

| Type                                   | Description                                          |
| -------------------------------------- | ---------------------------------------------------- |
| `internal-settings:brightness-up`      | Increase screen brightness                          |
| `internal-settings:brightness-down`    | Decrease screen brightness                          |
| `internal-settings:app-info`           | Shows the about / app info panel                    |

## Decks

| Deck id                          | Buttons                                          |
| -------------------------------- | ------------------------------------------------ |
| `internal-settings:settings`    | brightness-up (0), brightness-down (1), app-info (2) |

The `settings` deck is auto-generated. The brightness buttons delegate to the OS provider's brightness control (see [brightness](../brightness/README.md)).

## See also

- [brightness](../brightness/README.md) — brightness OS provider
- [Session](../session/README.md) — provides the `session:locked` overlay
