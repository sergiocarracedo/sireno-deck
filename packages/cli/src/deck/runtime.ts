import { createElement, isValidElement } from 'react'
import { z } from 'zod'

import { executeCommand, type CommandExecutionResult } from '@/action/executor'
import {
  ButtonSurface,
  DOUBLE_TAP_DELAY_MS,
  getAddonButtonOwnerName,
  HOLD_ACTION_DELAY_MS,
} from '@/addon/api'
import datetimeButtonsAddon from '@/builtin-addons/date-time/index'
import {
  createMountedDomHost,
  renderMountedHostedButtons,
  type HostedButton,
  type MountedDomHost,
} from '@/render/dom-host'
import {
  createPollingScheduler,
  type PollingScheduler,
} from '@/render/scheduler'
import { Icon, Text } from '@/ui/index'
import {
  createRuntimeButtonErrorLogEntry,
  getRuntimeButtonErrorCode,
  type RuntimeButtonErrorKind,
} from '@/util/errors'
import { createDeckController } from './controller'
import { handleSettingsButtonTap, renderSettingsButton } from './settings-deck'
import { OverlayToggleButton } from './system-buttons/overlay-toggle-button'
import { SystemBackButton } from './system-buttons/SystemBackButton'

import type {
  AddonButtonRenderState,
  AddonButtonRuntimeProps,
  AddonButtonStoreScope,
  MountedAddonButtonRenderProps,
  MountedAddonButtonStore,
} from '@/addon/api'
import type { AddonRegistry } from '@/addon/registry'
import type { Theme, ThemeFrameState } from '@/config/theme'
import type { ButtonInstance, DeckConfig, SirenoConfig } from '@/core/schemas'
import type { StreamDeckKeyEvent } from '@/device/stream-deck'
import type { ActiveAppMonitor, ActiveAppSnapshot } from '@/system/active-app'
import { UNKNOWN_HOST_CONTEXT, type HostContext } from '@/system/host-context'
import type { SessionMonitor, SessionSnapshot } from '@/system/session-monitor'
import type { ReactElement } from 'react'
import { getLastPositionSystemButton } from './system-buttons/system-buttons'

interface RuntimeStoreScope {
  clear: () => void
  getSnapshot: () => unknown
  set: (value: unknown) => void
  update: (updater: (snapshot: unknown) => unknown) => void
}

interface RuntimeMountedStoreAccess {
  addon: RuntimeStoreScope
  button: RuntimeStoreScope
}

interface RuntimeMountedButtonState extends AddonButtonRenderState {
  pressed: boolean
}

export interface DeckRuntimeOptions {
  addonRegistry?: AddonRegistry
  config?: SirenoConfig
  deck: DeckConfig
  decks?: Record<string, DeckConfig>
  executeAction?: (command: string) => Promise<CommandExecutionResult>
  hostContext?: HostContext
  keyCount: number
  activeAppMonitor?: ActiveAppMonitor
  lockedDeckId?: string
  onRenderButton?: (button: RuntimeRenderButton) => Promise<void> | void
  onRenderDeck?: (buttons: RuntimeRenderButton[]) => Promise<void> | void
  sessionMonitor?: SessionMonitor
  subscribeKeyEvents: (
    listener: (event: StreamDeckKeyEvent) => void,
  ) => () => void
  createScheduler?: (intervalMs: number) => PollingScheduler
  theme: Theme
}

export interface DeckRuntime {
  activateCurrentDeck: () => Promise<void>
  dismissOverlay: () => void
  getActiveDeck: () => DeckConfig
  getActiveDeckButtons: () => RuntimeRenderButton[]
  getButton: (keyIndex: number) => ButtonInstance | undefined
  getRenderButtons: () => RuntimeRenderButton[]
  getReservedBackKeyIndex: () => number
  getStackSnapshot: () => string[]
  reloadStylesheet: () => void
  requestFullReload: () => void
  restoreStack: (stackSnapshot?: readonly string[]) => Promise<void>
  showTemporaryErrorDeck: (detailLines: readonly string[]) => Promise<void>
  start: () => void
  stop: () => void
  updateAddonRegistry: (registry: AddonRegistry) => void
  getButtonIndexFromLast: (n?: number) => number
}

interface RuntimeButtonHandle {
  button: ButtonInstance
  deckId: string
}

interface RuntimeButtonInstance {
  defaultIntervalMs?: number
  defaultPollIntervalMs?: number
  defaultRenderIntervalMs?: number
  dispose?: () => Promise<void> | void
  onActivate?: () => Promise<void> | void
  onDblTap?: () => Promise<void> | void
  onDeactivate?: () => Promise<void> | void
  onHold?: () => Promise<void> | void
  onPress?: () => Promise<void> | void
  poll?: () => Promise<unknown> | unknown
  onRelease?: () => Promise<void> | void
  onTap?: () => Promise<void> | void
  refresh?: () => Promise<void> | void
  render: () => ReactElement
}

interface RuntimeCadenceConfig {
  poll_interval_ms?: number
  render_interval_ms?: number
}

export interface RuntimeRenderButton {
  background?: string
  content?: ReturnType<typeof ButtonSurface>
  frame_state?: ThemeFrameState
  full?: boolean
  html?: string
  icon?: string
  keyIndex: number
  label?: string
  sample_interval_ms?: number
}

interface RootDomRenderProps {
  full?: boolean
  sample_interval_ms?: number
}

const IMPLICIT_LOCKED_DECK_ID = '__sireno_locked_session__'
const SETTINGS_DECK_ID = 'settings'
const OVERLAY_TOGGLE_TYPE = 'overlay-toggle'
const ACTIVE_APP_DISMISS_WINDOW_MS = 350

export function processNamesMatch(
  declared: readonly string[],
  active: string,
  platform: NodeJS.Platform,
): boolean {
  if (declared.length === 0) return false
  const normalizedActive = (
    platform === 'darwin'
      ? active.replace(/\.app$/i, '')
      : platform === 'win32'
        ? active.replace(/\.exe$/i, '')
        : active
  ).toLowerCase()
  return declared.some((name) =>
    normalizedActive.includes(name.toLowerCase().trim()),
  )
}
const TEMPORARY_RELOAD_ERROR_DECK_ID = '__sireno_reload_error__'
const lockedTimeTileButtonDefinition = datetimeButtonsAddon.buttons.find(
  (button) => button.type === 'locked-time-tile',
)
const temporaryErrorButtonDefinition = {
  configSchema: z.object({
    detailLines: z.array(z.string().min(1)).default([]),
    label: z.string().min(1),
    subtitle: z.string().min(1),
  }),
  render: ({
    button,
    config,
  }: MountedAddonButtonRenderProps<{
    detailLines: string[]
    label: string
    subtitle: string
  }>) =>
    createElement(
      ButtonSurface,
      { full: true },
      createElement(
        'div',
        {
          className: 'flex flex-col items-center justify-center w-full h-full',
          style: { gap: '4px' },
        },
        createElement(Text, { fit: 'wrap' }, config.label),
        createElement(Text, { fit: 'wrap' }, config.subtitle),
        ...config.detailLines.map((line, index) =>
          createElement(
            Text,
            { fit: 'wrap', key: `${button.position}-${index}` },
            line,
          ),
        ),
      ),
    ),
  type: '__runtime_reload_error__',
} satisfies ButtonInstance['definition']

if (!lockedTimeTileButtonDefinition) {
  throw new Error(
    'Bundled locked-time-tile button definition is required for the implicit locked fallback',
  )
}

function cloneHostContext(hostContext: HostContext): HostContext {
  return {
    os: { ...hostContext.os },
    session: { ...hostContext.session },
  }
}

function createImplicitLockedDeck(): DeckConfig {
  const slots = [
    'hour-tens',
    'hour-ones',
    'separator',
    'minute-tens',
    'minute-ones',
  ] as const

  return {
    id: IMPLICIT_LOCKED_DECK_ID,
    name: 'Locked Session',
    buttons: slots.map((slot, index) => ({
      config: {
        slot,
      },
      definition: lockedTimeTileButtonDefinition,
      position: 5 + index,
      type: 'locked-time-tile',
    })),
  }
}

function createImplicitSettingsDeck(): DeckConfig {
  const stubDefinition = {
    configSchema: { parse: (input: unknown) => input },
    defaultRenderIntervalMs: () => Number.POSITIVE_INFINITY,
    type: 'settings-placeholder',
  } as unknown as ButtonInstance['definition']

  const placeholder = (id: string, position: number): ButtonInstance =>
    ({
      config: {},
      definition: stubDefinition,
      id,
      position,
      type: 'settings-placeholder',
    }) as unknown as ButtonInstance
  return {
    buttons: [
      placeholder('brightness-up', 0),
      placeholder('brightness-down', 1),
      placeholder('current-brightness', 2),
      placeholder('logo-version', 3),
    ],
    id: SETTINGS_DECK_ID,
    name: 'Settings',
  }
}

function createTemporaryErrorDeck(detailLines: readonly string[]): DeckConfig {
  return {
    id: TEMPORARY_RELOAD_ERROR_DECK_ID,
    name: 'Config Error',
    buttons: [
      {
        config: {
          detailLines: [...detailLines],
          label: 'Config Error',
          subtitle: 'RELOAD',
        },
        definition: temporaryErrorButtonDefinition,
        position: 0,
        type: temporaryErrorButtonDefinition.type,
      },
    ],
  }
}

function getRootDomRenderProps(rendered: unknown): RootDomRenderProps {
  if (!isValidElement(rendered)) {
    return {}
  }

  const props = rendered.props as RootDomRenderProps | null | undefined
  if (!props) {
    return {}
  }

  return {
    ...(props.full !== undefined ? { full: props.full } : {}),
    ...(props.sample_interval_ms !== undefined
      ? { sample_interval_ms: props.sample_interval_ms }
      : {}),
  }
}

function createRuntimeButtonErrorContent(
  errorCode: string,
  fullSurface?: boolean,
): ReturnType<typeof ButtonSurface> {
  return createElement(
    ButtonSurface,
    fullSurface !== undefined ? { full: fullSurface } : {},
    createElement(
      'div',
      {
        className: 'flex flex-col items-center justify-center w-full h-full',
        style: { gap: '3px' },
      },
      createElement(Icon, {
        name: 'triangle-alert',
        size: 22,
        tone: 'danger',
      }),
      createElement(Text, { tone: 'danger' }, errorCode),
    ),
  )
}

export function createDeckRuntime(options: DeckRuntimeOptions): DeckRuntime {
  const reservedBackKeyIndex = Math.max(0, (options.keyCount ?? 15) - 1)
  const hostContext = cloneHostContext(
    options.hostContext ?? UNKNOWN_HOST_CONTEXT,
  )
  const implicitLockedDeck = createImplicitLockedDeck()
  const implicitSettingsDeck = createImplicitSettingsDeck()
  const runtimeDecks = {
    ...(options.decks ?? { [options.deck.id]: options.deck }),
    [implicitLockedDeck.id]: implicitLockedDeck,
    ...(SETTINGS_DECK_ID in (options.decks ?? {})
      ? {}
      : { [SETTINGS_DECK_ID]: implicitSettingsDeck }),
  }
  const deckController = createDeckController({
    decks: runtimeDecks,
    mainDeckId: options.deck.id,
  })
  const executeAction =
    options.executeAction ??
    ((command: string) => executeCommand({ command, hostContext }))
  const createScheduler =
    options.createScheduler ??
    ((intervalMs: number) => createPollingScheduler({ intervalMs }))
  const instances = new Map<string, RuntimeButtonInstance>()
  const addonStateStore = new Map<string, unknown>()
  const buttonStateStore = new Map<string, unknown>()
  const pressedKeys = new Set<number>()

  interface ButtonGestureState {
    holdTimer?: ReturnType<typeof setTimeout>
    holdTriggered?: boolean
    pendingDblTapTimer?: ReturnType<typeof setTimeout>
  }

  const gestureStates = new Map<string, ButtonGestureState>()

  const renderCache = new Map<string, RuntimeRenderButton>()
  const pollSchedulers = new Map<string, PollingScheduler>()
  const renderSchedulers = new Map<string, PollingScheduler>()
  const payloadStore = new Map<string, unknown>()
  const mountedDeckHosts = new Map<string, MountedDomHost>()
  let unsubscribe: (() => void) | null = null
  let unsubscribeSessionMonitor: (() => void) | null = null
  let activeActivationVersion = 0
  let lockedNavigationSnapshot: string[] | null = null
  let lockModeActive = false
  let stopped = false
  let temporaryErrorDeck: DeckConfig | null = null
  let runningButtonTypes = new Set<string>()
  let requestReloadCallback: (() => void) | null = null
  let overlayDeckId: string | null = null
  let lastBackActionAt = 0

  function getLockedSurfaceDeckId(): string {
    return options.lockedDeckId ?? IMPLICIT_LOCKED_DECK_ID
  }

  function getDisplayDeckId(): string {
    return temporaryErrorDeck?.id ?? deckController.getActiveDeckId()
  }

  function getDisplayDeck(): DeckConfig {
    return temporaryErrorDeck ?? deckController.getActiveDeck()
  }

  function getDeckById(deckId: string): DeckConfig {
    if (temporaryErrorDeck && deckId === temporaryErrorDeck.id) {
      return temporaryErrorDeck
    }

    return runtimeDecks[deckId] ?? options.deck
  }

  function getButtonPositionFromLast(n: number = 0) {
    return options.keyCount - 1 - n
  }

  function syncSessionSnapshot(snapshot: SessionSnapshot): void {
    hostContext.session.capability = snapshot.capability
    hostContext.session.state = snapshot.state
  }

  function getButtonStateKey(deckId: string, keyIndex: number): string {
    return `${deckId}:${keyIndex}`
  }

  function getRuntimeCadenceConfig(
    button: ButtonInstance,
  ): RuntimeCadenceConfig {
    const config = button.config
    if (!config || typeof config !== 'object') {
      return {}
    }

    const cadence = config as RuntimeCadenceConfig

    return {
      ...(typeof cadence.poll_interval_ms === 'number'
        ? { poll_interval_ms: cadence.poll_interval_ms }
        : {}),
      ...(typeof cadence.render_interval_ms === 'number'
        ? { render_interval_ms: cadence.render_interval_ms }
        : {}),
    }
  }

  function getDeckButtons(deck: DeckConfig): ButtonInstance[] {
    const lastPosition = getButtonPositionFromLast()

    const buttons = [...deck.buttons].filter(
      (button) => button.position !== lastPosition,
    )

    return [
      ...buttons,
      getLastPositionSystemButton(
        lastPosition,
        deck,
        overlayDeckId,
        options,
        IMPLICIT_LOCKED_DECK_ID,
        hostContext,
      ),
    ].filter((button): button is ButtonInstance => Boolean(button))
  }

  function getAddonStateKey(button: ButtonInstance): string {
    return getAddonButtonOwnerName(button.definition) ?? button.type
  }

  function invalidateMountedStore(): void {
    void renderDeckSurface(getDisplayDeckId(), activeActivationVersion).catch(
      reportRuntimeError,
    )
  }

  function createRuntimeStoreScope(
    stateStore: Map<string, unknown>,
    stateKey: string,
  ): RuntimeStoreScope {
    return {
      clear: () => {
        stateStore.delete(stateKey)
        invalidateMountedStore()
      },
      getSnapshot: () => stateStore.get(stateKey),
      set: (value) => {
        stateStore.set(stateKey, value)
        invalidateMountedStore()
      },
      update: (updater) => {
        stateStore.set(stateKey, updater(stateStore.get(stateKey)))
        invalidateMountedStore()
      },
    }
  }

  function createMountedStoreAccess(
    deckId: string,
    button: ButtonInstance,
  ): RuntimeMountedStoreAccess {
    return {
      addon: createRuntimeStoreScope(addonStateStore, getAddonStateKey(button)),
      button: createRuntimeStoreScope(
        buttonStateStore,
        getButtonStateKey(deckId, button.position),
      ),
    }
  }

  function createMountedStoreScope(
    scope: RuntimeStoreScope,
  ): AddonButtonStoreScope {
    return {
      clear: () => {
        scope.clear()
      },
      get snapshot() {
        return scope.getSnapshot()
      },
      set: (value) => {
        scope.set(value)
      },
      update: (updater) => {
        scope.update(updater)
      },
    }
  }

  function createMountedButtonStore(
    access: RuntimeMountedStoreAccess,
  ): MountedAddonButtonStore {
    return {
      addon: createMountedStoreScope(access.addon),
      button: createMountedStoreScope(access.button),
    }
  }

  function createMountedRuntimeProps(
    deckId: string,
    button: ButtonInstance,
  ): AddonButtonRuntimeProps<unknown> {
    return {
      button: {
        position: button.position,
        type: button.type,
      },
      config: button.config,
      hostContext,
      methods: createButtonMethods(button, deckId),
      theme: options.theme,
    }
  }

  function createMountedRenderProps(
    runtimeProps: AddonButtonRuntimeProps<unknown>,
    renderState: RuntimeMountedButtonState,
    payload: unknown,
    store: MountedAddonButtonStore,
  ): MountedAddonButtonRenderProps<unknown> {
    return {
      ...runtimeProps,
      frameState: renderState.frameState,
      payload,
      pressed: renderState.pressed,
      store,
    }
  }

  function clearDeckState(deckId: string): void {
    mountedDeckHosts.get(deckId)?.unmount()
    mountedDeckHosts.delete(deckId)

    for (const key of [...instances.keys()]) {
      if (key.startsWith(`${deckId}:`)) {
        void instances.get(key)?.dispose?.()
        instances.delete(key)
      }
    }

    for (const key of [...renderCache.keys()]) {
      if (key.startsWith(`${deckId}:`)) {
        renderCache.delete(key)
      }
    }

    for (const [key, scheduler] of pollSchedulers.entries()) {
      if (key.startsWith(`${deckId}:`)) {
        scheduler.stop()
        pollSchedulers.delete(key)
      }
    }

    for (const [key, scheduler] of renderSchedulers.entries()) {
      if (key.startsWith(`${deckId}:`)) {
        scheduler.stop()
        renderSchedulers.delete(key)
      }
    }

    for (const key of [...payloadStore.keys()]) {
      if (key.startsWith(`${deckId}:`)) {
        payloadStore.delete(key)
      }
    }
  }

  function resolveButtonBackground(
    button: ButtonInstance,
    deckId: string,
  ): string | undefined {
    return (
      button.background ??
      runtimeDecks[deckId]?.background ??
      options.theme.background
    )
  }

  function isActivationCurrent(
    deckId: string,
    activationVersion: number,
  ): boolean {
    return (
      !stopped &&
      getDisplayDeckId() === deckId &&
      activeActivationVersion === activationVersion
    )
  }

  function reportRuntimeError(error: unknown): void {
    console.error(error)
  }

  function buildRenderedButtons(
    deckId = getDisplayDeckId(),
  ): RuntimeRenderButton[] {
    return getDeckButtons(getDeckById(deckId)).map(
      (button) =>
        renderCache.get(getButtonStateKey(deckId, button.position)) ?? {
          keyIndex: button.position,
        },
    )
  }

  async function emitRenderedDeck(
    deckId: string,
    activationVersion = activeActivationVersion,
  ): Promise<void> {
    if (!isActivationCurrent(deckId, activationVersion)) {
      return
    }

    const renderedButtons = buildRenderedButtons(deckId)
    for (const button of renderedButtons) {
      await options.onRenderButton?.(button)
    }

    await options.onRenderDeck?.(renderedButtons)
  }

  function toHostedButton(
    renderedButton: RuntimeRenderButton,
  ): HostedButton | undefined {
    if (!renderedButton.content) {
      return undefined
    }

    return {
      content: renderedButton.content,
      ...(renderedButton.frame_state !== undefined
        ? { frame_state: renderedButton.frame_state }
        : {}),
      ...(renderedButton.full !== undefined
        ? { full: renderedButton.full }
        : {}),
      keyIndex: renderedButton.keyIndex,
      ...(renderedButton.sample_interval_ms !== undefined
        ? { sample_interval_ms: renderedButton.sample_interval_ms }
        : {}),
      theme: options.theme,
    }
  }

  function setRuntimeButtonErrorState(
    button: ButtonInstance,
    deckId: string,
    operation: RuntimeButtonErrorKind,
    error: unknown,
  ): void {
    const errorCode = getRuntimeButtonErrorCode(operation)
    console.error(
      'button runtime error',
      createRuntimeButtonErrorLogEntry(
        {
          buttonPosition: button.position,
          buttonType: button.type,
          deckId,
          errorCode,
          operation,
        },
        error,
      ),
    )

    renderCache.set(getButtonStateKey(deckId, button.position), {
      background: resolveButtonBackground(button, deckId),
      content: createRuntimeButtonErrorContent(errorCode, button.full),
      frame_state: getFrameState(button.position),
      ...(button.full !== undefined ? { full: button.full } : {}),
      keyIndex: button.position,
    })
  }

  async function showRuntimeButtonError(
    button: ButtonInstance,
    deckId: string,
    operation: RuntimeButtonErrorKind,
    error: unknown,
    activationVersion = activeActivationVersion,
  ): Promise<void> {
    setRuntimeButtonErrorState(button, deckId, operation, error)
    await emitRenderedDeck(deckId, activationVersion)
  }

  function getButtonHandle(
    deckId: string,
    keyIndex: number,
  ): RuntimeButtonHandle | undefined {
    const button = getDeckButtons(getDisplayDeck()).find(
      (candidate) => candidate.position === keyIndex,
    )
    if (!button) {
      return undefined
    }

    return { button, deckId }
  }

  function getFrameState(keyIndex: number): ThemeFrameState {
    return pressedKeys.has(keyIndex) ? 'hold' : 'idle'
  }

  function getOrCreateMountedDeckHost(deckId: string): MountedDomHost {
    const existingHost = mountedDeckHosts.get(deckId)
    if (existingHost) {
      return existingHost
    }

    const host = createMountedDomHost()
    mountedDeckHosts.set(deckId, host)
    return host
  }

  function clearMountedDeckHost(deckId: string): void {
    mountedDeckHosts.get(deckId)?.unmount()
    mountedDeckHosts.delete(deckId)
  }

  async function renderMountedDeckButtons(
    deckId: string,
    activationVersion: number,
  ): Promise<RuntimeRenderButton[]> {
    const buttons = getDeckButtons(getDisplayDeck())
    const hostedButtons: HostedButton[] = []

    for (const button of buttons) {
      let renderedButton: RuntimeRenderButton | undefined

      try {
        renderedButton = await renderRuntimeButton(
          button,
          deckId,
          activationVersion,
          false,
        )
      } catch (error) {
        setRuntimeButtonErrorState(button, deckId, 'render', error)
        renderedButton = renderCache.get(
          getButtonStateKey(deckId, button.position),
        )
      }

      const hostedButton = renderedButton
        ? toHostedButton(renderedButton)
        : undefined
      if (hostedButton) {
        hostedButtons.push(hostedButton)
      }
    }

    const snapshotsByKey = new Map(
      renderMountedHostedButtons(
        getOrCreateMountedDeckHost(deckId),
        hostedButtons,
      ).map((snapshot) => [snapshot.keyIndex, snapshot.html]),
    )

    return buttons
      .map((button) =>
        renderCache.get(getButtonStateKey(deckId, button.position)),
      )
      .filter((button): button is RuntimeRenderButton => button !== undefined)
      .map((button) => {
        const description = {
          ...button,
          ...(snapshotsByKey.has(button.keyIndex)
            ? { html: snapshotsByKey.get(button.keyIndex) }
            : {}),
        }

        renderCache.set(getButtonStateKey(deckId, button.keyIndex), description)
        return description
      })
  }

  async function renderRuntimeButton(
    button: ButtonInstance,
    deckId = getDisplayDeckId(),
    activationVersion = activeActivationVersion,
    emitRender = true,
  ): Promise<RuntimeRenderButton | undefined> {
    if (!isActivationCurrent(deckId, activationVersion)) {
      return undefined
    }

    const instance = getOrCreateInstance(deckId, button)
    const rendered = instance.render()
    if (!isValidElement(rendered)) {
      throw new Error('Addon button render output must be a React element')
    }

    const rootDomRenderProps = getRootDomRenderProps(rendered)
    const fullSurface = rootDomRenderProps.full ?? button.full
    const content =
      rendered.type === ButtonSurface
        ? rendered
        : createElement(
            ButtonSurface,
            {
              ...(fullSurface !== undefined ? { full: fullSurface } : {}),
              ...(rootDomRenderProps.sample_interval_ms !== undefined
                ? { sample_interval_ms: rootDomRenderProps.sample_interval_ms }
                : {}),
            },
            rendered,
          )
    const description = {
      background: resolveButtonBackground(button, deckId),
      content,
      frame_state: getFrameState(button.position),
      ...(fullSurface !== undefined ? { full: fullSurface } : {}),
      keyIndex: button.position,
      ...(button.icon !== undefined ? { icon: button.icon } : {}),
      ...(button.label !== undefined ? { label: button.label } : {}),
      ...(rootDomRenderProps.sample_interval_ms !== undefined
        ? { sample_interval_ms: rootDomRenderProps.sample_interval_ms }
        : {}),
    }

    renderCache.set(getButtonStateKey(deckId, button.position), description)
    if (emitRender) {
      await options.onRenderButton?.(description)
    }

    return description
  }

  async function renderDeckSurface(
    deckId = deckController.getActiveDeckId(),
    activationVersion = activeActivationVersion,
  ): Promise<void> {
    if (!isActivationCurrent(deckId, activationVersion)) {
      return
    }

    const latestButtons = await renderMountedDeckButtons(
      deckId,
      activationVersion,
    )

    if (!isActivationCurrent(deckId, activationVersion)) {
      return
    }

    for (const button of latestButtons) {
      await options.onRenderButton?.(button)
    }

    await options.onRenderDeck?.(latestButtons)
  }

  function createButtonMethods(button: ButtonInstance, deckId: string) {
    return {
      getActiveDeckId: () => deckController.getActiveDeckId(),
      goBack: async () => {
        temporaryErrorDeck = null
        const previousDeckId = getDisplayDeckId()
        deckController.goBack()
        await activateDeckSurface(undefined, previousDeckId)
      },
      invalidate: () => {
        void (async () => {
          try {
            const renderedButton = await renderRuntimeButton(button, deckId)
            if (renderedButton?.content !== undefined) {
              await renderDeckSurface(deckId)
            }
          } catch (error) {
            await showRuntimeButtonError(button, deckId, 'invalidate', error)
          }
        })().catch(reportRuntimeError)
      },
      navigateToDeck: async (
        targetDeckId: string,
        options?: { addToHistory?: boolean },
      ) => {
        temporaryErrorDeck = null
        const previousDeckId = getDisplayDeckId()
        try {
          deckController.navigateTo(targetDeckId, {
            push: options?.addToHistory ?? true,
          })
        } catch (error) {
          await showRuntimeButtonError(button, deckId, 'navigateToDeck', error)
          return
        }
        await activateDeckSurface(targetDeckId, previousDeckId)
      },
      pasteText: async (text: string) => {
        const { pasteText: doPaste } = await import('../util/clipboard.js')
        await doPaste(text)
      },
      runCommand: async (command: string) => executeAction(command),
    }
  }

  function instantiateRuntimeButtonInstance(
    deckId: string,
    button: ButtonInstance,
  ): RuntimeButtonInstance {
    if (button.type === 'settings-placeholder') {
      return {
        onTap: async () => {
          await handleSettingsButtonTap(button.id).catch(reportRuntimeError)
        },
        render: () => renderSettingsButton(button.id),
      }
    }

    if (button.type === OVERLAY_TOGGLE_TYPE) {
      return {
        onTap: async () => {
          dismissOverlay()
        },
        render: () => createElement(OverlayToggleButton),
      }
    }

    if (button.type === 'system-back') {
      const currentDeck = runtimeDecks[deckId]
      const tapCommand =
        currentDeck && 'system_back_tap_command' in currentDeck
          ? currentDeck.system_back_tap_command
          : undefined
      const holdCommand =
        currentDeck && 'system_back_hold_command' in currentDeck
          ? currentDeck.system_back_hold_command
          : undefined

      return {
        onHold: async () => {
          if (holdCommand) {
            await executeAction(holdCommand)
            return
          }
          const previousDeckId = getDisplayDeckId()
          deckController.restoreStack([])
          await activateDeckSurface(undefined, previousDeckId)
        },
        onTap: async () => {
          temporaryErrorDeck = null
          const now = Date.now()
          const isDoubleTap =
            now - lastBackActionAt < ACTIVE_APP_DISMISS_WINDOW_MS
          lastBackActionAt = now
          if (isDoubleTap && overlayDeckId !== null) {
            dismissOverlay()
            return
          }
          if (tapCommand) {
            await executeAction(tapCommand)
            return
          }
          const previousDeckId = getDisplayDeckId()
          if (previousDeckId === options.deck.id) {
            if (SETTINGS_DECK_ID in runtimeDecks) {
              try {
                deckController.navigateTo(SETTINGS_DECK_ID, { push: true })
              } catch (error) {
                await showRuntimeButtonError(
                  button,
                  deckId,
                  'navigateToDeck',
                  error,
                )
                return
              }
              await activateDeckSurface(SETTINGS_DECK_ID, previousDeckId)
            }
            return
          }
          deckController.goBack()
          await activateDeckSurface(undefined, previousDeckId)
        },
        render: () => createElement(SystemBackButton),

        // , {
        //     isMainDeck: deckId === options.deck.id,
        //     onNavigateToSettings:
        //       deckId === options.deck.id && SETTINGS_DECK_ID in runtimeDecks
        //         ? () => {
        //             void methods.navigateToDeck(SETTINGS_DECK_ID, {
        //               addToHistory: true,
        //             })
        //           }
        //         : undefined,
        //   }),
      }
    }

    const runtimeProps = createMountedRuntimeProps(deckId, button)
    const store = createMountedButtonStore(
      createMountedStoreAccess(deckId, button),
    )
    const renderState: RuntimeMountedButtonState = {
      frameState: 'idle',
      pressed: false,
    }
    const definition = button.definition
    const buttonStateKey = getButtonStateKey(deckId, button.position)
    const getRenderProps = () =>
      createMountedRenderProps(
        runtimeProps,
        renderState,
        payloadStore.get(buttonStateKey),
        store,
      )

    return {
      ...(typeof definition.defaultIntervalMs === 'number'
        ? { defaultIntervalMs: definition.defaultIntervalMs }
        : {}),
      ...(typeof definition.defaultIntervalMs === 'function'
        ? { defaultIntervalMs: definition.defaultIntervalMs(getRenderProps()) }
        : {}),
      ...(typeof definition.defaultPollIntervalMs === 'number'
        ? { defaultPollIntervalMs: definition.defaultPollIntervalMs }
        : {}),
      ...(typeof definition.defaultPollIntervalMs === 'function'
        ? {
            defaultPollIntervalMs:
              definition.defaultPollIntervalMs(getRenderProps()),
          }
        : {}),
      ...(typeof definition.defaultRenderIntervalMs === 'number'
        ? { defaultRenderIntervalMs: definition.defaultRenderIntervalMs }
        : {}),
      ...(typeof definition.defaultRenderIntervalMs === 'function'
        ? {
            defaultRenderIntervalMs:
              definition.defaultRenderIntervalMs(getRenderProps()),
          }
        : {}),
      ...(definition.dispose
        ? { dispose: () => definition.dispose?.(getRenderProps()) }
        : {}),
      ...(definition.onActivate
        ? { onActivate: () => definition.onActivate?.(getRenderProps()) }
        : {}),
      ...(definition.onDeactivate
        ? { onDeactivate: () => definition.onDeactivate?.(getRenderProps()) }
        : {}),
      ...(definition.onPress
        ? {
            onPress: async () => {
              renderState.pressed = true
              renderState.frameState = 'hold'
              await definition.onPress?.(getRenderProps())
            },
          }
        : {
            onPress: async () => {
              renderState.pressed = true
              renderState.frameState = 'hold'
            },
          }),
      ...(definition.onRelease
        ? {
            onRelease: async () => {
              renderState.pressed = false
              renderState.frameState = 'idle'
              await definition.onRelease?.(getRenderProps())
            },
          }
        : {
            onRelease: async () => {
              renderState.pressed = false
              renderState.frameState = 'idle'
            },
          }),
      ...(definition.onTap
        ? {
            onTap: async () => {
              renderState.frameState = 'tap'
              try {
                await definition.onTap?.(getRenderProps())
              } finally {
                renderState.frameState = renderState.pressed ? 'hold' : 'idle'
              }
            },
          }
        : {}),
      ...(definition.onDblTap
        ? {
            onDblTap: async () => {
              renderState.frameState = 'tap'
              try {
                await definition.onDblTap?.(getRenderProps())
              } finally {
                renderState.frameState = renderState.pressed ? 'hold' : 'idle'
              }
            },
          }
        : {}),
      ...(definition.onHold
        ? {
            onHold: async () => {
              await definition.onHold?.(getRenderProps())
            },
          }
        : {}),
      ...(definition.poll
        ? { poll: () => definition.poll?.(getRenderProps()) }
        : {}),
      ...(definition.refresh
        ? { refresh: () => definition.refresh?.(getRenderProps()) }
        : {}),
      render: () => definition.render(getRenderProps()),
    }
  }

  function getOrCreateInstance(
    deckId: string,
    button: ButtonInstance,
  ): RuntimeButtonInstance {
    const key = getButtonStateKey(deckId, button.position)
    const existingInstance = instances.get(key)
    if (existingInstance) {
      return existingInstance
    }

    const instance = instantiateRuntimeButtonInstance(deckId, button)

    instances.set(key, instance)
    return instance
  }

  async function activateDeckSurface(
    activeDeckId = getDisplayDeckId(),
    previousDeckId = getDisplayDeckId(),
  ): Promise<void> {
    const activationVersion = activeActivationVersion + 1
    activeActivationVersion = activationVersion

    stopActiveDeckPolling()

    if (previousDeckId !== activeDeckId) {
      clearMountedDeckHost(previousDeckId)

      for (const button of getDeckButtons(getDeckById(previousDeckId))) {
        await getOrCreateInstance(previousDeckId, button).onDeactivate?.()
      }
    }

    for (const button of getDeckButtons(getDisplayDeck())) {
      await getOrCreateInstance(activeDeckId, button).onActivate?.()
    }

    await renderDeckSurface(activeDeckId, activationVersion)
    if (!isActivationCurrent(activeDeckId, activationVersion)) {
      return
    }

    startActiveDeckPolling(activeDeckId, activationVersion)
  }

  function stopActiveDeckPolling(): void {
    for (const scheduler of pollSchedulers.values()) {
      scheduler.stop()
    }

    for (const scheduler of renderSchedulers.values()) {
      scheduler.stop()
    }

    pollSchedulers.clear()
    renderSchedulers.clear()
  }

  function startActiveDeckPolling(
    activeDeckId = getDisplayDeckId(),
    activationVersion = activeActivationVersion,
  ): void {
    stopActiveDeckPolling()

    for (const button of getDeckButtons(getDisplayDeck())) {
      const key = getButtonStateKey(activeDeckId, button.position)
      const instance = getOrCreateInstance(activeDeckId, button)
      const cadenceConfig = getRuntimeCadenceConfig(button)
      const pollIntervalMs =
        button.poll_interval_ms ??
        cadenceConfig.poll_interval_ms ??
        button.interval_ms ??
        instance.defaultPollIntervalMs ??
        instance.defaultIntervalMs
      const explicitRenderIntervalMs =
        button.render_interval_ms ??
        cadenceConfig.render_interval_ms ??
        instance.defaultRenderIntervalMs
      const hasPollLoop = Boolean(
        pollIntervalMs && (instance.poll || instance.refresh),
      )
      const renderIntervalMs =
        explicitRenderIntervalMs ?? (!hasPollLoop ? pollIntervalMs : undefined)
      const hasRenderLoop = Boolean(renderIntervalMs)

      if (hasPollLoop && pollIntervalMs) {
        const pollScheduler = createScheduler(pollIntervalMs)
        pollSchedulers.set(key, pollScheduler)
        pollScheduler.start([
          {
            id: `${key}-poll`,
            run: async () => {
              try {
                const latestInstance = getOrCreateInstance(activeDeckId, button)
                if (latestInstance.poll) {
                  payloadStore.set(key, await latestInstance.poll())
                }
                await latestInstance.refresh?.()

                if (!explicitRenderIntervalMs) {
                  const renderedButton = await renderRuntimeButton(
                    button,
                    activeDeckId,
                    activationVersion,
                  )
                  if (renderedButton?.content !== undefined) {
                    await renderDeckSurface(activeDeckId, activationVersion)
                  }
                }
              } catch (error) {
                await showRuntimeButtonError(
                  button,
                  activeDeckId,
                  'refresh',
                  error,
                  activationVersion,
                )
              }
            },
          },
        ])
      }

      if (hasRenderLoop && renderIntervalMs) {
        const renderScheduler = createScheduler(renderIntervalMs)
        renderSchedulers.set(key, renderScheduler)
        renderScheduler.start([
          {
            id: `${key}-render`,
            run: async () => {
              try {
                const renderedButton = await renderRuntimeButton(
                  button,
                  activeDeckId,
                  activationVersion,
                )
                if (renderedButton?.content !== undefined) {
                  await renderDeckSurface(activeDeckId, activationVersion)
                }
              } catch (error) {
                await showRuntimeButtonError(
                  button,
                  activeDeckId,
                  'render',
                  error,
                  activationVersion,
                )
              }
            },
          },
        ])
      }
    }
  }

  async function enterLockMode(): Promise<void> {
    if (lockModeActive) {
      return
    }

    lockModeActive = true
    lockedNavigationSnapshot = deckController.getStackSnapshot()
    const previousDeckId = deckController.getActiveDeckId()
    const lockedDeckId = getLockedSurfaceDeckId()
    deckController.restoreStack([lockedDeckId])
    await activateDeckSurface(lockedDeckId, previousDeckId)
  }

  async function exitLockMode(): Promise<void> {
    if (!lockModeActive) {
      return
    }

    lockModeActive = false
    const previousDeckId = deckController.getActiveDeckId()
    const restoreStack =
      lockedNavigationSnapshot && lockedNavigationSnapshot.length > 0
        ? lockedNavigationSnapshot
        : [options.deck.id]
    lockedNavigationSnapshot = null
    deckController.restoreStack(restoreStack)
    await activateDeckSurface(deckController.getActiveDeckId(), previousDeckId)
  }

  async function handleSessionSnapshot(
    snapshot: SessionSnapshot,
  ): Promise<void> {
    syncSessionSnapshot(snapshot)

    if (snapshot.state === 'locked') {
      await enterLockMode()
      return
    }

    if (snapshot.state === 'unlocked') {
      await exitLockMode()
    }
  }

  function findActiveAppDeckFor(ownerName: string): string | null {
    const platform = process.platform
    for (const [deckId, deck] of Object.entries(runtimeDecks)) {
      if (!deck.process_names || deck.process_names.length === 0) continue
      if (processNamesMatch(deck.process_names, ownerName, platform)) {
        return deckId
      }
    }
    return null
  }

  function handleActiveAppChange(snapshot: ActiveAppSnapshot): void {
    const newOverlay = snapshot
      ? findActiveAppDeckFor(snapshot.ownerName)
      : null
    if (newOverlay === overlayDeckId) return
    overlayDeckId = newOverlay
    void renderDeckSurface(getDisplayDeckId(), activeActivationVersion).catch(
      reportRuntimeError,
    )
  }

  function dismissOverlay(): void {
    if (overlayDeckId === null) return
    overlayDeckId = null
    void renderDeckSurface(getDisplayDeckId(), activeActivationVersion).catch(
      reportRuntimeError,
    )
  }

  async function handlePress(keyIndex: number): Promise<void> {
    const handle = getButtonHandle(deckController.getActiveDeckId(), keyIndex)
    if (!handle) {
      return
    }

    const instance = getOrCreateInstance(handle.deckId, handle.button)

    try {
      await instance.onPress?.()

      if (instance.onHold) {
        const stateKey = getButtonStateKey(
          handle.deckId,
          handle.button.position,
        )
        const gs = gestureStates.get(stateKey)
        if (gs?.holdTimer) clearTimeout(gs.holdTimer)
        const holdTimer = setTimeout(() => {
          void handleHold(handle.deckId, handle.button).catch(
            reportRuntimeError,
          )
        }, HOLD_ACTION_DELAY_MS)
        gestureStates.set(stateKey, { holdTimer, holdTriggered: false })
      }

      await renderRuntimeButton(handle.button, handle.deckId)
      await renderDeckSurface(handle.deckId)
    } catch (error) {
      await showRuntimeButtonError(handle.button, handle.deckId, 'press', error)
    }
  }

  async function handleRelease(keyIndex: number): Promise<void> {
    const handle = getButtonHandle(deckController.getActiveDeckId(), keyIndex)
    if (!handle) {
      return
    }

    const instance = getOrCreateInstance(handle.deckId, handle.button)

    try {
      await instance.onRelease?.()

      const stateKey = getButtonStateKey(handle.deckId, handle.button.position)
      const gs = gestureStates.get(stateKey)
      if (gs?.holdTimer) {
        clearTimeout(gs.holdTimer)
        gestureStates.set(stateKey, {
          ...gs,
          holdTimer: undefined,
          holdTriggered: false,
        })
      }

      await renderRuntimeButton(handle.button, handle.deckId)
      await renderDeckSurface(handle.deckId)
    } catch (error) {
      await showRuntimeButtonError(
        handle.button,
        handle.deckId,
        'release',
        error,
      )
    }
  }

  async function handleTap(keyIndex: number): Promise<void> {
    const handle = getButtonHandle(deckController.getActiveDeckId(), keyIndex)
    if (!handle) {
      return
    }

    try {
      await getOrCreateInstance(handle.deckId, handle.button).onTap?.()
      await renderRuntimeButton(handle.button, handle.deckId)
      await renderDeckSurface(handle.deckId)
    } catch (error) {
      await showRuntimeButtonError(handle.button, handle.deckId, 'tap', error)
    }
  }

  async function handleDblTap(keyIndex: number): Promise<void> {
    const handle = getButtonHandle(deckController.getActiveDeckId(), keyIndex)
    if (!handle) {
      return
    }

    try {
      await getOrCreateInstance(handle.deckId, handle.button).onDblTap?.()
      await renderRuntimeButton(handle.button, handle.deckId)
      await renderDeckSurface(handle.deckId)
    } catch (error) {
      await showRuntimeButtonError(
        handle.button,
        handle.deckId,
        'dbl-tap',
        error,
      )
    }
  }

  async function handleHold(
    deckId: string,
    button: ButtonInstance,
  ): Promise<void> {
    const stateKey = getButtonStateKey(deckId, button.position)
    gestureStates.set(stateKey, {
      holdTimer: undefined,
      holdTriggered: true,
    })

    try {
      await getOrCreateInstance(deckId, button).onHold?.()
    } catch (error) {
      await showRuntimeButtonError(button, deckId, 'hold', error)
    }
  }

  function onKeyEvent(event: StreamDeckKeyEvent): void {
    if (event.type === 'down') {
      pressedKeys.add(event.keyIndex)
      void handlePress(event.keyIndex)
      return
    }

    if (!pressedKeys.has(event.keyIndex)) {
      return
    }

    pressedKeys.delete(event.keyIndex)
    void (async () => {
      await handleRelease(event.keyIndex)

      const handle = getButtonHandle(
        deckController.getActiveDeckId(),
        event.keyIndex,
      )
      if (!handle) return

      const instance = getOrCreateInstance(handle.deckId, handle.button)
      const stateKey = getButtonStateKey(handle.deckId, handle.button.position)
      const gs = gestureStates.get(stateKey)

      if (gs?.holdTriggered) {
        gestureStates.delete(stateKey)
        return
      }

      if (instance.onDblTap) {
        if (gs?.pendingDblTapTimer) {
          clearTimeout(gs.pendingDblTapTimer)
          gestureStates.delete(stateKey)
          await handleDblTap(event.keyIndex)
        } else {
          await new Promise<void>((resolve) => {
            const timer = setTimeout(() => {
              gestureStates.delete(stateKey)
              void handleTap(event.keyIndex)
                .then(resolve)
                .catch(reportRuntimeError)
            }, DOUBLE_TAP_DELAY_MS)
            gestureStates.set(stateKey, { pendingDblTapTimer: timer })
          })
        }
      } else {
        await handleTap(event.keyIndex)
      }
    })().catch(reportRuntimeError)
  }

  return {
    getButtonIndexFromLast(n: number = 0) {
      return getButtonPositionFromLast(n)
    },
    async activateCurrentDeck() {
      await activateDeckSurface()
    },
    dismissOverlay() {
      dismissOverlay()
    },
    getActiveDeck() {
      return deckController.getActiveDeck()
    },
    getActiveDeckButtons() {
      return buildRenderedButtons()
    },
    getButton(keyIndex) {
      return getDeckButtons(getDisplayDeck()).find(
        (button) => button.position === keyIndex,
      )
    },
    getRenderButtons() {
      return buildRenderedButtons()
    },
    getReservedBackKeyIndex() {
      return reservedBackKeyIndex
    },
    getStackSnapshot() {
      return deckController.getStackSnapshot()
    },
    async restoreStack(stackSnapshot) {
      temporaryErrorDeck = null
      const previousDeckId = deckController.getActiveDeckId()
      deckController.restoreStack(stackSnapshot)
      await activateDeckSurface(
        deckController.getActiveDeckId(),
        previousDeckId,
      )
    },
    async showTemporaryErrorDeck(detailLines) {
      const previousDisplayDeckId = getDisplayDeckId()
      clearDeckState(TEMPORARY_RELOAD_ERROR_DECK_ID)
      temporaryErrorDeck = createTemporaryErrorDeck(detailLines)
      await activateDeckSurface(
        TEMPORARY_RELOAD_ERROR_DECK_ID,
        previousDisplayDeckId,
      )
    },
    start() {
      if (unsubscribe) {
        return
      }

      stopped = false
      const initialSessionSnapshot = options.sessionMonitor?.getSnapshot()
      if (initialSessionSnapshot) {
        syncSessionSnapshot(initialSessionSnapshot)

        if (initialSessionSnapshot.state === 'locked') {
          lockModeActive = true
          lockedNavigationSnapshot = null
          deckController.restoreStack([getLockedSurfaceDeckId()])
        }
      }

      unsubscribe = options.subscribeKeyEvents(onKeyEvent)
      unsubscribeSessionMonitor =
        options.sessionMonitor?.subscribe((snapshot) => {
          void handleSessionSnapshot(snapshot).catch(reportRuntimeError)
        }) ?? null
      if (options.activeAppMonitor) {
        options.activeAppMonitor.start(handleActiveAppChange)
      }
      runningButtonTypes = new Set(
        options.addonRegistry.listButtons().map((b) => b.type),
      )
      void activateDeckSurface().catch(reportRuntimeError)
    },
    stop() {
      stopped = true
      pressedKeys.clear()
      unsubscribe?.()
      unsubscribeSessionMonitor?.()
      unsubscribe = null
      unsubscribeSessionMonitor = null

      for (const gs of gestureStates.values()) {
        if (gs.holdTimer) clearTimeout(gs.holdTimer)
        if (gs.pendingDblTapTimer) clearTimeout(gs.pendingDblTapTimer)
      }
      gestureStates.clear()

      stopActiveDeckPolling()
      clearDeckState(TEMPORARY_RELOAD_ERROR_DECK_ID)

      for (const instance of instances.values()) {
        void instance.dispose?.()
      }

      instances.clear()
      addonStateStore.clear()
      buttonStateStore.clear()
      renderCache.clear()
      runningButtonTypes.clear()
    },
    reloadStylesheet() {
      for (const host of mountedDeckHosts.values()) {
        host.reloadStylesheet()
      }
    },
    requestFullReload() {
      requestReloadCallback?.()
    },
    updateAddonRegistry(registry: AddonRegistry) {
      const nextButtonTypes = new Set(registry.listButtons().map((b) => b.type))
      const added = [...nextButtonTypes].filter(
        (t) => !runningButtonTypes.has(t),
      )
      const removed = [...runningButtonTypes].filter(
        (t) => !nextButtonTypes.has(t),
      )
      const isStructural = added.length > 0 || removed.length > 0
      if (isStructural) {
        logger.warn(
          { added, removed },
          'addon registry structural change detected — full restart required for addon additions/removals',
        )
        requestReloadCallback?.()
        return
      }
      runningButtonTypes = nextButtonTypes
      invalidateMountedStore()
    },
  }
}
