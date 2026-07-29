// ponytail: pagination is handled by the `core:page-nav` addon button
// (tap=next, hold=prev) in builtin-addons/core/buttons/page-nav/, not by a
// system button. Keeping the system-button surface small and deliberate.
export const SYSTEM_BUTTON_TYPES = [
  "core:back",
  "core:settings-entry",
  "core:overlay-toggle",
  "core:temporary-error",
] as const

export type SystemButtonType = (typeof SYSTEM_BUTTON_TYPES)[number]

export const isSystemButtonType = (value: string): value is SystemButtonType =>
  (SYSTEM_BUTTON_TYPES as ReadonlyArray<string>).includes(value)
