import type { AddonRegistry } from "@/addon/registry"
import { paginateDeck } from "@/deck/paginate-deck"
import { positionButtons } from "@/deck/position-buttons"
import type { RuntimeDeck } from "@/deck/runtime"
import { resolveDeckVariant } from "@/deck/variant-migration"
import type pino from "pino"

interface AddonGeneratedDeck {
  name?: string
  icon?: string
  background?: string
  variant?: string
  buttonColor?: "blue" | "green" | "purple"
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

const resolveTriggerWindowNames = (trigger: unknown): string[] | undefined => {
  if (typeof trigger !== "object" || trigger === null) return undefined
  const t = trigger as Record<string, unknown>
  const wn = t["window_name"]
  if (wn === undefined) return undefined
  if (typeof wn === "string") return [wn]
  if (Array.isArray(wn) && wn.length > 0 && typeof wn[0] === "string") {
    return wn as string[]
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
          const {
            position,
            type,
            config,
            actions,
            full: buttonFull,
            ...rest
          } = b as {
            position?: number
            type: string
            config?: unknown
            actions?: unknown
            full?: unknown
          }
          const mergedConfig = {
            ...(typeof config === "object" && config !== null
              ? (config as Record<string, unknown>)
              : {}),
            ...rest,
          }
          const full =
            registry.getButtonType(type)?.def.service.full === true ||
            buttonFull === true
          return {
            id: position !== undefined ? String(position) : String(i),
            type,
            ...(position !== undefined ? { position } : {}),
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
        ...(gdeck.icon !== undefined ? { icon: gdeck.icon } : {}),
        ...(gdeck.background !== undefined
          ? { background: gdeck.background }
          : {}),
        ...(gdeck.buttonColor !== undefined
          ? { buttonColor: gdeck.buttonColor }
          : {}),
        ...(resolveDeckVariant(gdeck, id) !== undefined
          ? { variant: resolveDeckVariant(gdeck, id) }
          : {}),
        ...(gdeck.autoShow !== undefined ? { autoShow: gdeck.autoShow } : {}),
        ...(gdeck.isOverlay !== undefined
          ? { isOverlay: gdeck.isOverlay }
          : {}),
        processNames: resolveTriggerProcessNames(gdeck.trigger),
        windowNames: resolveTriggerWindowNames(gdeck.trigger),
      }
    })
  }

  const buttons: RuntimeDeck["buttons"] = positionButtons(
    (gdeck.buttons ?? []) as Array<{ position?: number }>,
    keyCount,
  ).map((b, i) => {
    const {
      position,
      type,
      config,
      actions,
      full: buttonFull,
      ...rest
    } = b as {
      position?: number
      type: string
      config?: unknown
      actions?: unknown
      full?: unknown
    }
    const mergedConfig = {
      ...(typeof config === "object" && config !== null
        ? (config as Record<string, unknown>)
        : {}),
      ...rest,
    }
    const full =
      registry.getButtonType(type)?.def.service.full === true ||
      buttonFull === true
    return {
      id: position !== undefined ? String(position) : String(i),
      type,
      ...(position !== undefined ? { position } : {}),
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
      ...(gdeck.icon !== undefined ? { icon: gdeck.icon } : {}),
      ...(gdeck.background !== undefined
        ? { background: gdeck.background }
        : {}),
      ...(gdeck.buttonColor !== undefined
        ? { buttonColor: gdeck.buttonColor }
        : {}),
      ...(resolveDeckVariant(gdeck, id) !== undefined
        ? { variant: resolveDeckVariant(gdeck, id) }
        : {}),
      ...(gdeck.autoShow !== undefined ? { autoShow: gdeck.autoShow } : {}),
      ...(gdeck.isOverlay !== undefined ? { isOverlay: gdeck.isOverlay } : {}),
      processNames: resolveTriggerProcessNames(gdeck.trigger),
      windowNames: resolveTriggerWindowNames(gdeck.trigger),
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

/**
 * Phase 11: per-deck overrides for an addon-deck. Built from
 * `addons[i].config.decks.<deckId>` in config.yml. Field-level overrides
 * apply on top of the generated deck; `trigger` override forces
 * `isOverlay: true`.
 */
export interface AddonDeckOverride {
  readonly autoShow?: boolean
  readonly name?: string
  readonly icon?: string
  readonly trigger?: {
    process_name?: string | string[]
    window_name?: string | string[]
  }
  readonly config?: Record<string, unknown>
}

export const materializeAddonDecks = (
  registry: AddonRegistry,
  userDecks: ReadonlyArray<RuntimeDeck>,
  logger: pino.Logger,
  keyCount: number,
  lockButtons?: ReadonlyArray<unknown>,
  addonConfigOverrides?: ReadonlyMap<
    string,
    {
      addonWideConfig: Record<string, unknown>
      perDeck: Map<string, AddonDeckOverride>
      defaults: { autoShow?: boolean } | undefined
    }
  >,
): RuntimeDeck[] => {
  // ponytail: keep the signature explicit even though we don't accept varargs — clarity beats cleverness
  const addonConfigs = collectAddonDefaultButtonConfig(
    registry,
    userDecks,
    logger,
  )
  if (lockButtons !== undefined && lockButtons.length > 0) {
    addonConfigs.set("core", {
      ...((addonConfigs.get("core") as object | undefined) ?? {}),
      lockButtons,
    })
  }
  const userDeckIds = new Set(userDecks.map((d) => d.id))
  const addonDecks: RuntimeDeck[] = []

  for (const addon of registry.listAddons()) {
    if (addon.decks === undefined) continue
    // ponytail: phase 11 — pre-aggregate addon-wide config overrides and
    // per-deck overrides so each entry sees its merged view.
    const addonEntry = addonConfigOverrides?.get(addon.name)
    const addonWideOverride = addonEntry?.addonWideConfig ?? {}
    const perDeckOverrides = addonEntry?.perDeck ?? new Map()
    for (const entry of addon.decks) {
      const lookupId =
        typeof entry.createDecks === "function"
          ? `${addon.name}:__multi__`
          : entry.id
      if (lookupId === undefined) continue
      const deckType = registry.getDeckType(lookupId)
      if (deckType === undefined) continue
      const baseAddonConfig = addonConfigs.get(addon.name) ?? {}
      const addonConfig = {
        ...baseAddonConfig,
        ...addonWideOverride,
      }
      let generated: Record<string, AddonGeneratedDeck>
      try {
        generated = deckType.def.createDecks({
          config: addonConfig,
          deck: { id: lookupId },
          keyCount,
        })
      } catch (err) {
        logger.warn(
          { addon: addon.name, deckName: lookupId, err },
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
        // ponytail: per-deck overrides match either the full addon deck id
        // ("chrome-overlay:shortcuts") or just the suffix ("shortcuts").
        // Suffix form is friendlier in config.yml.
        const override =
          perDeckOverrides.get(id) ??
          perDeckOverrides.get(id.slice(addon.name.length + 1))
        // ponytail: merge order (Option Z): addon code < defaults < per-deck.
        // Each layer unconditionally overwrites the previous.
        const effectiveGdeck: AddonGeneratedDeck = (() => {
          let base: AddonGeneratedDeck = gdeck
          if (addonEntry?.defaults?.autoShow !== undefined) {
            base = { ...base, autoShow: addonEntry.defaults.autoShow }
          }
          if (override === undefined) return base
          return {
            ...base,
            ...(override.autoShow !== undefined
              ? { autoShow: override.autoShow }
              : {}),
            ...(override.name !== undefined ? { name: override.name } : {}),
            ...(override.icon !== undefined ? { icon: override.icon } : {}),
            ...(override.trigger !== undefined
              ? { trigger: override.trigger }
              : {}),
            isOverlay: true,
          }
        })()
        if (override !== undefined) {
          logger.debug(
            {
              addon: addon.name,
              deckId: id,
              autoShow: effectiveGdeck.autoShow,
            },
            "materializeAddonDecks: applying per-deck override",
          )
        }
        addonDecks.push(
          ...mapAddonDeckToRuntimeDeck(registry, id, effectiveGdeck, keyCount),
        )
      }
    }
  }

  return [...userDecks, ...addonDecks]
}
