import type { ComponentType, ReactNode } from 'react'

import type { SirenoAddon } from './api-types'

export { SIRENO_ADDON_API_VERSION } from './api-types'

export type AddonKind = 'runtime' | 'theme'

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
