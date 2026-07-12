export const EMOJI_RE = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)$/u

export const ICON_FALLBACK = "icon://alert-circle"

/**
 * Validate that a runtime icon source is one of:
 *   - `icon://<name>` — Lucide icon by name
 *   - `asset://<id>` — pre-resolved asset id from the registry
 *   - a single emoji (Presentation, or base+VS16 like ✈️)
 *
 * Anything else (multi-char strings, "%", "./foo.svg", empty) is invalid
 * and renders the fallback icon at runtime.
 */
export const isIconSource = (s: unknown): s is string => {
  if (typeof s !== "string" || s.length === 0) return false
  if (s.startsWith("icon://") && s.length > "icon://".length) return true
  if (s.startsWith("asset://") && s.length > "asset://".length) return true
  return EMOJI_RE.test(s)
}