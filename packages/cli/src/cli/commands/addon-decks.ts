import type { AddonRegistry } from "@/addon/registry"
import { paginateDeck } from "@/deck/paginate-deck"
import type { RuntimeDeck } from "@/deck/runtime"
import type pino from "pino"

interface AddonGeneratedDeck {
  name?: string
  icon?: string
  background?: string
  buttons?: unknown[]
  paginated?: boolean
  trigger?: unknown
  autoShow?: boolean
  isOverlay?: boolean
}

const resolveTriggerProcessNames = (trigger: unknown): string[] | undefined => {
  if (typeof trigger !== "object" || trigger === null) return undefined
  const t = trigger as Record<string, unknown>
  const pn = t["process_name"]
  if (pn === undefined) return undefined
  if (typeof pn === "string") return [pn]
  if (Array.isArray(pn) && pn.length > 0 && typeof pn[0] === "string") {
    return pn as string[]
  }
  return undefined
}

const isActionMap = (
  v: unknown,
): v is { tap?: string; dbltap?: string; hold?: string } => {
  if (typeof v !== "object" || v === null) return false
  const a = v as Record<string, unknown>
  for (const k of ["tap", "dbltap", "hold"] as const) {
    if (a[k] !== undefined && typeof a[k] !== "string") return false
  }
  return true
}

const mapAddonDeckToRuntimeDeck = (
  registry: AddonRegistry,
  id: string,
  gdeck: AddonGeneratedDeck,
  keyCount: number,
): RuntimeDeck[] => {
  if (gdeck.paginated === true && (gdeck.buttons ?? []).length > 0) {
    const pages = paginateDeck({
      baseDeckId: id,
      buttons: gdeck.buttons ?? [],
      keyCount,
    })
    return pages.map((p) => {
      const mappedButtons: RuntimeDeck["buttons"] = (p.deck.buttons ?? []).map(
        (b, i) => {
          const { position, type, config, actions, ...rest } = b as {
            position?: number
            type: string
            config?: unknown
            actions?: unknown
          }
          const mergedConfig = {
            ...(typeof config === "object" && config !== null
              ? (config as Record<string, unknown>)
              : {}),
            ...rest,
          }
          const full = registry.getButtonType(type)?.def.service.full === true
          return {
            id: position !== undefined ? String(position) : String(i),
            type,
            ...(Object.keys(mergedConfig).length > 0
              ? { config: mergedConfig }
              : {}),
            ...(isActionMap(actions) ? { actions } : {}),
            ...(full ? { full: true } : {}),
          }
        },
      )
      return {
        id: p.deckId,
        name: gdeck.name ?? id,
        buttons: mappedButtons,
        ...(gdeck.autoShow !== undefined ? { autoShow: gdeck.autoShow } : {}),
        ...(gdeck.isOverlay !== undefined
          ? { isOverlay: gdeck.isOverlay }
          : {}),
        processNames: resolveTriggerProcessNames(gdeck.trigger),
      }
    })
  }

  const buttons: RuntimeDeck["buttons"] = (gdeck.buttons ?? []).map((b, i) => {
    const { position, type, config, actions, ...rest } = b as {
      position?: number
      type: string
      config?: unknown
      actions?: unknown
    }
    const mergedConfig = {
      ...(typeof config === "object" && config !== null
        ? (config as Record<string, unknown>)
        : {}),
      ...rest,
    }
    const full = registry.getButtonType(type)?.def.service.full === true
    return {
      id: position !== undefined ? String(position) : String(i),
      type,
      ...(Object.keys(mergedConfig).length > 0 ? { config: mergedConfig } : {}),
      ...(isActionMap(actions) ? { actions } : {}),
      ...(full ? { full: true } : {}),
    }
  })
  return [
    {
      id,
      name: gdeck.name ?? id,
      buttons,
      ...(gdeck.autoShow !== undefined ? { autoShow: gdeck.autoShow } : {}),
      ...(gdeck.isOverlay !== undefined ? { isOverlay: gdeck.isOverlay } : {}),
      processNames: resolveTriggerProcessNames(gdeck.trigger),
    },
  ]
}

const collectAddonDefaultButtonConfig = (
  registry: AddonRegistry,
  userDecks: ReadonlyArray<RuntimeDeck>,
  logger: pino.Logger,
): Map<string, unknown> => {
  const result = new Map<string, unknown>()
  for (const addon of registry.listAddons()) {
    if (addon.defaultButton === undefined) continue
    let matchCount = 0
    for (const deck of userDecks) {
      for (const btn of deck.buttons) {
        if (btn.type === addon.defaultButton || btn.type === addon.name) {
          if (matchCount > 0) {
            logger.warn(
              {
                addon: addon.name,
                defaultButton: addon.defaultButton,
                deckId: deck.id,
              },
              "collectAddonDefaultButtonConfig: multiple launcher buttons found, using first",
            )
          }
          if (matchCount === 0) {
            result.set(addon.name, btn.config ?? {})
          }
          matchCount++
        }
      }
    }
  }
  return result
}

export const materializeAddonDecks = (
  registry: AddonRegistry,
  userDecks: ReadonlyArray<RuntimeDeck>,
  logger: pino.Logger,
  keyCount: number,
): RuntimeDeck[] => {
  const addonConfigs = collectAddonDefaultButtonConfig(
    registry,
    userDecks,
    logger,
  )
  const userDeckIds = new Set(userDecks.map((d) => d.id))
  const addonDecks: RuntimeDeck[] = []

  for (const addon of registry.listAddons()) {
    if (addon.decks === undefined) continue
    for (const deckName of Object.keys(addon.decks)) {
      const deckType = registry.getDeckType(deckName)
      if (deckType === undefined) continue
      const addonConfig = addonConfigs.get(addon.name) ?? {}
      let generated: Record<string, AddonGeneratedDeck>
      try {
        generated = deckType.def.createDecks({
          config: addonConfig,
          deck: { id: deckName },
        })
      } catch (err) {
        logger.warn(
          { addon: addon.name, deckName, err },
          "materializeAddonDecks: createDecks threw",
        )
        continue
      }
      for (const [id, gdeck] of Object.entries(generated)) {
        if (userDeckIds.has(id)) {
          logger.warn(
            { addon: addon.name, deckId: id },
            "materializeAddonDecks: addon deck id collides with user deck, skipping",
          )
          continue
        }
        addonDecks.push(...mapAddonDeckToRuntimeDeck(registry, id, gdeck, keyCount))
      }
    }
  }

  return [...userDecks, ...addonDecks]
}
