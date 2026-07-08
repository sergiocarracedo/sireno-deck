import type { AddonRegistry } from "@/addon/registry"
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

const mapAddonDeckToRuntimeDeck = (
  id: string,
  gdeck: AddonGeneratedDeck,
): RuntimeDeck => {
  const buttons: RuntimeDeck["buttons"] = (gdeck.buttons ?? []).map((b, i) => {
    const { position, type, config, ...rest } = b as {
      position?: number
      type: string
      config?: unknown
    }
    const mergedConfig = {
      ...(typeof config === "object" && config !== null
        ? (config as Record<string, unknown>)
        : {}),
      ...rest,
    }
    return {
      id: position !== undefined ? String(position) : String(i),
      type,
      ...(Object.keys(mergedConfig).length > 0 ? { config: mergedConfig } : {}),
    }
  })
  return {
    id,
    name: gdeck.name ?? id,
    buttons,
    ...(gdeck.autoShow !== undefined ? { autoShow: gdeck.autoShow } : {}),
    ...(gdeck.isOverlay !== undefined ? { isOverlay: gdeck.isOverlay } : {}),
    processNames: resolveTriggerProcessNames(gdeck.trigger),
  }
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
      if (deckType.def.internal) continue
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
        addonDecks.push(mapAddonDeckToRuntimeDeck(id, gdeck))
      }
    }
  }

  return [...userDecks, ...addonDecks]
}
