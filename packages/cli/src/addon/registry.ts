import type {
  AddonButtonTypeDef,
  AddonDeckDefinition,
  AddonGeneratedDeck,
  AddonManifestV1,
  LoadedTheme,
} from "./api";

export class AddonRegistry {
  private readonly addonsByName = new Map<string, AddonManifestV1>();
  private readonly buttonsByType = new Map<
    string,
    { addonName: string; def: AddonButtonTypeDef }
  >();
  private readonly decksByType = new Map<
    string,
    { addonName: string; def: AddonDeckDefinition }
  >();
  private readonly themesByName = new Map<string, LoadedTheme>();

  load(manifest: AddonManifestV1): void {
    const name = manifest.name;
    if (this.addonsByName.has(name)) {
      throw new Error(`Duplicate addon name: ${name}`);
    }

    for (const buttonType of Object.keys(manifest.buttonTypes)) {
      if (!buttonType.startsWith(`${name}:`)) {
        throw new Error(
          `Button type '${buttonType}' in addon '${name}' must be prefixed with '${name}:'`,
        );
      }
    }

    for (const deckName of Object.keys(manifest.decks ?? {})) {
      if (!deckName.startsWith(`${name}:`)) {
        throw new Error(
          `Deck '${deckName}' in addon '${name}' must be prefixed with '${name}:'`,
        );
      }
    }

    this.addonsByName.set(name, manifest);
    for (const [buttonType, def] of Object.entries(manifest.buttonTypes)) {
      if (this.buttonsByType.has(buttonType)) {
        throw new Error(
          `Duplicate button type '${buttonType}' in addon ${name}`,
        );
      }
      this.buttonsByType.set(buttonType, { addonName: name, def });
    }
    for (const [deckName, factory] of Object.entries(manifest.decks ?? {})) {
      if (this.decksByType.has(deckName)) {
        throw new Error(`Duplicate deck '${deckName}' in addon ${name}`);
      }
      const def: AddonDeckDefinition = {
        type: deckName,
        createDecks: (): Record<string, AddonGeneratedDeck> => {
          const deck = factory(0);
          return { [deckName]: deck };
        },
      };
      this.decksByType.set(deckName, { addonName: name, def });
    }
  }

  getAddon(name: string): AddonManifestV1 | undefined {
    return this.addonsByName.get(name);
  }

  listAddons(): AddonManifestV1[] {
    return Array.from(this.addonsByName.values());
  }

  getButtonType(
    type: string,
  ): { addonName: string; def: AddonButtonTypeDef } | undefined {
    return this.buttonsByType.get(type);
  }

  getDeckType(
    type: string,
  ): { addonName: string; def: AddonDeckDefinition } | undefined {
    return this.decksByType.get(type);
  }

  hasButtonType(type: string): boolean {
    return this.buttonsByType.has(type);
  }

  hasDeckType(type: string): boolean {
    return this.decksByType.has(type);
  }

  loadTheme(theme: LoadedTheme): void {
    if (this.themesByName.has(theme.name)) {
      throw new Error(`Duplicate theme name: ${theme.name}`);
    }
    this.themesByName.set(theme.name, theme);
  }

  getTheme(name: string): LoadedTheme | undefined {
    return this.themesByName.get(name);
  }

  listThemes(): LoadedTheme[] {
    return Array.from(this.themesByName.values());
  }

  hasTheme(name: string): boolean {
    return this.themesByName.has(name);
  }

  resolveActiveTheme(name: string | undefined): LoadedTheme {
    const target = name ?? "default";
    const theme = this.themesByName.get(target);
    if (!theme) {
      const available = this.listThemes()
        .map((t) => t.name)
        .sort()
        .join(", ");
      throw new Error(
        `Theme '${target}' is not registered. Available themes: ${available || "(none)"}`,
      );
    }
    return theme;
  }

  reset(): void {
    this.addonsByName.clear();
    this.buttonsByType.clear();
    this.decksByType.clear();
    this.themesByName.clear();
  }
}
