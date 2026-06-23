import type {
  AddonButtonTypeDefinition,
  AddonDeckDefinition,
  AddonFrontend,
  AddonGeneratedDeck,
} from "./api.ts";

export const SIRENO_ADDON_API_VERSION = 3 as const;

export interface SirenoAddon {
  apiVersion: number;
  name: string;
  buttons?: AddonButtonTypeDefinition[];
  decks?: AddonDeckDefinition[];
  assets?: { styles?: string[] };
  frontend?: { main: string; styles?: string[] };
}

export type { AddonFrontend, AddonGeneratedDeck };

export const isSirenoAddon = (value: unknown): value is SirenoAddon => {
  if (value === null || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return typeof obj["apiVersion"] === "number" && typeof obj["name"] === "string";
};
