import { isAbsolute } from "node:path"

export const EMOJI_RE = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)$/u

export const ICON_FALLBACK = "icon://alert-circle"

/**
 * Validate that a runtime icon source is one of:
 *   - `icon://<name>`   — Lucide icon by name (resolved by the runtime
 *                         `resolveIconSource`)
 *   - `asset://<id>`    — pre-resolved asset id from the registry
 *   - `addon://<a>/<p>` — asset inside an addon's frontendEntry dir
 *   - `builtin://<p>`   — asset inside the builtin addon's dir
 *   - absolute path     — asset resolved directly
 *   - relative path     — asset resolved against the config's baseDirs
 *                         (e.g. `./assets/chrome.svg`, `../shared/icon.svg`,
 *                         `~/Pictures/x.png`)
 *   - a single emoji (Presentation, or base+VS16 like ✈️)
 *
 * Rejected: empty string, "%", "abc", multi-char (e.g. "abc🔥"),
 * inline URLs (data:, http://, https://, file://) — these must be
 * pre-resolved to asset:// before reaching the runtime.
 *
 * Anything rejected here triggers a runtime fallback (alert-circle
 * Lucide icon) AND, at config-load, a zod validation error.
 */
export const isIconSource = (s: unknown): s is string => {
  if (typeof s !== "string" || s.length === 0) return false
  if (EMOJI_RE.test(s)) return true
  if (s.startsWith("icon://") && s.length > "icon://".length) return true
  if (s.startsWith("asset://") && s.length > "asset://".length) return true
  if (s.startsWith("addon://")) {
    // addon://<addonName>/<subPath> — must have both segments
    const rest = s.slice("addon://".length)
    const slash = rest.indexOf("/")
    if (slash > 0 && slash < rest.length - 1) return true
    return false
  }
  if (s.startsWith("builtin://") && s.length > "builtin://".length) return true
  // Inline URLs are explicitly rejected by the runtime resolver.
  if (
    s.startsWith("data:") ||
    s.startsWith("http://") ||
    s.startsWith("https://") ||
    s.startsWith("file://")
  ) {
    return false
  }
  // Absolute path.
  if (isAbsolute(s)) return true
  // Reject anything that looks like a scheme-prefixed URL the runtime
  // doesn't understand (e.g. "abc://x"). The runtime would treat it as a
  // path and produce a garbage absolute path. Recognized schemes
  // (icon://, asset://, addon://, builtin://) are handled above.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) return false
  // Relative paths: must contain a path separator OR start with one of
  // the recognized path prefixes ("./", "../", "~/", "~\\"). Single-char
  // paths like "." are also valid.
  if (
    s === "." ||
    s === "~" ||
    s.startsWith("./") ||
    s.startsWith("../") ||
    s.startsWith("~/") ||
    s.startsWith("~\\") ||
    /[\\/]/.test(s) ||
    s.startsWith("/")
  ) {
    return true
  }
  return false
}