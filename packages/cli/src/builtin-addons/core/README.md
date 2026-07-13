# core

**Internal-only addon.** Provides the foundational button types every deck depends on. The runtime injects `core:change-deck` automatically (the reserved `n-1` slot); `core:action` and `core:toggle` are user-facing but the runtime also uses them internally for things like the settings back button.

If you're writing user-facing config, you only need `core:action` and `core:change-deck`. The other two are runtime-managed.

## Buttons

| Type                | Description                                                  |
| ------------------- | ------------------------------------------------------------ |
| `core:change-deck`  | Navigate to another deck. Internal: the reserved `n-1` slot. |
| `core:action`       | Run a shell command (xdg-open, google-chrome, etc.)          |
| `core:toggle`       | Internal: toggle a boolean state in the runtime              |
| `core:page-nav`     | Internal: next/previous deck navigation                      |
| `core:media-sample` | Internal: a sample media-player button used in tests         |

## Config

### `core:action`

Requires at least one of `icon` or `label`. Command goes in `actions.tap`
(also accepts `macro://` and `paste://` URIs for keystroke shortcuts).

```yaml
- position: 1
  type: core:action
  actions:
    tap: "xdg-open https://example.com"
  config:
    label: Open
    icon: icon://globe
```

### `core:change-deck`

```yaml
- position: 9
  type: core:change-deck
  config:
    deck: emoji
```

`deck` must reference a deck id defined in the same `config.yml` under `decks:`.

## See also

- [Internal settings](../internal-settings/README.md) — overlay deck
- [Session](../session/README.md) — `session:locked` deck
