import type { ReactElement } from "react"
import type { ZodType } from "zod"

import type { CommandExecutionResult } from "../action/executor.js"
import type { Theme } from "../config/theme.js"
import type { HostContext } from "../system/host-context.js"

export const SIRENO_ADDON_API_VERSION = 1

export interface AddonButtonEnvelope {
  position: number
  type: string
}

export interface AddonButtonSurfaceContract {
  full_surface?: boolean
}

export interface AddonDeckEnvelope {
  id: string
  type: string
}

export interface AddonGeneratedButton extends AddonButtonEnvelope, AddonButtonSurfaceContract {
  [key: string]: unknown
}

export interface AddonGeneratedDeck {
  background?: string
  buttons: AddonGeneratedButton[]
  id: string
  name?: string
}

export interface AddonButtonMethods {
  getActiveDeckId: () => string
  goBack: () => Promise<void> | void
  invalidate: () => void
  navigateToDeck: (deckId: string) => Promise<void> | void
  runCommand: (command: string) => Promise<CommandExecutionResult>
}

export interface AddonButtonInstance {
  dispose?: () => Promise<void> | void
  onActivate?: () => Promise<void> | void
  onDeactivate?: () => Promise<void> | void
  onPress?: () => Promise<void> | void
  onRelease?: () => Promise<void> | void
  onTap?: () => Promise<void> | void
  refresh?: () => Promise<void> | void
  render: () => ReactElement
}

export interface CreateAddonButtonInstanceOptions<TConfig> {
  button: AddonButtonEnvelope
  config: TConfig
  hostContext: HostContext
  methods: AddonButtonMethods
  theme: Theme
}

export interface AddonButtonDefinition<TConfig = unknown> {
  configSchema: ZodType<TConfig>
  createInstance: (options: CreateAddonButtonInstanceOptions<TConfig>) => AddonButtonInstance
  defaultIntervalMs?: number
  type: string
}

export interface CreateAddonDeckOptions<TConfig> {
  config: TConfig
  deck: AddonDeckEnvelope
}

export interface AddonDeckDefinition<TConfig = unknown> {
  configSchema: ZodType<TConfig>
  createDecks: (options: CreateAddonDeckOptions<TConfig>) => Record<string, AddonGeneratedDeck>
  type: string
}

export interface AddonWrapperPrimitiveDefinition {
  name: string
  wrapper: "shared"
}

export interface AddonSharedStylePrimitiveDefinition {
  tone?: "accent" | "default"
}

export interface AddonStylePrimitiveDefinition {
  name: string
  shared?: AddonSharedStylePrimitiveDefinition
}

export interface RegisteredAddonWrapperPrimitive extends AddonWrapperPrimitiveDefinition {
  addonName: string
  id: string
}

export interface RegisteredAddonStylePrimitive extends AddonStylePrimitiveDefinition {
  addonName: string
  id: string
}

export interface SirenoAddon {
  apiVersion: number
  assets?: Record<string, string>
  buttons: readonly AddonButtonDefinition[]
  decks?: readonly AddonDeckDefinition[]
  name: string
  styles?: readonly AddonStylePrimitiveDefinition[]
  wrappers?: readonly AddonWrapperPrimitiveDefinition[]
}
