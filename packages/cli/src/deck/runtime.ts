import { executeCommand, type CommandExecutionResult } from "../action/executor.js"
import { createPollingScheduler, type PollingScheduler } from "../render/scheduler.js"
import { createDeckController, type DeckController } from "./controller.js"
import { renderDeck } from "../render/reconciler.js"

import type { Theme } from "../config/theme.js"
import type { ButtonInstance, DeckConfig } from "../core/schemas.js"
import type { StreamDeckKeyEvent } from "../device/stream-deck.js"
import type { DeckButtonProps } from "../render/reconciler.js"
import { UNKNOWN_HOST_CONTEXT, type HostContext } from "../system/host-context.js"

export interface DeckRuntimeOptions {
  deck: DeckConfig
  decks?: Record<string, DeckConfig>
  executeAction?: (command: string) => Promise<CommandExecutionResult>
  hostContext?: HostContext
  keyCount?: number
  onRenderButton?: (button: DeckButtonProps) => Promise<void> | void
  onRenderDeck?: (buttons: DeckButtonProps[]) => Promise<void> | void
  subscribeKeyEvents: (listener: (event: StreamDeckKeyEvent) => void) => () => void
  createScheduler?: (intervalMs: number) => PollingScheduler
  theme: Theme
}

export interface DeckRuntime {
  activateCurrentDeck: () => Promise<void>
  getActiveDeck: () => DeckConfig
  getActiveDeckButtons: () => DeckButtonProps[]
  getButton: (keyIndex: number) => ButtonInstance | undefined
  getRenderButtons: () => DeckButtonProps[]
  getReservedBackKeyIndex: () => number
  start: () => void
  stop: () => void
}

interface RuntimeButtonHandle {
  button: ButtonInstance
  deckId: string
}

interface RuntimeButtonInstance {
  dispose?: () => Promise<void> | void
  onActivate?: () => Promise<void> | void
  onDeactivate?: () => Promise<void> | void
  onPress?: () => Promise<void> | void
  onRelease?: () => Promise<void> | void
  onTap?: () => Promise<void> | void
  refresh?: () => Promise<void> | void
  render: () => ReturnType<ButtonInstance["definition"]["createInstance"]>["render"] extends () => infer T ? T : never
}

export function createDeckRuntime(options: DeckRuntimeOptions): DeckRuntime {
  const reservedBackKeyIndex = Math.max(0, (options.keyCount ?? 15) - 1)
  const deckController = createDeckController({
    decks: options.decks ?? { [options.deck.id]: options.deck },
    mainDeckId: options.deck.id,
  })
  const executeAction = options.executeAction ?? ((command: string) => executeCommand({ command }))
  const createScheduler = options.createScheduler ?? ((intervalMs: number) => createPollingScheduler({ intervalMs }))
  const instances = new Map<string, RuntimeButtonInstance>()
  const pressedKeys = new Set<number>()
  const renderCache = new Map<string, DeckButtonProps>()
  const schedulers = new Map<string, PollingScheduler>()
  let unsubscribe: (() => void) | null = null
  let activeActivationVersion = 0
  let stopped = false

  function getButtonStateKey(deckId: string, keyIndex: number): string {
    return `${deckId}:${keyIndex}`
  }

  function getDeckButtons(deck: DeckConfig): ButtonInstance[] {
    return deck.buttons
  }

  function isActivationCurrent(deckId: string, activationVersion: number): boolean {
    return !stopped && deckController.getActiveDeckId() === deckId && activeActivationVersion === activationVersion
  }

  function getButtonHandle(deckId: string, keyIndex: number): RuntimeButtonHandle | undefined {
    const button = getDeckButtons(deckController.getActiveDeck()).find((candidate) => candidate.position === keyIndex)
    if (!button) {
      return undefined
    }

    return { button, deckId }
  }

  async function renderRuntimeButton(
    button: ButtonInstance,
    deckId = deckController.getActiveDeckId(),
    activationVersion = activeActivationVersion,
  ): Promise<DeckButtonProps | undefined> {
    if (!isActivationCurrent(deckId, activationVersion)) {
      return undefined
    }

    const instance = getOrCreateInstance(deckId, button)
    const descriptions = renderDeck(instance.render())
    const description = descriptions[0]
      ? { ...descriptions[0], keyIndex: button.position }
      : { keyIndex: button.position }

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

    const buttons = await Promise.all(
      getDeckButtons(deckController.getActiveDeck()).map((button) => renderRuntimeButton(button, deckId, activationVersion)),
    )

    await options.onRenderDeck?.(buttons.filter((button): button is DeckButtonProps => button !== undefined))
  }

  function createButtonMethods(button: ButtonInstance, deckId: string) {
    return {
      getActiveDeckId: () => deckController.getActiveDeckId(),
      goBack: async () => {
        const previousDeckId = deckController.getActiveDeckId()
        deckController.goBack()
        await activateDeckSurface(undefined, previousDeckId)
      },
      invalidate: () => {
        void renderRuntimeButton(button, deckId)
      },
      navigateToDeck: async (targetDeckId: string) => {
        const previousDeckId = deckController.getActiveDeckId()
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
      hostContext: options.hostContext ?? UNKNOWN_HOST_CONTEXT,
      methods: createButtonMethods(button, deckId),
      theme: options.theme,
    }) as RuntimeButtonInstance

    instances.set(key, instance)
    return instance
  }

  async function activateDeckSurface(
    activeDeckId = deckController.getActiveDeckId(),
    previousDeckId = deckController.getActiveDeckId(),
  ): Promise<void> {
    const activationVersion = activeActivationVersion + 1
    activeActivationVersion = activationVersion

    stopActiveDeckPolling()

    if (previousDeckId !== activeDeckId) {
      for (const button of getDeckButtons(options.decks?.[previousDeckId] ?? options.deck)) {
        await getOrCreateInstance(previousDeckId, button).onDeactivate?.()
      }
    }

    for (const button of getDeckButtons(deckController.getActiveDeck())) {
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
    activeDeckId = deckController.getActiveDeckId(),
    activationVersion = activeActivationVersion,
  ): void {
    stopActiveDeckPolling()

    for (const button of getDeckButtons(deckController.getActiveDeck())) {
      const intervalMs = button.interval_ms ?? button.definition.defaultIntervalMs
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
            await renderRuntimeButton(button, activeDeckId, activationVersion)
          },
        },
      ])
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

  function buildActiveDeckButtons(): DeckButtonProps[] {
    return getDeckButtons(deckController.getActiveDeck()).map((button) => (
      renderCache.get(getButtonStateKey(deckController.getActiveDeckId(), button.position))
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
      return getDeckButtons(deckController.getActiveDeck()).find((button) => button.position === keyIndex)
    },
    getRenderButtons() {
      return buildActiveDeckButtons()
    },
    getReservedBackKeyIndex() {
      return reservedBackKeyIndex
    },
    start() {
      if (unsubscribe) {
        return
      }

      stopped = false
      unsubscribe = options.subscribeKeyEvents(onKeyEvent)
      void activateDeckSurface()
    },
    stop() {
      stopped = true
      pressedKeys.clear()
      unsubscribe?.()
      unsubscribe = null

      stopActiveDeckPolling()

      for (const instance of instances.values()) {
        void instance.dispose?.()
      }

      instances.clear()
      renderCache.clear()
    },
  }
}
