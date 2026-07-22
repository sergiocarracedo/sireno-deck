# Debugging overlays

When `chrome-overlay` (or any other addon overlay deck) doesn't appear on `n-1`,
walk this list top to bottom. Each log line is the signal that the matching
layer is healthy. If a layer is silent where it shouldn't be, that's the bug.

Set `logging.level: debug` in `config.yml`, restart, and `grep` the log:

| grep                          | means                                                   | if missing                                       |
| ----------------------------- | ------------------------------------------------------- | ------------------------------------------------ |
| `addon loaded`                | the loader wired the addon's manifest into the registry | loader bug — see "loader" below                  |
| `addon load error`            | loader rejected this addon (listed why)                 | read the message; usually `sirenodeck.json` shape |
| `addon failed to register`    | registry refused the manifest after loader accepted it  | registry collision (duplicate deck id)           |
| `active-app: snapshot`        | the active-app provider is polling the focused window   | provider bug — see "provider" below              |
| `detected GNOME Wayland`      | Wayland provider branch was chosen                      | wrong platform — provider built the wrong flavor  |
| `gnome-extension-missing`     | GNOME Wayland provider needs `window-calls-extended`   | install the extension                            |
| `runtime:overlay-available`   | a deck matched the focused window                       | matcher bug — see "matcher" below                |

## Loader

If `addon loaded` is missing for chrome-overlay but the addon path exists:

1. Confirm `sirenodeck.json` has `kind: addon`, `apiVersion: 1`, `name`, `entry: "./index.js"`.
2. Confirm `entry` (e.g. `index.js`) exports the manifest. Two accepted shapes:
   - `module.exports = { apiVersion: 1, name: 'x', buttonTypes, decks }` (direct)
   - `module.exports = { manifest: { apiVersion: 1, name: 'x', ... } }` (wrapped)
3. The entry must declare at least one of `buttonTypes` or `decks` — the loader
   rejects addons with neither.

## Provider

If `active-app: snapshot` is missing, the active-app loop never started. Check:

- `XDG_SESSION_TYPE` matches the platform you expect (`x11`, `wayland`).
- For GNOME Wayland: install `window-calls-extended` (GNOME Shell extension)
  and log out / in to enable it. Without it the provider probes fail and the
  loop silently returns `null` every tick.

If `snapshot` lines are present but `name` doesn't match the addon's
`trigger.process_name` patterns, the matcher won't fire. Use `xdotool` /
`xprop` / `wmctrl` to inspect the focused window's WM_CLASS and compare
against the patterns in the addon's manifest.

## Matcher

If `addon loaded` and `active-app: snapshot` are both present but
`runtime:overlay-available` is missing:

- The snapshot's `name` doesn't match any `trigger.process_name` pattern.
  Patterns are case-insensitive substrings (compiled to `/<pat>/i`), so
  `process_name: ['chrome']` matches `Google Chrome` but not `firefox`.
- The overlay's `autoShow` is `false`. Addons opt in to automatic show by
  setting `autoShow: true` on the deck entry.