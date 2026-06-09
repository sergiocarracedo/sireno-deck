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
