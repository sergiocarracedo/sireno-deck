import { createElement, isValidElement } from "react"
import { z } from "zod"

import { executeCommand, type CommandExecutionResult } from "../action/executor.js"
import { ButtonSurface, getAddonButtonOwnerName } from "../addon/api.js"
import datetimeButtonsAddon from "../builtin-addons/date-time/index.js"
import { createMountedDomHost, renderMountedHostedButtons, type HostedButton, type MountedDomHost } from "../render/dom-host.js"
import { createPollingScheduler, type PollingScheduler } from "../render/scheduler.js"
import { Text } from "../ui/index.js"
import { createDeckController } from "./controller.js"

import type { AddonRegistry } from "../addon/registry.js"
import type { Theme } from "../config/theme.js"
import type { ButtonInstance, DeckConfig } from "../core/schemas.js"
import type { StreamDeckKeyEvent } from "../device/stream-deck.js"
import type { ThemeFrameState } from "../config/theme.js"
import { UNKNOWN_HOST_CONTEXT, type HostContext } from "../system/host-context.js"
import type { SessionMonitor, SessionSnapshot } from "../system/session-monitor.js"
import type { ReactElement } from "react"

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

export interface DeckRuntimeOptions {
  addonRegistry?: AddonRegistry
  deck: DeckConfig
  decks?: Record<string, DeckConfig>
  executeAction?: (command: string) => Promise<CommandExecutionResult>
  hostContext?: HostContext
  keyCount?: number
  lockedDeckId?: string
  onRenderButton?: (button: RuntimeRenderButton) => Promise<void> | void
  onRenderDeck?: (buttons: RuntimeRenderButton[]) => Promise<void> | void
  sessionMonitor?: SessionMonitor
  subscribeKeyEvents: (listener: (event: StreamDeckKeyEvent) => void) => () => void
  createScheduler?: (intervalMs: number) => PollingScheduler
  theme: Theme
}

export interface DeckRuntime {
  activateCurrentDeck: () => Promise<void>
  getActiveDeck: () => DeckConfig
  getActiveDeckButtons: () => RuntimeRenderButton[]
  getButton: (keyIndex: number) => ButtonInstance | undefined
  getRenderButtons: () => RuntimeRenderButton[]
  getReservedBackKeyIndex: () => number
  getStackSnapshot: () => string[]
  restoreStack: (stackSnapshot?: readonly string[]) => Promise<void>
  showTemporaryErrorDeck: (detailLines: readonly string[]) => Promise<void>
  start: () => void
  stop: () => void
}

interface RuntimeButtonHandle {
  button: ButtonInstance
  deckId: string
}

interface RuntimeButtonInstance {
  defaultIntervalMs?: number
  dispose?: () => Promise<void> | void
  onActivate?: () => Promise<void> | void
  onDeactivate?: () => Promise<void> | void
  onPress?: () => Promise<void> | void
  onRelease?: () => Promise<void> | void
  onTap?: () => Promise<void> | void
  refresh?: () => Promise<void> | void
  render: () => ReactElement
}

export interface RuntimeRenderButton {
  background?: string
  content?: ReturnType<typeof ButtonSurface>
  frame_state?: ThemeFrameState
  full_surface?: boolean
  html?: string
  icon?: string
  keyIndex: number
  label?: string
  sample_interval_ms?: number
}

interface RootDomRenderProps {
  full_surface?: boolean
  sample_interval_ms?: number
}

const IMPLICIT_LOCKED_DECK_ID = "__sireno_locked_session__"
const TEMPORARY_RELOAD_ERROR_DECK_ID = "__sireno_reload_error__"
const lockedTimeTileButtonDefinition = datetimeButtonsAddon.buttons.find((button) => button.type === "locked-time-tile")
const temporaryErrorButtonDefinition = {
  configSchema: z.object({
    detailLines: z.array(z.string().min(1)).default([]),
    label: z.string().min(1),
    subtitle: z.string().min(1),
  }),
  createInstance: ({
    button,
    config,
  }: {
    button: { position: number }
    config: { detailLines: string[]; label: string; subtitle: string }
  }) => ({
    render: () => createElement(
      ButtonSurface,
      { full_surface: true },
      createElement(
        'div',
        {
          className: 'flex flex-col items-center justify-center w-full h-full',
          style: { gap: '4px' },
        },
        createElement(Text, { fit: 'wrap' }, config.label),
        createElement(Text, { fit: 'wrap' }, config.subtitle),
        ...config.detailLines.map((line, index) =>
          createElement(Text, { fit: 'wrap', key: `${button.position}-${index}` }, line),
        ),
      ),
    ),
  }),
  type: "__runtime_reload_error__",
} satisfies ButtonInstance["definition"]

if (!lockedTimeTileButtonDefinition) {
  throw new Error("Bundled locked-time-tile button definition is required for the implicit locked fallback")
}

function cloneHostContext(hostContext: HostContext): HostContext {
  return {
    os: { ...hostContext.os },
    session: { ...hostContext.session },
  }
}

function createImplicitLockedDeck(): DeckConfig {
  const slots = ["hour-tens", "hour-ones", "separator", "minute-tens", "minute-ones"] as const

  return {
    id: IMPLICIT_LOCKED_DECK_ID,
    name: "Locked Session",
    buttons: slots.map((slot, index) => ({
      config: {
        slot,
      },
      definition: lockedTimeTileButtonDefinition,
      position: 5 + index,
      type: "locked-time-tile",
    })),
  }
}

function createTemporaryErrorDeck(detailLines: readonly string[]): DeckConfig {
  return {
    id: TEMPORARY_RELOAD_ERROR_DECK_ID,
    name: "Config Error",
    buttons: [{
      config: {
        detailLines: [...detailLines],
        label: "Config Error",
        subtitle: "RELOAD",
      },
      definition: temporaryErrorButtonDefinition,
      position: 0,
      type: temporaryErrorButtonDefinition.type,
    }],
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
    ...(props.full_surface !== undefined ? { full_surface: props.full_surface } : {}),
    ...(props.sample_interval_ms !== undefined ? { sample_interval_ms: props.sample_interval_ms } : {}),
  }
}

export function createDeckRuntime(options: DeckRuntimeOptions): DeckRuntime {
  const reservedBackKeyIndex = Math.max(0, (options.keyCount ?? 15) - 1)
  const hostContext = cloneHostContext(options.hostContext ?? UNKNOWN_HOST_CONTEXT)
  const implicitLockedDeck = createImplicitLockedDeck()
  const runtimeDecks = {
    ...(options.decks ?? { [options.deck.id]: options.deck }),
    [implicitLockedDeck.id]: implicitLockedDeck,
  }
  const deckController = createDeckController({
    decks: runtimeDecks,
    mainDeckId: options.deck.id,
  })
  const executeAction = options.executeAction ?? ((command: string) => executeCommand({ command, hostContext }))
  const createScheduler = options.createScheduler ?? ((intervalMs: number) => createPollingScheduler({ intervalMs }))
  const instances = new Map<string, RuntimeButtonInstance>()
  const addonStateStore = new Map<string, unknown>()
  const buttonStateStore = new Map<string, unknown>()
  const pressedKeys = new Set<number>()
  const renderCache = new Map<string, RuntimeRenderButton>()
  const schedulers = new Map<string, PollingScheduler>()
  const mountedDeckHosts = new Map<string, MountedDomHost>()
  let unsubscribe: (() => void) | null = null
  let unsubscribeSessionMonitor: (() => void) | null = null
  let activeActivationVersion = 0
  let lockedNavigationSnapshot: string[] | null = null
  let lockModeActive = false
  let stopped = false
  let temporaryErrorDeck: DeckConfig | null = null

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

  function syncSessionSnapshot(snapshot: SessionSnapshot): void {
    hostContext.session.capability = snapshot.capability
    hostContext.session.state = snapshot.state
  }

  function getButtonStateKey(deckId: string, keyIndex: number): string {
    return `${deckId}:${keyIndex}`
  }

  function getDeckButtons(deck: DeckConfig): ButtonInstance[] {
    return deck.buttons
  }

  function getAddonStateKey(button: ButtonInstance): string {
    return getAddonButtonOwnerName(button.definition) ?? button.type
  }

  function invalidateMountedStore(): void {
    void renderDeckSurface(getDisplayDeckId(), activeActivationVersion).catch(reportRuntimeError)
  }

  function createRuntimeStoreScope(stateStore: Map<string, unknown>, stateKey: string): RuntimeStoreScope {
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

  function createMountedStoreAccess(deckId: string, button: ButtonInstance): RuntimeMountedStoreAccess {
    return {
      addon: createRuntimeStoreScope(addonStateStore, getAddonStateKey(button)),
      button: createRuntimeStoreScope(buttonStateStore, getButtonStateKey(deckId, button.position)),
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

    for (const [key, scheduler] of schedulers.entries()) {
      if (key.startsWith(`${deckId}:`)) {
        scheduler.stop()
        schedulers.delete(key)
      }
    }
  }

  function resolveButtonBackground(button: ButtonInstance, deckId: string): string | undefined {
    return button.background ?? runtimeDecks[deckId]?.background ?? options.theme.background
  }

  function isActivationCurrent(deckId: string, activationVersion: number): boolean {
    return !stopped && getDisplayDeckId() === deckId && activeActivationVersion === activationVersion
  }

  function reportRuntimeError(error: unknown): void {
    console.error(error)
  }

  function getButtonHandle(deckId: string, keyIndex: number): RuntimeButtonHandle | undefined {
    const button = getDeckButtons(getDisplayDeck()).find((candidate) => candidate.position === keyIndex)
    if (!button) {
      return undefined
    }

    return { button, deckId }
  }

  function getFrameState(keyIndex: number): ThemeFrameState {
    return pressedKeys.has(keyIndex) ? "hold" : "idle"
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
      const renderedButton = await renderRuntimeButton(button, deckId, activationVersion, false)
      if (!renderedButton?.content) {
        continue
      }

      hostedButtons.push({
        content: renderedButton.content,
        ...(renderedButton.frame_state !== undefined ? { frame_state: renderedButton.frame_state } : {}),
        ...(renderedButton.full_surface !== undefined ? { full_surface: renderedButton.full_surface } : {}),
        keyIndex: renderedButton.keyIndex,
        ...(renderedButton.sample_interval_ms !== undefined ? { sample_interval_ms: renderedButton.sample_interval_ms } : {}),
        theme: options.theme,
      })
    }

    const snapshotsByKey = new Map(
      renderMountedHostedButtons(getOrCreateMountedDeckHost(deckId), hostedButtons).map((snapshot) => [snapshot.keyIndex, snapshot.html]),
    )

    return buttons
      .map((button) => renderCache.get(getButtonStateKey(deckId, button.position)))
      .filter((button): button is RuntimeRenderButton => button !== undefined)
      .map((button) => {
        const description = {
          ...button,
          ...(snapshotsByKey.has(button.keyIndex) ? { html: snapshotsByKey.get(button.keyIndex) } : {}),
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
      throw new Error("Addon button render output must be a React element")
    }

    const rootDomRenderProps = getRootDomRenderProps(rendered)
    const fullSurface = rootDomRenderProps.full_surface ?? button.full_surface
    const content = rendered.type === ButtonSurface
      ? rendered
      : createElement(ButtonSurface, {
          ...(fullSurface !== undefined ? { full_surface: fullSurface } : {}),
          ...(rootDomRenderProps.sample_interval_ms !== undefined ? { sample_interval_ms: rootDomRenderProps.sample_interval_ms } : {}),
        }, rendered)
    const description = {
      background: resolveButtonBackground(button, deckId),
      content,
      frame_state: getFrameState(button.position),
      ...(fullSurface !== undefined ? { full_surface: fullSurface } : {}),
      keyIndex: button.position,
      ...(button.icon !== undefined ? { icon: button.icon } : {}),
      ...(button.label !== undefined ? { label: button.label } : {}),
      ...(rootDomRenderProps.sample_interval_ms !== undefined ? { sample_interval_ms: rootDomRenderProps.sample_interval_ms } : {}),
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

    const latestButtons = await renderMountedDeckButtons(deckId, activationVersion)

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
          const renderedButton = await renderRuntimeButton(button, deckId)
          if (renderedButton?.content !== undefined) {
            await renderDeckSurface(deckId)
          }
        })().catch(reportRuntimeError)
      },
      navigateToDeck: async (targetDeckId: string) => {
        temporaryErrorDeck = null
        const previousDeckId = getDisplayDeckId()
        deckController.navigateTo(targetDeckId)
        await activateDeckSurface(targetDeckId, previousDeckId)
      },
      runCommand: async (command: string) => executeAction(command),
    }
  }

  function instantiateRuntimeButtonInstance(
    deckId: string,
    button: ButtonInstance,
  ): RuntimeButtonInstance {
    // Phase 24 mounted definitions adapt into the legacy createInstance seam so Node keeps one runtime entrypoint.
    return button.definition.createInstance({
      button: {
        position: button.position,
        type: button.type,
      },
      config: button.config,
      hostContext,
      methods: createButtonMethods(button, deckId),
      store: createMountedStoreAccess(deckId, button),
      theme: options.theme,
    } as Parameters<ButtonInstance["definition"]["createInstance"]>[0]) as RuntimeButtonInstance
  }

  function getOrCreateInstance(deckId: string, button: ButtonInstance): RuntimeButtonInstance {
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
    for (const scheduler of schedulers.values()) {
      scheduler.stop()
    }

    schedulers.clear()
  }

  function startActiveDeckPolling(
    activeDeckId = getDisplayDeckId(),
    activationVersion = activeActivationVersion,
  ): void {
    stopActiveDeckPolling()

    for (const button of getDeckButtons(getDisplayDeck())) {
      const intervalMs = button.interval_ms ?? getOrCreateInstance(activeDeckId, button).defaultIntervalMs ?? button.definition.defaultIntervalMs
      if (!intervalMs) {
        continue
      }

      const scheduler = createScheduler(intervalMs)
      const key = getButtonStateKey(activeDeckId, button.position)
      schedulers.set(key, scheduler)
      scheduler.start([
        {
          id: `${key}-refresh`,
          run: async () => {
            const instance = getOrCreateInstance(activeDeckId, button)
            await instance.refresh?.()
            const renderedButton = await renderRuntimeButton(button, activeDeckId, activationVersion)
            if (renderedButton?.content !== undefined) {
              await renderDeckSurface(activeDeckId, activationVersion)
            }
          },
        },
      ])
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
    const restoreStack = lockedNavigationSnapshot && lockedNavigationSnapshot.length > 0
      ? lockedNavigationSnapshot
      : [options.deck.id]
    lockedNavigationSnapshot = null
    deckController.restoreStack(restoreStack)
    await activateDeckSurface(deckController.getActiveDeckId(), previousDeckId)
  }

  async function handleSessionSnapshot(snapshot: SessionSnapshot): Promise<void> {
    syncSessionSnapshot(snapshot)

    if (snapshot.state === "locked") {
      await enterLockMode()
      return
    }

    if (snapshot.state === "unlocked") {
      await exitLockMode()
    }
  }

  async function handlePress(keyIndex: number): Promise<void> {
    const handle = getButtonHandle(deckController.getActiveDeckId(), keyIndex)
    if (!handle) {
      return
    }

    await getOrCreateInstance(handle.deckId, handle.button).onPress?.()
    await renderRuntimeButton(handle.button, handle.deckId)
    await renderDeckSurface(handle.deckId)
  }

  async function handleRelease(keyIndex: number): Promise<void> {
    const handle = getButtonHandle(deckController.getActiveDeckId(), keyIndex)
    if (!handle) {
      return
    }

    await getOrCreateInstance(handle.deckId, handle.button).onRelease?.()
    await renderRuntimeButton(handle.button, handle.deckId)
    await renderDeckSurface(handle.deckId)
  }

  async function handleTap(keyIndex: number): Promise<void> {
    const handle = getButtonHandle(deckController.getActiveDeckId(), keyIndex)
    if (!handle) {
      return
    }

    await getOrCreateInstance(handle.deckId, handle.button).onTap?.()
  }

  function buildActiveDeckButtons(): RuntimeRenderButton[] {
    return getDeckButtons(getDisplayDeck()).map((button) => (
      renderCache.get(getButtonStateKey(getDisplayDeckId(), button.position))
      ?? { keyIndex: button.position }
    ))
  }

  function onKeyEvent(event: StreamDeckKeyEvent): void {
    if (event.type === "down") {
      pressedKeys.add(event.keyIndex)
      void handlePress(event.keyIndex)
      return
    }

    if (!pressedKeys.has(event.keyIndex)) {
      return
    }

    pressedKeys.delete(event.keyIndex)
    void handleRelease(event.keyIndex)
    void handleTap(event.keyIndex)
  }

  return {
    async activateCurrentDeck() {
      await activateDeckSurface()
    },
    getActiveDeck() {
      return deckController.getActiveDeck()
    },
    getActiveDeckButtons() {
      return buildActiveDeckButtons()
    },
    getButton(keyIndex) {
      return getDeckButtons(getDisplayDeck()).find((button) => button.position === keyIndex)
    },
    getRenderButtons() {
      return buildActiveDeckButtons()
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
      await activateDeckSurface(deckController.getActiveDeckId(), previousDeckId)
    },
    async showTemporaryErrorDeck(detailLines) {
      const previousDisplayDeckId = getDisplayDeckId()
      clearDeckState(TEMPORARY_RELOAD_ERROR_DECK_ID)
      temporaryErrorDeck = createTemporaryErrorDeck(detailLines)
      await activateDeckSurface(TEMPORARY_RELOAD_ERROR_DECK_ID, previousDisplayDeckId)
    },
    start() {
      if (unsubscribe) {
        return
      }

      stopped = false
      const initialSessionSnapshot = options.sessionMonitor?.getSnapshot()
      if (initialSessionSnapshot) {
        syncSessionSnapshot(initialSessionSnapshot)

        if (initialSessionSnapshot.state === "locked") {
          lockModeActive = true
          lockedNavigationSnapshot = null
          deckController.restoreStack([getLockedSurfaceDeckId()])
        }
      }

      unsubscribe = options.subscribeKeyEvents(onKeyEvent)
      unsubscribeSessionMonitor = options.sessionMonitor?.subscribe((snapshot) => {
        void handleSessionSnapshot(snapshot).catch(reportRuntimeError)
      }) ?? null
      void activateDeckSurface().catch(reportRuntimeError)
    },
    stop() {
      stopped = true
      pressedKeys.clear()
      unsubscribe?.()
      unsubscribeSessionMonitor?.()
      unsubscribe = null
      unsubscribeSessionMonitor = null

      stopActiveDeckPolling()
      clearDeckState(TEMPORARY_RELOAD_ERROR_DECK_ID)

      for (const instance of instances.values()) {
        void instance.dispose?.()
      }

      instances.clear()
      addonStateStore.clear()
      buttonStateStore.clear()
      renderCache.clear()
    },
  }
}
