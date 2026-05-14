import "../../src/render/jsx.js"

export const digitalClockButton = <deck-button keyIndex={0} label="Clock" subtitle="Local" variant="metric" />

export const digitalClockSurface = (
  <deck-surface
    buttons={[
      { keyIndex: 0, label: "Clock", subtitle: "Local", variant: "metric" },
      { keyIndex: 1, label: "Date", subtitle: "Today", variant: "default" },
    ]}
  />
)

export const digitalClockText = <deck-text keyIndex={2} text="10:48" />
