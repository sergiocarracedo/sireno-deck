import { dirname } from "node:path"

import type { DeckConfigMessage } from "@/api/protocol-internal"
import type { RuntimeDeck } from "@/deck"
import { resolveDeckVariant } from "@/deck/variant-migration"
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
  // ponytail: external addons (loaded from config's addons: list) need their
  // dirs registered so `addon://<name>/assets/icon.png` resolves. The basenames
  // match the addon names in deck triggers.
  extraAddonDirs?: ReadonlyMap<string, string>,
): ResolveIconPathOptions => {
  const addonDirs = new Map<string, string>()
  for (const ref of addonByType.values()) {
    if (ref.frontendEntry !== null) {
      addonDirs.set(ref.name, dirname(ref.frontendEntry))
    }
  }
  for (const [name, dir] of extraAddonDirs ?? []) {
    addonDirs.set(name, dir)
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
  if ("icon" in next)
    next.icon = resolveOne(next.icon, resolverOptions, assetLookup)
  if (Array.isArray(next.lines)) {
    next.lines = (next.lines as ReadonlyArray<unknown>).map((line) => {
      if (typeof line !== "object" || line === null) return line
      const lineObj = line as Record<string, unknown>
      if (!("icon" in lineObj)) return line
      return {
        ...lineObj,
        icon: resolveOne(lineObj.icon, resolverOptions, assetLookup),
      }
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
      // ponytail: fallback to config.label so addon-deck buttons (e.g.
      // chrome-overlay's {label: 'New Tab'}) render their label when no
      // command is set. The legacy config-command path stays primary.
      const label = config["label"]
      if (typeof label === "string" && label.length > 0) {
        return label
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
  overlayDeckIcon: string | null = null,
  overlayDeckName: string | null = null,
): DeckConfigMessage => {
  void keyCount
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
      ...(b.full === true ? { full: true } : {}),
      ...(b.variant !== undefined && b.variant.length > 0
        ? { variant: b.variant }
        : {}),
    }
  })
  const resolvedOverlayIcon =
    overlayDeckIcon === null
      ? null
      : (resolveOne(overlayDeckIcon, resolverOptions, assetLookup) as
          | string
          | null)
  return {
    type: "deck-config",
    deckId: deck.id,
    surfaces: {
      [deck.id]: {
        id: deck.id,
        name: deck.name ?? deck.id,
        buttons,
        ...(deck.buttonColor !== undefined
          ? { buttonColor: deck.buttonColor }
          : {}),
        ...(resolveDeckVariant(
          { variant: deck.variant, buttonColor: deck.buttonColor },
          deck.id,
        ) !== undefined
          ? {
              variant: resolveDeckVariant(
                { variant: deck.variant, buttonColor: deck.buttonColor },
                deck.id,
              ),
            }
          : {}),
        ...(deck.buttonErrors !== undefined && deck.buttonErrors.length > 0
          ? {
              buttonErrors: deck.buttonErrors.map((e) => ({
                position: e.position,
                expiresAt: Number.MAX_SAFE_INTEGER,
                ...(e.buttonId !== undefined ? { buttonId: e.buttonId } : {}),
                details: e.details,
              })),
            }
          : {}),
      },
    },
    navMode: "regular",
    isCompact: isCompact ?? false,
    hasOverlayDeckAvailable: navState?.hasOverlayDeckAvailable ?? false,
    overlayDeckIcon: resolvedOverlayIcon,
    overlayDeckName,
  }
}
