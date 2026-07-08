# core-buttons

**Internal-only addon.** Provides the four foundational button types every deck depends on. The runtime injects `core:change-deck` automatically (the reserved `n-1` slot); `core:action` and `core:toggle` are user-facing but the runtime also uses them internally for things like the settings back button.

If you're writing user-facing config, you only need `core:action` and `core:change-deck`. The other two are runtime-managed.

## Buttons

| Type                | Description                                                  |
| ------------------- | ------------------------------------------------------------ |
| `core:change-deck`  | Navigate to another deck. Internal: the reserved `n-1` slot. |
| `core:action`       | Run a shell command (`xdg-open`, `google-chrome`, etc.)      |
| `core:toggle`       | Internal: toggle a boolean state in the runtime              |
| `core:media-sample` | Internal: a sample media-player button used in tests         |

## Config

### `core:action`

```yaml
- position: 1
  type: core:action
  config:
    command: "xdg-open https://example.com"
```

### `core:change-deck`

```yaml
- position: 9
  type: core:change-deck
  config:
    deck: emoji
```

`deck` must reference a deck id defined in the same `config.yml` under `decks:`.

## Example

The `main` deck in the repo-root README's example uses both:

```yaml
- position: 1
  type: core:action
  config:
    command: "xdg-open https://example.com"

- position: 9
  type: core:change-deck
  config:
    deck: emoji
```

## See also

- [Internal settings](../internal-settings/README.md) — overlay deck
- [Session](../session/README.md) — `session:locked` deck
