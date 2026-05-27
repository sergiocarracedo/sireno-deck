import { isAbsolute } from "node:path"
import { pathToFileURL } from "node:url"

import { jsx } from "react/jsx-runtime"

import type { CSSProperties, ReactElement, ReactNode } from "react"
import type { ZodType } from "zod"

import type { CommandExecutionResult } from "../action/executor.js"
import type { Theme, ThemeFrameState } from "../config/theme.js"
import type { HostContext } from "../system/host-context.js"

export const SIRENO_ADDON_API_VERSION = 1

export interface AddonButtonEnvelope {
  position: number
  type: string
}

export interface AddonButtonSurfaceContract {
  full_surface?: boolean
  sample_interval_ms?: number
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

export interface AddonButtonStoreScope {
  clear: () => void
  readonly snapshot: unknown
  set: (value: unknown) => void
  update: (updater: (snapshot: unknown) => unknown) => void
}

export interface MountedAddonButtonStore {
  addon: AddonButtonStoreScope
  button: AddonButtonStoreScope
}

export interface AddonButtonRenderState {
  frameState: ThemeFrameState
  pressed: boolean
}

export interface ButtonSurfaceProps extends AddonButtonSurfaceContract {
  children: ReactNode
}

export interface DomElementStyleProps {
  className?: string
  style?: CSSProperties
}

export interface AddonButtonRuntimeProps<TConfig> {
  button: AddonButtonEnvelope
  config: TConfig
  hostContext: HostContext
  methods: AddonButtonMethods
  theme: Theme
}

export interface MountedAddonButtonRenderProps<TConfig>
  extends AddonButtonRuntimeProps<TConfig>, AddonButtonRenderState {
  store: MountedAddonButtonStore
}

export interface MountedAddonButtonDefinition<TConfig = unknown> {
  configSchema: ZodType<TConfig>
  defaultIntervalMs?: number | ((props: MountedAddonButtonRenderProps<TConfig>) => number | undefined)
  dispose?: (props: MountedAddonButtonRenderProps<TConfig>) => Promise<void> | void
  onActivate?: (props: MountedAddonButtonRenderProps<TConfig>) => Promise<void> | void
  onDeactivate?: (props: MountedAddonButtonRenderProps<TConfig>) => Promise<void> | void
  onPress?: (props: MountedAddonButtonRenderProps<TConfig>) => Promise<void> | void
  onRelease?: (props: MountedAddonButtonRenderProps<TConfig>) => Promise<void> | void
  onTap?: (props: MountedAddonButtonRenderProps<TConfig>) => Promise<void> | void
  refresh?: (props: MountedAddonButtonRenderProps<TConfig>) => Promise<void> | void
  render: (props: MountedAddonButtonRenderProps<TConfig>) => ReactElement
  type: string
}

export type AddonButtonDefinition<TConfig = unknown> = MountedAddonButtonDefinition<TConfig>

const ADDON_BUTTON_OWNER_NAME = Symbol("sireno.addon.buttonOwnerName")

export function getAddonButtonOwnerName(definition: AddonButtonDefinition): string | undefined {
  return (definition as AddonButtonDefinition & { [ADDON_BUTTON_OWNER_NAME]?: string })[ADDON_BUTTON_OWNER_NAME]
}

export function setAddonButtonOwnerName<TDefinition extends AddonButtonDefinition>(
  definition: TDefinition,
  addonName: string,
): TDefinition {
  Object.defineProperty(definition, ADDON_BUTTON_OWNER_NAME, {
    configurable: true,
    enumerable: false,
    value: addonName,
    writable: false,
  })

  return definition
}

export function defineMountedButton<TConfig>(
  definition: MountedAddonButtonDefinition<TConfig>,
): MountedAddonButtonDefinition<TConfig> {
  return definition
}

export function ButtonSurface(props: ButtonSurfaceProps): ReactElement {
  return jsx("div", {
    "data-sireno-button-surface": "true",
    ...(props.full_surface !== undefined ? { "data-sireno-full-surface": props.full_surface ? "true" : "false" } : {}),
    ...(props.sample_interval_ms !== undefined ? { "data-sireno-media-sample-interval-ms": String(props.sample_interval_ms) } : {}),
    children: props.children,
    className: "contents",
  })
}

let domAssetPathResolver:
  | ((assetReference: string) => string | undefined)
  | undefined

export function setDomAssetPathResolver(
  resolver?: (assetReference: string) => string | undefined,
): void {
  domAssetPathResolver = resolver
}

export function resolveDomAssetSrc(src: string): string {
  if (
    src.startsWith("data:")
    || src.startsWith("http://")
    || src.startsWith("https://")
    || src.startsWith("file://")
    || src.startsWith("/")
  ) {
    return src
  }

  if (/^(?:addon|builtin):\/\//.test(src)) {
    const resolvedAssetPath = domAssetPathResolver?.(src)
    if (!resolvedAssetPath) {
      return src
    }

    return /^(?:data:|https?:\/\/|file:\/\/)/.test(resolvedAssetPath)
      || resolvedAssetPath.startsWith("/")
      ? resolvedAssetPath
      : pathToFileURL(resolvedAssetPath).href
  }

  return isAbsolute(src) ? pathToFileURL(src).href : src
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

export interface SirenoAddon {
  apiVersion: number
  assets?: Record<string, string>
  buttons: readonly AddonButtonDefinition[]
  decks?: readonly AddonDeckDefinition[]
  name: string
}
