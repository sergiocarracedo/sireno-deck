# core

**Internal-only addon.** Provides the foundational button types every deck depends on. The runtime injects `core:change-deck` automatically (the reserved `n-1` slot); `core:action` and `core:toggle` are user-facing but the runtime also uses them internally for things like the settings back button.

If you're writing user-facing config, you only need `core:action` and `core:change-deck`. The other two are runtime-managed.

## Buttons

| Type                | Description                                                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core:change-deck`  | Navigate to another deck. Internal: the reserved `n-1` slot.                                                                                          |
| `core:action`       | Run a shell command (xdg-open, google-chrome, etc.)                                                                                                   |
| `core:toggle`       | Toggle a stateful button. Two modes: legacy `{key,default}` boolean flip, or `statusCommand`/`states` polled status display with per-state tap action |
| `core:page-nav`     | Internal: next/previous deck navigation                                                                                                               |
| `core:media-sample` | Internal: a sample media-player button used in tests                                                                                                  |

## Config

### `core:action`

Requires at least one of `icon` or `label`. Command goes in `actions.tap`
(also accepts `type://<combo-or-text>` URIs for keystroke shortcuts).

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

### `core:toggle`

Two shapes are supported.

**Status mode (recommended):** poll a command, match its trimmed stdout against
`states`, render the matched state's label/icon, and run the matched state's
`onTap` on user tap. Per-button `intervalMs` (default 2000) bounds how often
`statusCommand` runs.

```yaml
- position: 1
  type: core:toggle
  config:
    statusCommand: "playerctl status"
    intervalMs: 2000
    timeoutMs: 5000
    states:
      Playing:
        label: "<xl>$(playerctl title)</xl>"
        icon: "icon://play"
        onTap: "playerctl pause"
      Paused:
        label: "Paused"
        icon: "icon://pause"
        onTap: "playerctl play"
```

Each state entry must declare at least one of `label` or `icon`. `onTap` is
optional — if omitted, tapping still triggers a republish so the deck reflects
the latest status without waiting for the next tick.

**Legacy mode:** keep the runtime boolean flip.

```yaml
- position: 1
  type: core:toggle
  config:
    key: my-flag
    default: false
```

## See also

- [Internal settings](../internal-settings/README.md) — overlay deck
- [Session](../session/README.md) — `session:locked` deck
