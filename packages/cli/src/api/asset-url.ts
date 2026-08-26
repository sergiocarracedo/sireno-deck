/**
 * Browser-safe `addon://` asset URL rewriting.
 *
 * Deck/icon data flowing over the WS bridge references addon assets as
 * `addon://<name>/<subPath>`. The daemon embeds those files into the
 * `assets` WS message for device rendering, but SPA `<img src>` needs a
 * fetchable URL. The sirenoDeck2 vite plugin serves them at
 * `/@sireno/addon-asset/<name>/<subPath>` during dev; this helper
 * rewrites known-scheme strings and passes everything else through.
 */

export const ADDON_ASSET_URL_PREFIX = "/@sireno/addon-asset/"

// ponytail: single scheme today; extend here if more browser-invisible
// schemes appear (e.g. builtin:// when a core surface wants its own SVG).
export const resolveAddonAssetSrc = (src: string): string => {
  if (!src.startsWith("addon://")) return src
  const rest = src.slice("addon://".length)
  const slash = rest.indexOf("/")
  if (slash <= 0 || slash >= rest.length - 1) return src
  const name = rest.slice(0, slash)
  const subPath = rest.slice(slash + 1)
  return `${ADDON_ASSET_URL_PREFIX}${name}/${subPath}`
}
