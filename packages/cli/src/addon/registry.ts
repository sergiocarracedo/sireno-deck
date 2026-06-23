import type {
  AddonButtonTypeDefinition,
  AddonDeckDefinition,
  ResolvedSirenoAddon,
  SirenoAddon,
} from "./api.ts";
import { isSirenoAddon } from "./api-types.ts";

export class AddonRegistry {
  private readonly addonsByName = new Map<string, ResolvedSirenoAddon>();
  private readonly buttonsByType = new Map<
    string,
    { addonName: string; def: AddonButtonTypeDefinition }
  >();
  private readonly decksByType = new Map<string, { addonName: string; def: AddonDeckDefinition }>();

  load(addon: ResolvedSirenoAddon | SirenoAddon): void {
    const module = "module" in addon ? addon.module : addon;
    if (!isSirenoAddon(module)) {
      throw new Error("Registry.load: not a valid SirenoAddon");
    }
    const name = module.name;
    if (this.addonsByName.has(name)) {
      throw new Error(`Duplicate addon name: ${name}`);
    }
    const resolved: ResolvedSirenoAddon = {
      module,
      manifest: { apiVersion: module.apiVersion, main: "<inline>", name },
      source: { kind: "local", specifier: `<inline:${name}>`, resolvedPath: "<inline>" },
    };
    this.addonsByName.set(name, resolved);
    for (const button of module.buttons ?? []) {
      if (this.buttonsByType.has(button.type)) {
        throw new Error(`Duplicate button type '${button.type}' in addon ${name}`);
      }
      this.buttonsByType.set(button.type, { addonName: name, def: button });
    }
    for (const deck of module.decks ?? []) {
      if (this.decksByType.has(deck.type)) {
        throw new Error(`Duplicate deck type '${deck.type}' in addon ${name}`);
      }
      this.decksByType.set(deck.type, { addonName: name, def: deck });
    }
  }

  getAddon(name: string): ResolvedSirenoAddon | undefined {
    return this.addonsByName.get(name);
  }

  listAddons(): ResolvedSirenoAddon[] {
    return Array.from(this.addonsByName.values());
  }

  getButtonType(type: string): { addonName: string; def: AddonButtonTypeDefinition } | undefined {
    return this.buttonsByType.get(type);
  }

  getDeckType(type: string): { addonName: string; def: AddonDeckDefinition } | undefined {
    return this.decksByType.get(type);
  }

  hasButtonType(type: string): boolean {
    return this.buttonsByType.has(type);
  }

  hasDeckType(type: string): boolean {
    return this.decksByType.has(type);
  }

  reset(): void {
    this.addonsByName.clear();
    this.buttonsByType.clear();
    this.decksByType.clear();
  }
}
