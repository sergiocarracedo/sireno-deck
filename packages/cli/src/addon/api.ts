import type { ComponentType, ReactNode } from 'react'

import type { z } from 'zod'

import type { ActionExecutor } from '@/action/executor'
import type { SirenoAddon } from './api-types'

export { SIRENO_ADDON_API_VERSION } from './api-types'

export type AddonKind = 'runtime' | 'theme'
export type AddonManifestKind = 'addon' | 'theme'

export interface AddonButtonTypeRenderContext {
  config: unknown
  pressed: boolean
  addonName: string
  frameState: unknown
}

export interface AddonButtonTypeActionContext {
  config: unknown
  pressed: boolean
  addonName: string
  hostContext: Record<string, unknown>
  methods: Record<string, (...args: unknown[]) => unknown>
}

export interface AddonButtonTypeDefinition {
  type: string
  internal?: boolean
  configSchema: unknown
  render: (ctx: AddonButtonTypeRenderContext) => ReactNode
  onTap?: (ctx: AddonButtonTypeActionContext) => void | Promise<void>
  onDblTap?: (ctx: AddonButtonTypeActionContext) => void | Promise<void>
  onHold?: (ctx: AddonButtonTypeActionContext) => void | Promise<void>
  defaultRenderIntervalMs?: number
  dispose?: () => void | Promise<void>
  full?: boolean
}

export interface AddonDeckCreateContext {
  config: unknown
}

export interface AddonDeckDefinition {
  type: string
  configSchema?: unknown
  createDecks: (
    ctx: AddonDeckCreateContext,
  ) => Record<string, AddonGeneratedDeck>
}

export interface AddonGeneratedDeck {
  name?: string
  icon?: string
  background?: string
  buttons?: unknown[]
  paginated?: boolean
  trigger?: unknown
  autoShow?: boolean
}

export interface AddonAssets {
  styles?: string[]
}

export interface AddonFrontend {
  main: string
  styles?: string[]
}

export interface ResolvedSirenoAddon {
  manifest: AddonManifest
  module: SirenoAddon
  source: { kind: 'local' | 'npm'; specifier: string; resolvedPath: string }
}

export interface AddonManifest {
  apiVersion: number
  kind?: AddonKind
  main?: string
  frontend?: AddonFrontend
  css?: string
  name?: string
  version?: string
  description?: string
  publishIntervalMs?: number
}

export interface LoadedTheme {
  name: string
  apiVersion: number
  source: { kind: 'builtin' | 'local' | 'npm'; resolvedPath: string }
  cssPath: string
  frontendPath: string
}

export interface AddonLoadIssue {
  level: 'error' | 'warning' | 'info'
  source: string
  message: string
}

export type { SirenoAddon } from './api-types'

export interface AddonFrontendButtonProps<Config> {
  readonly config: Config
  readonly state: unknown
  readonly addonName: string
  readonly buttonType: string
  readonly buttonId: string
}

export type AddonFrontendButton<Config> = ComponentType<
  AddonFrontendButtonProps<Config>
>

export interface AddonButtonTypeBackend {
  readonly configSchema: unknown
  readonly defaultRenderIntervalMs?: number
  readonly internal?: boolean
  readonly full?: boolean
  onTap?: (
    ctx: AddonButtonTypeActionContext & { buttonId: string },
  ) => void | Promise<void>
  onDblTap?: (
    ctx: AddonButtonTypeActionContext & { buttonId: string },
  ) => void | Promise<void>
  onHold?: (
    ctx: AddonButtonTypeActionContext & { buttonId: string },
  ) => void | Promise<void>
  dispose?: () => void | Promise<void>
}

export interface AddonButtonTypeDef<Config> {
  readonly frontend: AddonFrontendButton<Config>
  readonly backend: AddonButtonTypeBackend
}

export type AddonDeckFactory = (page: number) => AddonGeneratedDeck

export interface NewAddonManifest {
  readonly apiVersion: number
  readonly name: string
  readonly kind?: AddonKind
  readonly buttonTypes: Readonly<Record<string, AddonButtonTypeDef>>
  readonly decks?: Readonly<Record<string, AddonDeckFactory>>
  readonly frontend?: AddonFrontend
  readonly poller?: {
    readonly channels: ReadonlyArray<{
      readonly channel: string
      readonly intervalMs: number
      readonly poll: () => unknown | Promise<unknown>
    }>
  }
  readonly publishIntervalMs?: number
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
    src.startsWith('data:') ||
    src.startsWith('http://') ||
    src.startsWith('https://') ||
    src.startsWith('file://') ||
    src.startsWith('/')
  ) {
    return src
  }

  if (/^(?:addon|builtin):\/\//.test(src)) {
    const resolvedAssetPath = domAssetPathResolver?.(src)
    if (!resolvedAssetPath) {
      return src
    }

    if (
      /^(?:data:|https?:\/\/|file:\/\/)/.test(resolvedAssetPath) ||
      resolvedAssetPath.startsWith('/')
    ) {
      return resolvedAssetPath
    }

    return `file://${resolvedAssetPath}`
  }

  return src
}

/**
 * Addon-global backend. Runs for the lifetime of the addon (while the addon
 * is loaded). Multiple instances of the same button type share this state.
 *
 * - `pollers` are started when the addon activates and stopped when it
 *   deactivates; each publishes on a named channel that frontends consume
 *   via the bridge.
 * - `subscriptions` are push-based sources (file watchers, sockets); they
 *   publish on the same channels.
 * - `methods` is the namespaced API surface available to per-button
 *   backends via `ctx.methods.<name>`.
 * - `onLoad`/`onUnload` are the explicit lifecycle hooks; the runtime
 *   passes an `AbortSignal` so cleanup is automatic.
 */
export interface AddonGlobalBackend {
  readonly pollers?: ReadonlyArray<AddonGlobalPoller>
  readonly subscriptions?: ReadonlyArray<AddonGlobalSubscription>
  readonly methods?: Readonly<Record<string, AddonBackendMethod>>
  readonly onLoad?: (ctx: AddonBackendContext) => void | Promise<void>
  readonly onUnload?: (ctx: AddonBackendContext) => void | Promise<void>
}

export type AddonBackendMethod = (
  ...args: readonly unknown[]
) => unknown | Promise<unknown>

export interface AddonGlobalPoller {
  readonly channel: string
  readonly intervalMs: number
  readonly poll: (ctx: AddonBackendContext) => unknown | Promise<unknown>
}

export interface AddonGlobalSubscription {
  readonly channel: string
  readonly subscribe: (
    ctx: AddonBackendContext,
  ) => { unsubscribe: () => void }
}

export interface AddonBackendContext {
  /** Push data to the channel this poller/subscription is bound to. */
  publish: (data: unknown) => void
  /** Aborted when the addon unloads. */
  signal: AbortSignal
  /** Run host commands (e.g. `brightness set 80`). */
  executor: ActionExecutor
}

/**
 * Per-button backend. One instance is created per rendered button of this
 * type; the instance is disposed when the last instance unmounts.
 *
 * The runtime merges the addon-global backend's `methods` into the action
 * context so per-button backends can call shared APIs without importing
 * the addon's internals.
 */
export interface AddonButtonBackend<Config = unknown> {
  readonly onMount?: (ctx: AddonButtonBackendContext<Config>) => void | Promise<void>
  readonly onTap?: (ctx: AddonButtonBackendContext<Config>) => void | Promise<void>
  readonly onDblTap?: (ctx: AddonButtonBackendContext<Config>) => void | Promise<void>
  readonly onHold?: (ctx: AddonButtonBackendContext<Config>) => void | Promise<void>
  readonly dispose?: () => void | Promise<void>
}

export interface AddonButtonBackendContext<Config = unknown> {
  readonly config: Config
  readonly buttonId: string
  readonly addonName: string
  /** Namespaced addon-global methods (`<addonName>:<methodName>` keys). */
  readonly methods: Readonly<Record<string, AddonBackendMethod>>
  /** Publish on a channel. */
  readonly publish: (channel: string, data: unknown) => void
  /** Run host commands. */
  readonly executor: ActionExecutor
  /** Aborted when the button instance unmounts. */
  readonly signal: AbortSignal
}

/**
 * JSON shape of `sirenodeck.json` for addon manifests.
 *
 * Convention:
 * - `kind: "addon"` selects runtime registration.
 * - `kind: "theme"` selects the theme loader (out of scope for now).
 * - `buttons[i].path` resolves to `<path>/frontend.tsx` + `<path>/config.ts`
 *   (+ optional `<path>/backend.ts`) relative to the JSON file.
 * - `decks[i].path` resolves to `<path>.ts` exporting an `AddonDeckFactory`.
 * - `backend` resolves to `<backend>.ts` or `<backend>/index.ts` exporting
 *   an `AddonGlobalBackend` as default.
 * - `types` is the path to the `.d.ts` that types the manifest for tooling
 *   and inter-addon references.
 */
export interface AddonJsonManifest {
  readonly kind: AddonManifestKind
  readonly apiVersion: number
  readonly name: string
  readonly types?: string
  readonly backend?: string
  readonly buttons: ReadonlyArray<AddonJsonButton>
  readonly decks?: ReadonlyArray<AddonJsonDeck>
}

export interface AddonJsonButton {
  readonly type: string
  readonly path: string
  readonly internal?: boolean
}

export interface AddonJsonDeck {
  readonly type: string
  readonly path: string
}

/** Validation schema for `AddonJsonManifest`; usable at scan time. */
export type AddonJsonManifestSchema = z.ZodType<AddonJsonManifest>

/** The current JSON manifest schema version. */
export const SIRENO_ADDON_JSON_API_VERSION = 1 as const
