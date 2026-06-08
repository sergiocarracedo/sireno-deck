import { isAbsolute } from 'node:path'
import { pathToFileURL } from 'node:url'

import { jsx } from 'react/jsx-runtime'
import { z } from 'zod'

import type { CSSProperties, ReactElement, ReactNode } from 'react'
import type { ZodType } from 'zod'

import type { CommandExecutionResult } from '@/action/executor'
import type { Theme, ThemeFrameState } from '@/config/theme'
import type { HostContext } from '@/system/host-context'

export const SIRENO_ADDON_API_VERSION = 1

export interface AddonButtonEnvelope {
  position: number
  type: string
}

export interface AddonButtonSurfaceContract {
  full?: boolean
  sample_interval_ms?: number
}

export interface AddonDeckEnvelope {
  id: string
  type: string
}

export interface AddonGeneratedButton
  extends AddonButtonEnvelope, AddonButtonSurfaceContract {
  [key: string]: unknown
}

export interface AddonGeneratedDeck {
  background?: string
  buttons: AddonGeneratedButton[]
  id: string
  name?: string
  process_names?: readonly string[]
}

export interface AddonButtonMethods {
  getActiveDeckId: () => string
  goBack: () => Promise<void> | void
  invalidate: () => void
  navigateToDeck: (
    deckId: string,
    options?: { addToHistory?: boolean },
  ) => Promise<void> | void
  pasteText: (text: string) => Promise<void>
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

export const AddonButtonActionCommandsSchema = z
  .object({
    'double-tap': z.string().min(1),
    hold: z.string().min(1),
    tap: z.string().min(1),
  })
  .partial()
  .strict()

export type AddonButtonActionCommands = z.infer<
  typeof AddonButtonActionCommandsSchema
>

export const AddonButtonActionConfigSchema = z.object({
  commands: AddonButtonActionCommandsSchema.optional(),
})

export const HOLD_ACTION_DELAY_MS = 600
export const DOUBLE_TAP_DELAY_MS = 250

type ActionCommandResolver<TConfig, TPayload> =
  | AddonButtonActionCommands
  | ((
      props: MountedAddonButtonRenderProps<TConfig, TPayload>,
    ) => AddonButtonActionCommands | undefined)

function resolveActionCommands<TConfig, TPayload>(
  commands: ActionCommandResolver<TConfig, TPayload>,
  props: MountedAddonButtonRenderProps<TConfig, TPayload>,
): AddonButtonActionCommands | undefined {
  return typeof commands === 'function' ? commands(props) : commands
}

export function useButtonActionCommand<TConfig, TPayload = unknown>(
  commands: ActionCommandResolver<TConfig, TPayload>,
): Pick<
  MountedAddonButtonDefinition<TConfig, TPayload>,
  'onTap' | 'onDblTap' | 'onHold'
> {
  return {
    onTap: async ({ methods, store, ...rest }) => {
      const props = {
        ...rest,
        methods,
        store,
      } as MountedAddonButtonRenderProps<TConfig, TPayload>
      const resolvedCommands = resolveActionCommands(commands, props)
      if (resolvedCommands?.tap) {
        await methods.runCommand(resolvedCommands.tap)
      }
    },
    onDblTap: async ({ methods, store, ...rest }) => {
      const props = {
        ...rest,
        methods,
        store,
      } as MountedAddonButtonRenderProps<TConfig, TPayload>
      const resolvedCommands = resolveActionCommands(commands, props)
      if (resolvedCommands?.['double-tap']) {
        await methods.runCommand(resolvedCommands['double-tap'])
      }
    },
    onHold: async ({ methods, store, ...rest }) => {
      const props = {
        ...rest,
        methods,
        store,
      } as MountedAddonButtonRenderProps<TConfig, TPayload>
      const resolvedCommands = resolveActionCommands(commands, props)
      if (resolvedCommands?.hold) {
        await methods.runCommand(resolvedCommands.hold)
      }
    },
  }
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

export interface MountedAddonButtonRenderProps<TConfig, TPayload = unknown>
  extends AddonButtonRuntimeProps<TConfig>, AddonButtonRenderState {
  payload?: TPayload
  store: MountedAddonButtonStore
}

export interface MountedAddonButtonDefinition<
  TConfig = unknown,
  TPayload = unknown,
> {
  configSchema: ZodType<TConfig>
  defaultIntervalMs?:
    | number
    | ((
        props: MountedAddonButtonRenderProps<TConfig, TPayload>,
      ) => number | undefined)
  defaultPollIntervalMs?:
    | number
    | ((
        props: MountedAddonButtonRenderProps<TConfig, TPayload>,
      ) => number | undefined)
  defaultRenderIntervalMs?:
    | number
    | ((
        props: MountedAddonButtonRenderProps<TConfig, TPayload>,
      ) => number | undefined)
  dispose?: (
    props: MountedAddonButtonRenderProps<TConfig, TPayload>,
  ) => Promise<void> | void
  onActivate?: (
    props: MountedAddonButtonRenderProps<TConfig, TPayload>,
  ) => Promise<void> | void
  onDeactivate?: (
    props: MountedAddonButtonRenderProps<TConfig, TPayload>,
  ) => Promise<void> | void
  onDblTap?: (
    props: MountedAddonButtonRenderProps<TConfig, TPayload>,
  ) => Promise<void> | void
  onHold?: (
    props: MountedAddonButtonRenderProps<TConfig, TPayload>,
  ) => Promise<void> | void
  onPress?: (
    props: MountedAddonButtonRenderProps<TConfig, TPayload>,
  ) => Promise<void> | void
  onRelease?: (
    props: MountedAddonButtonRenderProps<TConfig, TPayload>,
  ) => Promise<void> | void
  onTap?: (
    props: MountedAddonButtonRenderProps<TConfig, TPayload>,
  ) => Promise<void> | void
  poll?: (
    props: MountedAddonButtonRenderProps<TConfig, TPayload>,
  ) => Promise<TPayload> | TPayload
  refresh?: (
    props: MountedAddonButtonRenderProps<TConfig, TPayload>,
  ) => Promise<void> | void
  render: (
    props: MountedAddonButtonRenderProps<TConfig, TPayload>,
  ) => ReactElement
  type: string
}

export type AddonButtonDefinition<
  TConfig = unknown,
  TPayload = unknown,
> = MountedAddonButtonDefinition<TConfig, TPayload>

const ADDON_BUTTON_OWNER_NAME = Symbol('sireno.addon.buttonOwnerName')

export function getAddonButtonOwnerName(
  definition: AddonButtonDefinition,
): string | undefined {
  return (
    definition as AddonButtonDefinition & { [ADDON_BUTTON_OWNER_NAME]?: string }
  )[ADDON_BUTTON_OWNER_NAME]
}

export function setAddonButtonOwnerName<
  TDefinition extends AddonButtonDefinition,
>(definition: TDefinition, addonName: string): TDefinition {
  Object.defineProperty(definition, ADDON_BUTTON_OWNER_NAME, {
    configurable: true,
    enumerable: false,
    value: addonName,
    writable: false,
  })

  return definition
}

export function defineMountedButton<TConfig, TPayload = unknown>(
  definition: MountedAddonButtonDefinition<TConfig, TPayload>,
): MountedAddonButtonDefinition<TConfig, TPayload> {
  return definition
}

export function ButtonSurface(props: ButtonSurfaceProps): ReactElement {
  return jsx('div', {
    'data-sireno-button-surface': 'true',
    ...(props.full !== undefined
      ? { 'data-sireno-full-surface': props.full ? 'true' : 'false' }
      : {}),
    ...(props.sample_interval_ms !== undefined
      ? {
          'data-sireno-media-sample-interval-ms': String(
            props.sample_interval_ms,
          ),
        }
      : {}),
    children: props.children,
    className: 'contents',
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

    return /^(?:data:|https?:\/\/|file:\/\/)/.test(resolvedAssetPath) ||
      resolvedAssetPath.startsWith('/')
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
  createDecks: (
    options: CreateAddonDeckOptions<TConfig>,
  ) => Record<string, AddonGeneratedDeck>
  type: string
}

export interface SirenoAddon {
  apiVersion: number
  assets?: Record<string, string>
  buttons: readonly AddonButtonDefinition[]
  decks?: readonly AddonDeckDefinition[]
  name: string
}
