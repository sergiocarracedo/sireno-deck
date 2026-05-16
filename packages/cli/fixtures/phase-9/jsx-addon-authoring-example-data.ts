export const addonButtonProps = {
  keyIndex: 0,
  label: "Clock",
  subtitle: "Local",
  variant: "metric",
} as const

export const addonSurfaceButtons = [
  addonButtonProps,
  { keyIndex: 1, label: "Date", subtitle: "Today" },
] as const

export const addonTextProps = { keyIndex: 2, text: "10:48" } as const
