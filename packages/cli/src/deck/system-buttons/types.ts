export const SYSTEM_BUTTON_TYPES = [
  "core:back",
  "core:settings-entry",
  "core:overlay-toggle",
  "core:next-page",
  "core:temporary-error",
] as const

export type SystemButtonType = (typeof SYSTEM_BUTTON_TYPES)[number]

export const isSystemButtonType = (value: string): value is SystemButtonType =>
  (SYSTEM_BUTTON_TYPES as ReadonlyArray<string>).includes(value)
