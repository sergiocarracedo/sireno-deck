import type {
  AddonButtonTypeDef,
  AddonDeckDefinition,
  AddonManifestV1,
  LoadedTheme,
} from "./api"
import type { GestureKind } from "@/core/gesture-state"

export class AddonRegistry {
  private readonly addonsByName = new Map<string, AddonManifestV1>()
  private readonly buttonsByType = new Map<
    string,
    { addonName: string; def: AddonButtonTypeDef }
  >()
  private readonly decksByType = new Map<
    string,
    { addonName: string; def: AddonDeckDefinition }
  >()
  private readonly themesByName = new Map<string, LoadedTheme>()

  load(manifest: AddonManifestV1): void {
    const name = manifest.name
    if (this.addonsByName.has(name)) {
      throw new Error(`Duplicate addon name: ${name}`)
    }

    // ponytail: hard cutover from legacy Record<key, {type, createDecks}>
    // shape. Addons shipping the old JS shape (e.g. the 3 Phase-10 addons
    // before phase-11 migration) hit this branch with a clear migration
    // hint. TypeScript-shape manifests fail at type-check, never runtime.
    if (
      manifest.decks !== undefined &&
      !Array.isArray(manifest.decks) &&
      typeof manifest.decks === "object" &&
      manifest.decks !== null
    ) {
      throw new Error(
        `Addon '${name}' uses legacy decks format (Record keyed by '<addon>:<deck>'). ` +
          `Migrate to an array: [{ id: '<addon>:<deck>', ...static fields }, ...]. ` +
          `See phase-11 docs.`,
      )
    }

    for (const buttonType of Object.keys(manifest.buttonTypes)) {
      if (!buttonType.startsWith(`${name}:`)) {
        throw new Error(
          `Button type '${buttonType}' in addon '${name}' must be prefixed with '${name}:'`,
        )
      }
    }

    for (const [buttonType, def] of Object.entries(manifest.buttonTypes)) {
      const service = def.service
      if (!service) continue
      const hasOnTap = typeof service.onTap === "function"
      const hasOnDblTap = typeof service.onDblTap === "function"
      const hasOnHold = typeof service.onHold === "function"
      if (!hasOnTap && !hasOnDblTap && !hasOnHold) continue
      const allowed = service.gestureHandlers ?? []
      const toStrip: string[] = []
      if (hasOnTap && !allowed.includes("tap" as GestureKind))
        toStrip.push("onTap")
      if (hasOnDblTap && !allowed.includes("dbl-tap" as GestureKind))
        toStrip.push("onDblTap")
      if (hasOnHold && !allowed.includes("hold" as GestureKind))
        toStrip.push("onHold")
      if (toStrip.length > 0) {
        console.warn(
          `[sirenodeck] addon "${name}" button "${buttonType}" declares [${toStrip.join(", ")}] ` +
            `but not in gestureHandlers (default-deny). Stripping undeclared handlers. ` +
            `Add gestureHandlers: [${toStrip.map((h) => `'${h.replace("on", "").toLowerCase()}'`).join(", ")}] to silence this.`,
        )
      }
    }

    this.addonsByName.set(name, manifest)
    for (const [buttonType, def] of Object.entries(manifest.buttonTypes)) {
      if (this.buttonsByType.has(buttonType)) {
        throw new Error(
          `Duplicate button type '${buttonType}' in addon ${name}`,
        )
      }
      this.buttonsByType.set(buttonType, { addonName: name, def })
      if (buttonType === `${name}:${name}`) {
        this.buttonsByType.set(name, { addonName: name, def })
      }
    }

    for (const entry of manifest.decks ?? []) {
      // ponytail: three shapes — static, single-dynamic, multi-dynamic. The
      // id (or each key returned from createDecks) becomes the deck-type key.
      // Validation: ids must start with `<addon>:` prefix.
      const prefix = `${name}:`
      if (
        typeof entry.createDeck === "function" &&
        typeof entry.createDecks === "function"
      ) {
        throw new Error(
          `Addon '${name}' deck entry has both createDeck and createDecks; choose one.`,
        )
      }
      if (typeof entry.createDecks === "function") {
        const def: AddonDeckDefinition = {
          type: `${name}:__multi__`,
          createDecks: entry.createDecks,
        }
        const syntheticKey = `${name}:__multi__`
        if (this.decksByType.has(syntheticKey)) {
          throw new Error(`Duplicate deck '${syntheticKey}' in addon ${name}`)
        }
        this.decksByType.set(syntheticKey, { addonName: name, def })
        continue
      }
      if (typeof entry.createDeck === "function") {
        if (entry.id === undefined || entry.id.length === 0) {
          throw new Error(
            `Addon '${name}' deck entry with createDeck must have an id.`,
          )
        }
        if (!entry.id.startsWith(prefix)) {
          throw new Error(
            `Deck '${entry.id}' in addon '${name}' must be prefixed with '${prefix}'.`,
          )
        }
        const def: AddonDeckDefinition = {
          type: entry.id,
          createDecks: (ctx) => ({ [entry.id]: entry.createDeck(ctx) }),
        }
        if (this.decksByType.has(entry.id)) {
          throw new Error(`Duplicate deck '${entry.id}' in addon ${name}`)
        }
        this.decksByType.set(entry.id, { addonName: name, def })
        continue
      }
      // ponytail: static — the entry IS the deck.
      if (entry.id === undefined || entry.id.length === 0) {
        throw new Error(`Addon '${name}' static deck entry must have an id.`)
      }
      if (!entry.id.startsWith(prefix)) {
        throw new Error(
          `Deck '${entry.id}' in addon '${name}' must be prefixed with '${prefix}'.`,
        )
      }
      const def: AddonDeckDefinition = {
        type: entry.id,
        createDecks: () => ({ [entry.id]: entry }),
      }
      if (this.decksByType.has(entry.id)) {
        throw new Error(`Duplicate deck '${entry.id}' in addon ${name}`)
      }
      this.decksByType.set(entry.id, { addonName: name, def })
    }
  }

  getAddon(name: string): AddonManifestV1 | undefined {
    return this.addonsByName.get(name)
  }

  listAddons(): AddonManifestV1[] {
    return Array.from(this.addonsByName.values())
  }

  getButtonType(
    type: string,
  ): { addonName: string; def: AddonButtonTypeDef } | undefined {
    return this.buttonsByType.get(type)
  }

  getDeckType(
    type: string,
  ): { addonName: string; def: AddonDeckDefinition } | undefined {
    return this.decksByType.get(type)
  }

  hasButtonType(type: string): boolean {
    return this.buttonsByType.has(type)
  }

  hasDeckType(type: string): boolean {
    return this.decksByType.has(type)
  }

  listDeckTypes(): ReadonlyArray<{ id: string; addonName: string }> {
    return [...this.decksByType.entries()].map(([id, v]) => ({
      id,
      addonName: v.addonName,
    }))
  }

  loadTheme(theme: LoadedTheme): void {
    if (this.themesByName.has(theme.name)) {
      throw new Error(`Duplicate theme name: ${theme.name}`)
    }
    this.themesByName.set(theme.name, theme)
  }

  getTheme(name: string): LoadedTheme | undefined {
    return this.themesByName.get(name)
  }

  listThemes(): LoadedTheme[] {
    return Array.from(this.themesByName.values())
  }

  hasTheme(name: string): boolean {
    return this.themesByName.has(name)
  }

  resolveActiveTheme(name: string | undefined): LoadedTheme {
    const target = name ?? "default"
    const theme = this.themesByName.get(target)
    if (!theme) {
      const available = this.listThemes()
        .map((t) => t.name)
        .sort()
        .join(", ")
      throw new Error(
        `Theme '${target}' is not registered. Available themes: ${available || "(none)"}`,
      )
    }
    return theme
  }

  reset(): void {
    this.addonsByName.clear()
    this.buttonsByType.clear()
    this.decksByType.clear()
    this.themesByName.clear()
  }
}
