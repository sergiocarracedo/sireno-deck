import { isAbsolute } from 'node:path'
import { pathToFileURL } from 'node:url'

import { jsx } from 'react/jsx-runtime'
import { z } from 'zod'

import type { CSSProperties, ReactElement, ReactNode } from 'react'
import type { ZodType } from 'zod'

import type { CommandExecutionResult } from '../action/executor'
import type { Theme, ThemeFrameState } from '../config/theme'
import type { HostContext } from '../system/host-context.js'

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

const HOLD_ACTION_DELAY_MS = 600
const DOUBLE_TAP_DELAY_MS = 250
const ACTION_COMMAND_STORE_KEY = '__sirenoActionCommand'

interface PendingTapState {
  resolve: () => void
  timer: ReturnType<typeof setTimeout>
}

interface ActionCommandStoreState {
  holdTimer?: ReturnType<typeof setTimeout>
  holdTriggered?: boolean
  pendingTap?: PendingTapState
}

type ActionCommandResolver<TConfig, TPayload> =
  | AddonButtonActionCommands
  | ((
      props: MountedAddonButtonRenderProps<TConfig, TPayload>,
    ) => AddonButtonActionCommands | undefined)

function isSnapshotRecord(snapshot: unknown): snapshot is Record<string, unknown> {
  return typeof snapshot === 'object' && snapshot !== null
}

function readActionCommandState(snapshot: unknown): ActionCommandStoreState {
  if (!isSnapshotRecord(snapshot)) {
    return {}
  }

  return (snapshot[ACTION_COMMAND_STORE_KEY] as ActionCommandStoreState | undefined) ?? {}
}

function updateActionCommandState(
  store: AddonButtonStoreScope,
  updater: (state: ActionCommandStoreState) => ActionCommandStoreState,
): void {
  store.update((snapshot) => {
    const nextState = updater(readActionCommandState(snapshot))

    return {
      ...(isSnapshotRecord(snapshot) ? snapshot : {}),
      [ACTION_COMMAND_STORE_KEY]: nextState,
    }
  })
}

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
  'onPress' | 'onRelease' | 'onTap'
> {
  return {
    onPress: ({ methods, store, ...rest }) => {
      const resolvedCommands = resolveActionCommands(commands, {
        ...rest,
        methods,
        store,
      } as MountedAddonButtonRenderProps<TConfig, TPayload>)

      if (!resolvedCommands?.hold) {
        return
      }

      const currentState = readActionCommandState(store.button.snapshot)
      if (currentState.holdTimer) {
        clearTimeout(currentState.holdTimer)
      }

      const holdTimer = setTimeout(async () => {
        updateActionCommandState(store.button, (state) => ({
          ...state,
          holdTimer: undefined,
          holdTriggered: true,
        }))

        await methods.runCommand(resolvedCommands.hold!)
      }, HOLD_ACTION_DELAY_MS)

      updateActionCommandState(store.button, (state) => ({
        ...state,
        holdTimer,
        holdTriggered: false,
      }))
    },
    onRelease: ({ store }) => {
      const currentState = readActionCommandState(store.button.snapshot)
      if (!currentState.holdTimer) {
        return
      }

      clearTimeout(currentState.holdTimer)
      updateActionCommandState(store.button, (state) => ({
        ...state,
        holdTimer: undefined,
      }))
    },
    onTap: async ({ methods, store, ...rest }) => {
      const props = {
        ...rest,
        methods,
        store,
      } as MountedAddonButtonRenderProps<TConfig, TPayload>
      const resolvedCommands = resolveActionCommands(commands, props)
      const currentState = readActionCommandState(store.button.snapshot)

      if (currentState.holdTriggered) {
        updateActionCommandState(store.button, (state) => ({
          ...state,
          holdTriggered: false,
        }))
        return
      }

      if (currentState.pendingTap && resolvedCommands?.['double-tap']) {
        clearTimeout(currentState.pendingTap.timer)
        updateActionCommandState(store.button, (state) => ({
          ...state,
          pendingTap: undefined,
        }))
        await methods.runCommand(resolvedCommands['double-tap'])
        currentState.pendingTap.resolve()
        return
      }

      if (!resolvedCommands?.['double-tap']) {
        if (resolvedCommands?.tap) {
          await methods.runCommand(resolvedCommands.tap)
        }
        return
      }

      await new Promise<void>((resolve) => {
        const timer = setTimeout(async () => {
          updateActionCommandState(store.button, (state) => ({
            ...state,
            pendingTap: undefined,
          }))

          if (resolvedCommands.tap) {
            await methods.runCommand(resolvedCommands.tap)
          }

          resolve()
        }, DOUBLE_TAP_DELAY_MS)

        updateActionCommandState(store.button, (state) => ({
          ...state,
          pendingTap: { resolve, timer },
        }))
      })
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
