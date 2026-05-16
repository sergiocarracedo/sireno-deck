# Sireno Deck

TypeScript CLI for programmable Stream Deck layouts, themes, and addons.

## Addon Authoring

### Custom Render Elements Are Not The DOM

`deck-button`, `deck-text`, and `deck-surface` are Sireno render elements, not the DOM. They describe what should be painted onto a Stream Deck key through the custom reconciler and SVG renderer, so they do not support browser layout, event handlers, or ambient HTML semantics.

To opt into JSX authoring explicitly, import `sireno-deck-cli/jsx` in addon code before using those custom elements:

```tsx
import type {} from "sireno-deck-cli/jsx"
import {
  createDeckButtonElement,
  createDeckSurfaceElement,
  createDeckTextElement,
} from "sireno-deck-cli"

export const clockButton = <deck-button keyIndex={0} label="Clock" subtitle="Local" variant="metric" />

export const overviewSurface = (
  <deck-surface
    buttons={[
      { keyIndex: 0, label: "Clock", subtitle: "Local", variant: "metric" },
      { keyIndex: 1, label: "Date", subtitle: "Today" },
    ]}
  />
)

export const clockText = <deck-text keyIndex={2} text="10:48" />

export const helperClockButton = createDeckButtonElement({
  keyIndex: 0,
  label: "Clock",
  subtitle: "Local",
  variant: "metric",
})

export const helperOverviewSurface = createDeckSurfaceElement({
  buttons: [
    { keyIndex: 0, label: "Clock", subtitle: "Local", variant: "metric" },
    { keyIndex: 1, label: "Date", subtitle: "Today" },
  ],
})

export const helperClockText = createDeckTextElement({ keyIndex: 2, text: "10:48" })
```

If you do not want JSX, the helper-based alternative is still supported. The same render contract can be expressed with `createDeckButtonElement`, `createDeckSurfaceElement`, and `createDeckTextElement`, which produce the same non-DOM render descriptions without relying on JSX syntax.

See `packages/cli/fixtures/phase-9/jsx-addon-authoring-example.tsx` for a focused example that keeps the JSX opt-in and helper-based forms side by side.
