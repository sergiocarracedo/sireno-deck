# Sireno Deck

TypeScript CLI for programmable Stream Deck layouts, themes, and addons.

## Development Refresh

`pnpm run cli:dev` is the full-process restart seam for raw source edits. With no extra args it runs the workspace-root `tsx watch` loop over the CLI source tree plus config, themes, addons, and built-in addons so changes re-enter the real `start --config config.yml` process from the top.

The same seam also forwards explicit CLI args truthfully. For example, `pnpm run cli:dev emulate --port 8912` keeps the same watch graph but restarts the real emulator command instead of the default start path.

`sireno start --config ...` also has an in-process config-owned reload seam, but that path is narrower on purpose: it reloads the resolved config/deck/theme graph the daemon already owns without pretending to hot-reload arbitrary source modules.

The seams are intentionally different. Raw addon/theme/React source edits stay on `cli:dev`, while config-owned edits can use the daemon's in-process config-owned reload seam.

## Addon Authoring

Sireno addon UI is component-first TSX authoring on the mounted `render(props)` seam.

Import the public kit from `sireno-deck-cli` and return normal React elements from `defineMountedButton(...)`.

```tsx
import {
  ButtonSurface,
  Chip,
  Icon,
  Text,
  defineMountedButton,
} from 'sireno-deck-cli'

export const clockButton = defineMountedButton({
  configSchema: {
    parse: (value) => value,
    safeParse: (value) => ({ data: value, success: true as const }),
  },
  render: ({ config }) => (
    <ButtonSurface>
      <div className="flex h-full w-full flex-col items-center justify-center gap-1">
        <Chip tone="accent">component-first</Chip>
        <Icon name="clock" tone="primary" />
        <Text fit="wrap">
          {String((config as { label?: unknown }).label ?? 'Clock')}
        </Text>
      </div>
    </ButtonSurface>
  ),
  type: 'clock-button',
})
```

Use `Text` for the canonical text-fit behavior (`wrap`, `ellipsis`, `shrink`), `Icon` for generic/brand/asset icons, and `Chip` for compact status chrome. Themes may restyle those primitives, but the behavior contract stays in core.

See `packages/cli/fixtures/phase-9/jsx-addon-authoring-example.tsx` for a focused public-surface example, and `packages/cli/fixtures/phase-23/local-raw-addon/` for the executable raw-source component-first addon proof.

## Configuration

### Deck Icon

Each deck can optionally declare an `icon` field. The icon path determines which visual is shown for the deck:

- `icon://<name>` — **Lucide icon name** (static glyph, e.g. `icon://app-window`, `icon://settings`). These are built-in vector icons that ship with the CLI.
- `./<path>` — **Relative path** to an image file (e.g. `./chrome.svg`). Resolved relative to the config file's directory.
- `addon://<name>` — **Addon-provided icon** (e.g. `addon://system-status/cpu`). Refer to the addon's documentation for available icon names.
- `brand://<name>` — **Simple Icons brand icon** (e.g. `brand://github`, `brand://slack`).

The `icon://` prefix selects a prebuilt Lucide glyph — it is **not** a custom logo upload. For custom images, use `./`, `addon://`, or `brand://` instead.

**Fallback chain:** When a deck has no `icon` field, the system resolves the display icon in this order:
1. First emoji character in the deck name (e.g. `🎮 Games` → gamepad emoji)
2. First uppercase letter of the deck name (e.g. `Plain Deck` → `P`)
3. `layout-grid` placeholder icon

**System back button icon:** When an overlay deck is pending, the n-1 reserved back position renders as a `SplitActionSurface`. Its secondary slot shows the **overlay deck's** icon (not the base deck's icon), following the same resolution rules above.

### System Back Button (2-line variant)

The system back button at position n-1 can render as a 2-line `SplitActionSurface` when all of these conditions are met:

1. An overlay deck is configured with `process_names` matching the currently active application(s).
2. The overlay deck has `autoShow: false` (it is not shown automatically when its process is detected).
3. The base deck has enough keys for the reserved position (n-1).

When active, the 2-line variant shows:
- **Line 1** — back icon + "Tap" label (single-tap navigates back)
- **Line 2** — overlay deck icon + "2xTap" label (double-tap summons the overlay)

If no overlay deck matches the active application or `autoShow` is `true`, the back button renders as the standard single-line back button.

**Minimal config example:**

```yaml
decks:
  main:
    buttons: []
    icon: "icon://terminal"
  terminal-overlay:
    process_names: ["gnome-terminal", "kitty", "alacritty"]
    autoShow: false
    icon: "icon://terminal"
    buttons: []
```
