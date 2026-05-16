import type {} from "sireno-deck-cli/jsx"

import {
  createDeckButtonElement,
  createDeckSurfaceElement,
  createDeckTextElement,
} from "../../src/render/reconciler.js"

export const jsxAddonButton = <deck-button keyIndex={0} label="Clock" subtitle="Local" variant="metric" />

export const helperAddonButton = createDeckButtonElement({
  keyIndex: 0,
  label: "Clock",
  subtitle: "Local",
  variant: "metric",
})

export const jsxAddonSurface = (
  <deck-surface
    buttons={[
      { keyIndex: 0, label: "Clock", subtitle: "Local", variant: "metric" },
      { keyIndex: 1, label: "Date", subtitle: "Today" },
    ]}
  />
)

export const helperAddonSurface = createDeckSurfaceElement({
  buttons: [
    { keyIndex: 0, label: "Clock", subtitle: "Local", variant: "metric" },
    { keyIndex: 1, label: "Date", subtitle: "Today" },
  ],
})

export const jsxAddonText = <deck-text keyIndex={2} text="10:48" />

export const helperAddonText = createDeckTextElement({ keyIndex: 2, text: "10:48" })
