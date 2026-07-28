# Pomodoro

A built-in addon that surfaces a Pomodoro timer as a button. Tap to start, tap again to stop, tap from `finished` to start a new cycle. On completion the button blinks red for **10 s** and fires an OS notification with a bundled bell sound.

## Button type

`pomodoro:pomodoro`

## Config schema

```yaml
type: pomodoro:pomodoro
config:
  durationSec: 1500 # optional; default 1500 (25 min)
```

## State machine

```
idle ──tap──▶ running ──tap──▶ idle
                       (stopped, no notify)
finished ──tap──▶ running     (resets and starts fresh)
```

On `running → finished` the addon fires `coreMethods.notify({title:"Pomodoro", body:"Time's up!", sound:true})`. The blink CSS animation runs for exactly 10 s after the transition (`@keyframes pomodoro-blink 1s 10`); the `finished` state itself is sticky and stays visible (red text, no animation) until the next tap.

## Persistence

`startTsMs` and `durationSec` are stored per-button in the addon store via `store.buttonScope("pomodoro", buttonId)`. On daemon restart, a running timer whose deadline has already passed is marked `finished` immediately (no delayed wake-up). A running timer whose deadline is still in the future resumes from its original `startTsMs`.

## Demo deck

See `demos/demo-pomodoro.yml` — three buttons at 25 min, 5 min, and the default 25 min.

## Sound

The bundled `assets/pomodoro-complete.ogg` plays alongside the OS notification. Providers:

- **Linux:** `ffplay` then `paplay` fallback. Skipped silently if neither is on PATH.
- **macOS:** `afplay`.
- **Windows:** `System.Media.SoundPlayer`.

Sound is best-effort; the toast/notification fires regardless.
