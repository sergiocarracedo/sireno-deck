import { dirname } from "node:path"

import type { DeckConfigMessage } from "@/api/protocol-internal"
import { computeSystemButtonForSlotN1, type RuntimeDeck } from "@/deck"
import {
  resolveIconSource,
  type ResolveIconPathOptions,
} from "@/render/icon-source-resolver"

export interface AddonFrontendRef {
  readonly name: string
  readonly frontendEntry: string | null
}

export const buildResolverOptions = (
  addonByType: ReadonlyMap<string, AddonFrontendRef>,
  baseDirs: ReadonlyArray<string>,
): ResolveIconPathOptions => {
  const addonDirs = new Map<string, string>()
  for (const ref of addonByType.values()) {
    if (ref.frontendEntry !== null) {
      addonDirs.set(ref.name, dirname(ref.frontendEntry))
    }
  }
  return { addonDirs, baseDirs }
}

export type AssetLookup = (fullPath: string) => string | undefined

const resolveOne = (
  icon: unknown,
  resolverOptions: ResolveIconPathOptions,
  assetLookup: AssetLookup,
): unknown => {
  if (typeof icon !== "string") return icon
  if (icon.startsWith("icon://")) return icon
  if (icon.startsWith("asset://")) return icon
  let resolved
  try {
    resolved = resolveIconSource(icon, resolverOptions)
  } catch {
    return icon
  }
  if (resolved.kind !== "asset") return icon
  const id = assetLookup(resolved.fullPath)
  if (id === undefined) return icon
  return `asset://${id}`
}

export const resolveConfigIcons = (
  cfg: Record<string, unknown>,
  resolverOptions: ResolveIconPathOptions,
  assetLookup: AssetLookup,
): Record<string, unknown> => {
  const next = { ...cfg }
  if ("icon" in next) next.icon = resolveOne(next.icon, resolverOptions, assetLookup)
  if (Array.isArray(next.lines)) {
    next.lines = (next.lines as ReadonlyArray<unknown>).map((line) => {
      if (typeof line !== "object" || line === null) return line
      const lineObj = line as Record<string, unknown>
      if (!("icon" in lineObj)) return line
      return { ...lineObj, icon: resolveOne(lineObj.icon, resolverOptions, assetLookup) }
    })
  }
  return next
}

const deriveLabel = (
  type: string,
  config: Record<string, unknown>,
): string | undefined => {
  switch (type) {
    case "core:action": {
      const cmd = config["command"]
      if (typeof cmd === "string" && cmd.length > 0) {
        return cmd.length > 14 ? `${cmd.slice(0, 13)}…` : cmd
      }
      return undefined
    }
    case "core:change-deck": {
      const deck = config["deck"]
      if (typeof deck === "string" && deck.length > 0) {
        return `→ ${deck}`
      }
      return undefined
    }
    default:
      return undefined
  }
}

export const buildDeckConfigMessage = (
  deck: RuntimeDeck,
  addonByType: Map<string, AddonFrontendRef>,
  resolverOptions: ResolveIconPathOptions = {},
  navState?: { navStackDepth: number; hasOverlayDeckAvailable: boolean },
  keyCount?: number,
  isCompact?: boolean,
  assetLookup: AssetLookup = () => undefined,
): DeckConfigMessage => {
  const effectiveKeyCount = keyCount ?? 15
  const n1Position = effectiveKeyCount - 1
  const buttons = deck.buttons.map((b) => {
    const position = Number.parseInt(b.id, 10)
    const addon = addonByType.get(b.type)
    const cfg = (b.config ?? {}) as Record<string, unknown>
    const label = deriveLabel(b.type, cfg)
    const resolvedConfig = resolveConfigIcons(cfg, resolverOptions, assetLookup)
    return {
      id: b.id,
      type: b.type,
      config: resolvedConfig,
      ...(Number.isFinite(position) ? { position } : {}),
      ...(label !== undefined ? { label } : {}),
      ...(addon !== undefined ? { addonName: addon.name } : {}),
      ...(addon?.frontendEntry !== undefined && addon.frontendEntry !== null
        ? { frontendEntry: addon.frontendEntry }
        : {}),
    }
  })
  const systemButtonType = computeSystemButtonForSlotN1(
    deck,
    navState ?? { navStackDepth: 1, hasOverlayDeckAvailable: false },
  )
  if (systemButtonType !== null) {
    for (let i = buttons.length - 1; i >= 0; i--) {
      const b = buttons[i]!
      if (Number.parseInt(b.id, 10) === n1Position || b.position === n1Position) {
        buttons.splice(i, 1)
      }
    }
    buttons.push({
      id: String(n1Position),
      type: systemButtonType,
      config: {},
    })
  }
  return {
    type: "deck-config",
    deckId: deck.id,
    surfaces: {
      [deck.id]: {
        id: deck.id,
        name: deck.name ?? deck.id,
        buttons,
      },
    },
    navMode: "regular",
    isCompact: isCompact ?? false,
    hasOverlayDeckAvailable: navState?.hasOverlayDeckAvailable ?? false,
  }
}