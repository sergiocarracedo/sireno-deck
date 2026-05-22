import { createElement } from "react"
import { z } from "zod"

import { executeCommand, type CommandExecutionResult } from "../action/executor.js"
import { isAddonDomButtonRender, type AddonDomButtonRender } from "../addon/api.js"
import datetimeButtonsAddon from "../builtin-addons/date-time/index.js"
import { createPollingScheduler, type PollingScheduler } from "../render/scheduler.js"
import { createDeckController } from "./controller.js"
import { renderDeck } from "../render/reconciler.js"

import type { AddonRegistry } from "../addon/registry.js"
import type { Theme } from "../config/theme.js"
import type { ButtonInstance, DeckConfig } from "../core/schemas.js"
import type { StreamDeckKeyEvent } from "../device/stream-deck.js"
import type { DeckButtonProps } from "../render/reconciler.js"
import { UNKNOWN_HOST_CONTEXT, type HostContext } from "../system/host-context.js"
import type { SessionMonitor, SessionSnapshot } from "../system/session-monitor.js"

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
  render: () => ReturnType<ButtonInstance["definition"]["createInstance"]>["render"] extends () => infer T ? T : never
}

export interface RuntimeRenderButton extends Partial<DeckButtonProps> {
  content?: AddonDomButtonRender["content"]
  keyIndex: number
  sample_interval_ms?: number
}

const IMPLICIT_LOCKED_DECK_ID = "__sireno_locked_session__"
const TEMPORARY_RELOAD_ERROR_DECK_ID = "__sireno_reload_error__"
const implicitLockedButtonDefinition = datetimeButtonsAddon.buttons.find((button) => button.type === "date-time")
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
    render: () => createElement("deck-button", {
      detailLines: config.detailLines,
      fit: "wrap",
      keyIndex: button.position,
      label: config.label,
      subtitle: config.subtitle,
      variant: "error",
    }),
  }),
  type: "__runtime_reload_error__",
} satisfies ButtonInstance["definition"]

if (!implicitLockedButtonDefinition) {
  throw new Error("Bundled date-time button definition is required for the implicit locked fallback")
}

function cloneHostContext(hostContext: HostContext): HostContext {
  return {
    os: { ...hostContext.os },
    session: { ...hostContext.session },
  }
}

function createImplicitLockedDeck(): DeckConfig {
  return {
    id: IMPLICIT_LOCKED_DECK_ID,
    name: "Locked Session",
    buttons: [{
      config: {
        date_format: "MM/DD/YYYY",
        time_format: "HH:mm:ss",
        variant: "date-time",
      },
      definition: implicitLockedButtonDefinition,
      position: 0,
      type: "date-time",
    }],
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
  const pressedKeys = new Set<number>()
  const renderCache = new Map<string, RuntimeRenderButton>()
  const schedulers = new Map<string, PollingScheduler>()
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

  function clearDeckState(deckId: string): void {
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

  function validatePrimitiveReference(description: DeckButtonProps, field: "style_id" | "wrapper_id"): void {
    const primitiveId = description[field]
    if (!primitiveId) {
      return
    }

    if (!options.addonRegistry) {
      throw new Error(`Cannot validate addon-authored primitive reference '${primitiveId}' without an addon registry`)
    }

    if (field === "wrapper_id") {
      if (options.addonRegistry.getStylePrimitive(primitiveId)) {
        throw new Error(`Addon-authored wrapper reference '${primitiveId}' points to a style primitive`)
      }

      if (!options.addonRegistry.getWrapperPrimitive(primitiveId)) {
        throw new Error(`Unknown addon-authored wrapper primitive '${primitiveId}'`)
      }

      return
    }

    if (options.addonRegistry.getWrapperPrimitive(primitiveId)) {
      throw new Error(`Addon-authored style reference '${primitiveId}' points to a wrapper primitive`)
    }

    if (!options.addonRegistry.getStylePrimitive(primitiveId)) {
      throw new Error(`Unknown addon-authored style primitive '${primitiveId}'`)
    }
  }

  function validateAddonRenderDescription(description: DeckButtonProps): void {
    if (description.full_surface && description.wrapper_id) {
      throw new Error("Addon-authored render output cannot combine `full_surface` with `wrapper_id`")
    }

    validatePrimitiveReference(description, "wrapper_id")
    validatePrimitiveReference(description, "style_id")
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

    return { button, deckId: getDisplayDeckId() }
  }

  async function renderRuntimeButton(
    button: ButtonInstance,
      deckId = getDisplayDeckId(),
      activationVersion = activeActivationVersion,
  ): Promise<RuntimeRenderButton | undefined> {
    if (!isActivationCurrent(deckId, activationVersion)) {
      return undefined
    }

    const instance = getOrCreateInstance(deckId, button)
    const rendered = instance.render()
    const description = isAddonDomButtonRender(rendered)
      ? {
          ...(rendered.fallback ?? {}),
          background: resolveButtonBackground(button, deckId),
          content: rendered.content,
          ...(rendered.full_surface !== undefined ? { full_surface: rendered.full_surface } : button.full_surface !== undefined ? { full_surface: button.full_surface } : {}),
          keyIndex: button.position,
          ...(rendered.sample_interval_ms !== undefined ? { sample_interval_ms: rendered.sample_interval_ms } : {}),
          ...(button.style_id !== undefined ? { style_id: button.style_id } : {}),
          ...(button.wrapper_id !== undefined ? { wrapper_id: button.wrapper_id } : {}),
        }
      : (() => {
          const descriptions = renderDeck(rendered)
          const firstDescription = descriptions[0]

          return firstDescription
            ? {
                ...firstDescription,
                background: firstDescription.background ?? resolveButtonBackground(button, deckId),
                ...(firstDescription.full_surface !== undefined ? {} : button.full_surface !== undefined ? { full_surface: button.full_surface } : {}),
                keyIndex: button.position,
                ...(firstDescription.style_id !== undefined ? {} : button.style_id !== undefined ? { style_id: button.style_id } : {}),
                ...(firstDescription.wrapper_id !== undefined ? {} : button.wrapper_id !== undefined ? { wrapper_id: button.wrapper_id } : {}),
              }
            : {
                background: resolveButtonBackground(button, deckId),
                ...(button.full_surface !== undefined ? { full_surface: button.full_surface } : {}),
                keyIndex: button.position,
                ...(button.style_id !== undefined ? { style_id: button.style_id } : {}),
                ...(button.wrapper_id !== undefined ? { wrapper_id: button.wrapper_id } : {}),
              }
        })()

    if (description.content === undefined) {
      validateAddonRenderDescription(description)
    }

    renderCache.set(getButtonStateKey(deckId, button.position), description)
    await options.onRenderButton?.(description)

    return description
  }

  async function renderDeckSurface(
    deckId = deckController.getActiveDeckId(),
    activationVersion = activeActivationVersion,
  ): Promise<void> {
    if (!isActivationCurrent(deckId, activationVersion)) {
      return
    }

    await Promise.all(
      getDeckButtons(getDisplayDeck()).map((button) => renderRuntimeButton(button, deckId, activationVersion)),
    )

    const latestButtons = getDeckButtons(getDisplayDeck())
      .map((button) => renderCache.get(getButtonStateKey(deckId, button.position)))
      .filter((button): button is RuntimeRenderButton => button !== undefined)

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

  function getOrCreateInstance(deckId: string, button: ButtonInstance): RuntimeButtonInstance {
    const key = getButtonStateKey(deckId, button.position)
    const existingInstance = instances.get(key)
    if (existingInstance) {
      return existingInstance
    }

    // Every runtime instance comes from the registry-backed button definition, and deck type expansion happens before runtime start.
    const instance = button.definition.createInstance({
      button: {
        position: button.position,
        type: button.type,
      },
      config: button.config,
      hostContext,
      methods: createButtonMethods(button, deckId),
      theme: options.theme,
    }) as RuntimeButtonInstance

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
  }

  async function handleRelease(keyIndex: number): Promise<void> {
    const handle = getButtonHandle(deckController.getActiveDeckId(), keyIndex)
    if (!handle) {
      return
    }

    await getOrCreateInstance(handle.deckId, handle.button).onRelease?.()
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
      renderCache.clear()
    },
  }
}
