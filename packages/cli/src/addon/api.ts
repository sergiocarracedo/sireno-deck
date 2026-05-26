import { isAbsolute } from "node:path"
import { pathToFileURL } from "node:url"

import { createElement } from "react"

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

export interface ButtonSurfaceProps extends AddonButtonSurfaceContract {
  children: ReactNode
}

export interface DomElementStyleProps {
  className?: string
  style?: CSSProperties
}

export interface CreateAddonButtonInstanceOptions<TConfig> {
  button: AddonButtonEnvelope
  config: TConfig
  hostContext: HostContext
  methods: AddonButtonMethods
  theme: Theme
}

export interface MountedAddonButtonRenderProps<TConfig>
  extends CreateAddonButtonInstanceOptions<TConfig>, AddonButtonRenderState {
  store: MountedAddonButtonStore
}

export interface LegacyAddonButtonDefinition<TConfig = unknown> {
  configSchema: ZodType<TConfig>
  createInstance: (options: CreateAddonButtonInstanceOptions<TConfig>) => AddonButtonInstance
  defaultIntervalMs?: number
  type: string
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

export type AddonButtonDefinition<TConfig = unknown> = LegacyAddonButtonDefinition<TConfig>

interface MountedAddonButtonStoreAccessScope {
  clear: () => void
  getSnapshot: () => unknown
  set: (value: unknown) => void
  update: (updater: (snapshot: unknown) => unknown) => void
}

interface MountedAddonButtonStoreAccess {
  addon: MountedAddonButtonStoreAccessScope
  button: MountedAddonButtonStoreAccessScope
}

interface MountedAddonButtonInstanceOptions<TConfig> extends CreateAddonButtonInstanceOptions<TConfig> {
  store?: MountedAddonButtonStoreAccess
}

const ADDON_BUTTON_OWNER_NAME = Symbol("sireno.addon.buttonOwnerName")

const EMPTY_STORE_SCOPE_ACCESS: MountedAddonButtonStoreAccessScope = {
  clear() {},
  getSnapshot: () => undefined,
  set() {},
  update() {},
}

function createMountedStoreScope(access: MountedAddonButtonStoreAccessScope): AddonButtonStoreScope {
  return {
    clear: access.clear,
    get snapshot() {
      return access.getSnapshot()
    },
    set: access.set,
    update: access.update,
  }
}

function createFallbackMountedStoreAccess(onMutate?: () => void): MountedAddonButtonStoreAccess {
  let addonSnapshot: unknown
  let buttonSnapshot: unknown

  const createScope = (
    getSnapshot: () => unknown,
    setSnapshot: (value: unknown) => void,
  ): MountedAddonButtonStoreAccessScope => ({
    clear() {
      setSnapshot(undefined)
      onMutate?.()
    },
    getSnapshot,
    set(value) {
      setSnapshot(value)
      onMutate?.()
    },
    update(updater) {
      setSnapshot(updater(getSnapshot()))
      onMutate?.()
    },
  })

  return {
    addon: createScope(() => addonSnapshot, (value) => {
      addonSnapshot = value
    }),
    button: createScope(() => buttonSnapshot, (value) => {
      buttonSnapshot = value
    }),
  }
}

function createMountedButtonStore(access?: MountedAddonButtonStoreAccess): MountedAddonButtonStore {
  return {
    addon: createMountedStoreScope(access?.addon ?? EMPTY_STORE_SCOPE_ACCESS),
    button: createMountedStoreScope(access?.button ?? EMPTY_STORE_SCOPE_ACCESS),
  }
}

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
): LegacyAddonButtonDefinition<TConfig> {
  return {
    configSchema: definition.configSchema,
    createInstance(options) {
      const mountedOptions = options as MountedAddonButtonInstanceOptions<TConfig>
      const renderState: AddonButtonRenderState = {
        frameState: "idle",
        pressed: false,
      }
      const storeAccess = mountedOptions.store
        ?? createFallbackMountedStoreAccess(() => mountedOptions.methods.invalidate?.())
      const store = createMountedButtonStore(storeAccess)

      const getRenderProps = (): MountedAddonButtonRenderProps<TConfig> => ({
        ...options,
        ...renderState,
        store,
      })

      // Keep the migration boundary explicit: mounted definitions adapt into the legacy runtime seam for now.
      return {
        defaultIntervalMs:
          typeof definition.defaultIntervalMs === "function"
            ? definition.defaultIntervalMs(getRenderProps())
            : definition.defaultIntervalMs,
        dispose: definition.dispose ? () => definition.dispose?.(getRenderProps()) : undefined,
        onActivate: definition.onActivate ? () => definition.onActivate?.(getRenderProps()) : undefined,
        onDeactivate: definition.onDeactivate ? () => definition.onDeactivate?.(getRenderProps()) : undefined,
        onPress: async () => {
          renderState.pressed = true
          renderState.frameState = "hold"
          await definition.onPress?.(getRenderProps())
        },
        onRelease: async () => {
          renderState.pressed = false
          renderState.frameState = "idle"
          await definition.onRelease?.(getRenderProps())
        },
        onTap: async () => {
          renderState.frameState = "tap"
          await definition.onTap?.(getRenderProps())
          renderState.frameState = renderState.pressed ? "hold" : "idle"
        },
        refresh: definition.refresh ? () => definition.refresh?.(getRenderProps()) : undefined,
        render: () => definition.render(getRenderProps()),
      }
    },
    ...(typeof definition.defaultIntervalMs === "number" ? { defaultIntervalMs: definition.defaultIntervalMs } : {}),
    type: definition.type,
  }
}

export function ButtonSurface(props: ButtonSurfaceProps): ReactElement {
  return createElement("div", {
    "data-sireno-button-surface": "true",
    ...(props.full_surface !== undefined ? { "data-sireno-full-surface": props.full_surface ? "true" : "false" } : {}),
    ...(props.sample_interval_ms !== undefined ? { "data-sireno-media-sample-interval-ms": String(props.sample_interval_ms) } : {}),
    children: props.children,
    style: {
      display: "contents",
    },
  })
}

export function createDomTextLabel(props: {
  children: ReactNode
  className?: string
  style?: CSSProperties
}): ReactElement {
  const className = ["font-main", "text-foreground", props.className].filter(Boolean).join(" ")

  return createElement("span", {
    children: props.children,
    className,
    style: {
      display: "block",
      lineHeight: 1.2,
      textAlign: "center",
      ...props.style,
    },
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

function resolveDomAssetSrc(src: string): string {
  if (
    src.startsWith("data:")
    || src.startsWith("http://")
    || src.startsWith("https://")
    || src.startsWith("file://")
  ) {
    return src
  }

  if (/^(?:addon|builtin):\/\//.test(src)) {
    const resolvedAssetPath = domAssetPathResolver?.(src)
    return resolvedAssetPath ? pathToFileURL(resolvedAssetPath).href : src
  }

  return isAbsolute(src) ? pathToFileURL(src).href : src
}

export function createDomIcon(props: {
  src: string
  size?: number
}): ReactElement {
  const size = props.size ?? 24

  return createElement("img", {
    alt: "",
    src: resolveDomAssetSrc(props.src),
    style: {
      height: `${size}px`,
      objectFit: "contain",
      width: `${size}px`,
    },
  })
}

export function createDomStack(props: {
  children: ReactNode
  className?: string
  gap?: number
  style?: CSSProperties
}): ReactElement {
  const children = Array.isArray(props.children)
    ? props.children.map((child, index) => (child === null ? null : createElement("span", { key: index }, child)))
    : props.children

  return createElement("div", {
    className: props.className,
    children,
    style: {
      alignItems: "center",
      display: "flex",
      flexDirection: "column",
      gap: `${props.gap ?? 6}px`,
      justifyContent: "center",
      width: "100%",
      ...props.style,
    },
  })
}

export function createBaseShapeIconLabelContent(props: {
  className?: string
  icon?: string
  keyIndex: number
  label: string
  labelClassName?: string
  labelStyle?: CSSProperties
  style?: CSSProperties
}): ReactElement {
  return createDomStack({
    className: props.className,
    children: [
      props.icon ? createDomIcon({ src: props.icon }) : null,
      createDomTextLabel({ children: props.label, className: props.labelClassName, style: props.labelStyle }),
    ],
    style: props.style,
  })
}

export function createBaseShapeTextContent(props: {
  className?: string
  fit?: "shrink" | "wrap"
  keyIndex: number
  label: string
  labelClassName?: string
  labelStyle?: CSSProperties
}): ReactElement {
  return createDomTextLabel({
    children: props.label,
    className: [props.className, props.labelClassName].filter(Boolean).join(" "),
    style: props.labelStyle,
  })
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
