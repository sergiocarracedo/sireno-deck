/**
 * Maps a legacy `buttonColor` enum value (`blue | green | purple`) onto
 * the new `variant` token names declared in theme manifests. Emits a
 * one-shot console.warn per (addonName, color) so addon authors see the
 * deprecation but the runtime doesn't spam the console during normal
 * deck rendering.
 */
const warnedButtonColors = new Set<string>()

export const BUTTON_COLOR_TO_VARIANT: Readonly<
  Record<"blue" | "green" | "purple", "highlighted" | "success" | "highlighted">
> = {
  blue: "highlighted",
  green: "success",
  purple: "highlighted",
}

export const resolveVariantFromButtonColor = (
  buttonColor: "blue" | "green" | "purple" | undefined,
  addonName: string | undefined,
): "highlighted" | "success" | undefined => {
  if (buttonColor === undefined) return undefined
  const key = `${addonName ?? "<unknown>"}:${buttonColor}`
  if (!warnedButtonColors.has(key)) {
    warnedButtonColors.add(key)
    console.warn(
      `[sireno-deck] addon "${addonName ?? "<unknown>"}" uses deprecated buttonColor: "${buttonColor}". Map it to variant: "${BUTTON_COLOR_TO_VARIANT[buttonColor]}".`,
    )
  }
  return BUTTON_COLOR_TO_VARIANT[buttonColor]
}

/**
 * Resolve the effective variant for an addon-generated deck:
 * prefer the new `variant` field; fall back to the mapped legacy
 * `buttonColor`; otherwise leave undefined (caller uses "default").
 */
export const resolveDeckVariant = (
  source: { variant?: string; buttonColor?: "blue" | "green" | "purple" },
  addonName: string | undefined,
): string | undefined => {
  if (source.variant !== undefined && source.variant.length > 0) {
    return source.variant
  }
  return resolveVariantFromButtonColor(source.buttonColor, addonName)
}
