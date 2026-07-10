import { readFileSync, statSync } from "node:fs"

import { makeAssetId } from "./asset-id"
import { inferMimeFromPath } from "./mime"
import { resolveIconSource } from "../render/icon-source-resolver"
import type { ResolveIconPathOptions } from "../render/icon-resolver"
import type { RuntimeButton } from "@/deck"
import type pino from "pino"

export const MAX_ASSET_SIZE = 200 * 1024

export interface Asset {
  readonly id: string
  readonly fullPath: string
  readonly mime: string
  readonly src: string
  readonly filesize: number
  readonly mtime: number
}

const assets = new Map<string, Asset>()

export const clearAssets = (): void => {
  assets.clear()
}

const readButtonIcon = (
  button: RuntimeButton,
): string | undefined => {
  const cfg = button.config
  if (typeof cfg !== "object" || cfg === null) return undefined
  const icon = (cfg as Record<string, unknown>).icon
  return typeof icon === "string" && icon !== "" ? icon : undefined
}

export const registerIconForDeck = (
  buttons: ReadonlyArray<RuntimeButton>,
  resolverOptions: ResolveIconPathOptions,
  logger?: pino.Logger,
): void => {
  for (const button of buttons) {
    const icon = readButtonIcon(button)
    if (icon === undefined) continue

    let resolved
    try {
      resolved = resolveIconSource(icon, resolverOptions)
    } catch (err) {
      logger?.warn(
        { icon, err: (err as Error).message },
        "skipping unresolvable icon",
      )
      continue
    }
    if (resolved.kind !== "asset") continue
    if (assets.has(resolved.fullPath)) continue

    let stats
    try {
      stats = statSync(resolved.fullPath)
    } catch (err) {
      logger?.warn(
        { fullPath: resolved.fullPath, err: (err as Error).message },
        "icon file missing or unreadable",
      )
      continue
    }
    const filesize = stats.size
    if (filesize > MAX_ASSET_SIZE) {
      logger?.warn(
        { fullPath: resolved.fullPath, filesize, limit: MAX_ASSET_SIZE },
        "icon exceeds MAX_ASSET_SIZE; skipping",
      )
      continue
    }
    let raw: Buffer
    try {
      raw = readFileSync(resolved.fullPath)
    } catch (err) {
      logger?.warn(
        { fullPath: resolved.fullPath, err: (err as Error).message },
        "icon read failed",
      )
      continue
    }
    const mime = inferMimeFromPath(resolved.fullPath)
    const id = makeAssetId(resolved.fullPath, filesize, stats.mtimeMs)
    assets.set(resolved.fullPath, {
      id,
      fullPath: resolved.fullPath,
      mime,
      src: `data:${mime};base64,${raw.toString("base64")}`,
      filesize,
      mtime: stats.mtimeMs,
    })
  }
}

export const getUnsentAssets = (
  sentIds: ReadonlySet<string>,
): ReadonlyArray<Asset> => {
  const out: Asset[] = []
  for (const asset of assets.values()) {
    if (!sentIds.has(asset.id)) out.push(asset)
  }
  return out
}

export const getAssetByPath = (fullPath: string): Asset | undefined =>
  assets.get(fullPath)