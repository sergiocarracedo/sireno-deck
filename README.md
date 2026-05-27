# Sireno Deck

TypeScript CLI for programmable Stream Deck layouts, themes, and addons.

## Addon Authoring

Sireno addon UI is component-first TSX authoring on the mounted `render(props)` seam.

Import the public kit from `sireno-deck-cli` and return normal React elements from `defineMountedButton(...)`.

```tsx
import { ButtonSurface, Chip, Icon, Text, defineMountedButton } from "sireno-deck-cli"

export const clockButton = defineMountedButton({
  configSchema: {
    parse: (value) => value,
    safeParse: (value) => ({ data: value, success: true as const }),
  },
  render: ({ config }) => (
    <ButtonSurface>
      <div className="flex h-full w-full flex-col items-center justify-center gap-1">
        <Chip tone="accent">component-first</Chip>
        <Icon icon="clock" tone="primary" />
        <Text fit="wrap">{String((config as { label?: unknown }).label ?? "Clock")}</Text>
      </div>
    </ButtonSurface>
  ),
  type: "clock-button",
})
```

Use `Text` for the canonical text-fit behavior (`wrap`, `ellipsis`, `shrink`, `marquee`), `Icon` for generic/brand/asset icons, and `Chip` for compact status chrome. Themes may restyle those primitives, but the behavior contract stays in core.

See `packages/cli/fixtures/phase-9/jsx-addon-authoring-example.tsx` for a focused public-surface example, and `packages/cli/fixtures/phase-23/local-raw-addon/` for the executable raw-source component-first addon proof.
