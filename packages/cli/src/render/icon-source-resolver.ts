import { isAbsolute, join } from "node:path"

import { EMOJI_RE } from "../core/icon-source"
import type { ResolveIconPathOptions } from "./icon-resolver"

export type ResolvedIconSource =
  | { kind: "generic"; name: string }
  | { kind: "asset"; fullPath: string }
  | { kind: "emoji"; emoji: string }

export const resolveIconSource = (
  source: string,
  options: ResolveIconPathOptions = {},
): ResolvedIconSource => {
  if (EMOJI_RE.test(source)) {
    // Emojis don't need any path resolution — the frontend renders them
    // directly as a span. Returning a "generic" kind would be misleading
    // (no icon name), so we have a dedicated "emoji" kind that callers
    // can recognize and skip path/asset bookkeeping.
    return { kind: "emoji", emoji: source }
  }
  if (source.startsWith("icon://")) {
    return { kind: "generic", name: source.slice("icon://".length) }
  }
  if (source.startsWith("addon://")) {
    const match = /^addon:\/\/([^/]+)\/(.*)$/.exec(source)
    if (match) {
      const [, addonName, assetPath] = match
      const addonDir = options.addonDirs?.get(addonName)
      if (addonDir) {
        return { kind: "asset", fullPath: join(addonDir, assetPath) }
      }
    }
    throw new Error(
      `Cannot resolve addon icon "${source}": unknown addon dir`,
    )
  }
  if (source.startsWith("builtin://")) {
    const assetPath = source.slice("builtin://".length)
    const builtinDir = options.addonDirs?.get("builtin")
    if (builtinDir) {
      return { kind: "asset", fullPath: join(builtinDir, assetPath) }
    }
    throw new Error(
      `Cannot resolve builtin icon "${source}": builtin dir not registered`,
    )
  }
  if (
    source.startsWith("data:") ||
    source.startsWith("http://") ||
    source.startsWith("https://") ||
    source.startsWith("file://")
  ) {
    throw new Error(
      `Inline icon "${source.slice(0, 32)}…" must be pre-resolved to asset:// before reaching the Icon component`,
    )
  }
  if (isAbsolute(source)) {
    return { kind: "asset", fullPath: source }
  }
  for (const baseDir of options.baseDirs ?? []) {
    return { kind: "asset", fullPath: join(baseDir, source) }
  }
  throw new Error(
    `Cannot resolve icon "${source}": no base dirs configured`,
  )
}