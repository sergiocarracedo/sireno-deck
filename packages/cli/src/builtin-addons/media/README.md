# media-player

Single button that shows the current track + play/pause state. Tap = play/pause. Hold = next track. The left half of the button is prev/play/pause, the right half is next/volume (split button).

Uses the OS media provider from `os-providers/`:

- Linux: `playerctl` (MPRIS)
- macOS: `osascript`
- Windows: PowerShell + UIA

## Buttons

| Type                | Description                                                     |
| ------------------- | --------------------------------------------------------------- |
| `core:media-player` | Single button: prev / play-pause / next + volume (split action) |

## Config

The button has no config — it auto-discovers the OS media provider.

```yaml
- position: 12
  type: core:media-player
```

## Example

```yaml
decks:
  main:
    name: Main
    buttons:
      - position: 12
        type: core:media-player
```

Run `playerctl status` (Linux) or open Music (macOS) / Windows Media Player to see the state reflected on the button.

## See also

- [OS providers](../../os-providers/README.md) — media player integration per OS
- [system-status](../system-status/README.md) — same addon pattern (no config, polls OS)
