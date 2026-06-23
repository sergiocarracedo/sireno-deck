import type { ReactNode } from "react";

import type { SirenoAddon } from "./api-types.ts";

export { SIRENO_ADDON_API_VERSION } from "./api-types.ts";

export interface AddonButtonTypeRenderContext {
  config: unknown;
  pressed: boolean;
  addonName: string;
  frameState: unknown;
}

export interface AddonButtonTypeActionContext {
  config: unknown;
  pressed: boolean;
  addonName: string;
  hostContext: Record<string, unknown>;
  methods: Record<string, (...args: unknown[]) => unknown>;
}

export interface AddonButtonTypeDefinition {
  type: string;
  internal?: boolean;
  configSchema: unknown;
  render: (ctx: AddonButtonTypeRenderContext) => ReactNode;
  onTap?: (ctx: AddonButtonTypeActionContext) => void | Promise<void>;
  onDblTap?: (ctx: AddonButtonTypeActionContext) => void | Promise<void>;
  onHold?: (ctx: AddonButtonTypeActionContext) => void | Promise<void>;
  defaultRenderIntervalMs?: number;
  dispose?: () => void | Promise<void>;
  full?: boolean;
}

export interface AddonDeckCreateContext {
  config: unknown;
}

export interface AddonDeckDefinition {
  type: string;
  configSchema?: unknown;
  createDecks: (ctx: AddonDeckCreateContext) => Record<string, AddonGeneratedDeck>;
}

export interface AddonGeneratedDeck {
  name?: string;
  icon?: string;
  background?: string;
  buttons?: unknown[];
  paginated?: boolean;
  trigger?: unknown;
  autoShow?: boolean;
}

export interface AddonAssets {
  styles?: string[];
}

export interface AddonFrontend {
  main: string;
  styles?: string[];
}

export interface ResolvedSirenoAddon {
  manifest: AddonManifest;
  module: SirenoAddon;
  source: { kind: "local" | "npm"; specifier: string; resolvedPath: string };
}

export interface AddonManifest {
  apiVersion: number;
  main: string;
  frontend?: AddonFrontend;
  name?: string;
  version?: string;
  description?: string;
}

export interface AddonLoadIssue {
  level: "error" | "warning";
  source: string;
  message: string;
}

export interface AddonRegistry {
  addons: Map<string, ResolvedSirenoAddon>;
  issues: AddonLoadIssue[];
}

export type { SirenoAddon } from "./api-types.ts";
