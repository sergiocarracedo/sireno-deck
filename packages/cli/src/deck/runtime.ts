import { executeCommand, type CommandExecutionResult } from "../action/executor.js"
import { createDeckController, type DeckController } from "./controller.js"
import { createPollingScheduler, type PollingScheduler } from "../render/scheduler.js"

import type { ButtonInstance, DeckConfig } from "../core/schemas.js"
import type { StreamDeckKeyEvent } from "../device/stream-deck.js"
import type { DeckButtonProps } from "../render/reconciler.js"

export interface DeckRuntimeOptions {
  deck: DeckConfig
  decks?: Record<string, DeckConfig>
  executeAction?: (command: string) => Promise<CommandExecutionResult>
  executeDisplayCommand?: (command: string) => Promise<CommandExecutionResult>
  keyCount?: number
  onRenderButton?: (button: DeckButtonProps) => Promise<void> | void
  onRenderDeck?: (buttons: DeckButtonProps[]) => Promise<void> | void
  subscribeKeyEvents: (listener: (event: StreamDeckKeyEvent) => void) => () => void
  createScheduler?: (intervalMs: number) => PollingScheduler
  scheduleFeedbackTimeout?: typeof setTimeout
  clearFeedbackTimeout?: typeof clearTimeout
}

export interface DeckRuntime {
  getActiveDeck: () => DeckConfig
  getActiveDeckButtons: () => DeckButtonProps[]
  getButton: (keyIndex: number) => ButtonInstance | undefined
  getRenderButtons: () => DeckButtonProps[]
  getReservedBackKeyIndex: () => number
  start: () => void
  stop: () => void
}

interface ButtonRuntimeState {
  currentLabel?: string
  feedbackLabel?: string
  isRunning: boolean
}

function supportsDisplayCommand(
  button: ButtonInstance,
): button is Extract<ButtonInstance, { display_command?: string; interval_ms?: number }> {
  return button.type === "display" || button.type === "action"
}

export function createDeckRuntime(options: DeckRuntimeOptions): DeckRuntime {
  const reservedBackKeyIndex = Math.max(0, (options.keyCount ?? 15) - 1)
  const deckController = createDeckController({
    decks: options.decks ?? { [options.deck.id]: options.deck },
    mainDeckId: options.deck.id,
  })
  const buttonStates = new Map<string, ButtonRuntimeState>()
  const pressedKeys = new Set<number>()
  const executeAction = options.executeAction ?? ((command: string) => executeCommand({ command }))
  const executeDisplayCommand = options.executeDisplayCommand ?? executeAction
  const createScheduler = options.createScheduler ?? ((intervalMs: number) => createPollingScheduler({ intervalMs }))
  const scheduleFeedbackTimeout = options.scheduleFeedbackTimeout ?? setTimeout
  const clearFeedbackTimeout = options.clearFeedbackTimeout ?? clearTimeout
  const feedbackTimers = new Map<number, ReturnType<typeof setTimeout>>()
  const schedulers: PollingScheduler[] = []
  let unsubscribe: (() => void) | null = null
  let stopped = false

  function getButtonStateKey(deckId: string, keyIndex: number): string {
    return `${deckId}:${keyIndex}`
  }

  function getDeckButtons(deck: DeckConfig): ButtonInstance[] {
    return deck.buttons.filter((button) => {
      if (!deckController.canGoBack()) {
        return true
      }

      return button.position !== reservedBackKeyIndex
    })
  }

  function getButtonState(deckId: string, button: ButtonInstance): ButtonRuntimeState {
    const key = getButtonStateKey(deckId, button.position)
    const existingState = buttonStates.get(key)
    if (existingState) {
      return existingState
    }

    const nextState = {
      currentLabel: button.label,
      isRunning: false,
    }
    buttonStates.set(key, nextState)
    return nextState
  }

  function getBackButtonView(): DeckButtonProps {
    return {
      keyIndex: reservedBackKeyIndex,
      label: "Back",
    }
  }

  function getButtonView(button: ButtonInstance): DeckButtonProps {
    const state = getButtonState(deckController.getActiveDeckId(), button)

    return {
      icon: state?.feedbackLabel ? undefined : button.icon,
      keyIndex: button.position,
      label: state?.feedbackLabel ?? state?.currentLabel ?? button.label,
    }
  }

  async function renderButton(button: ButtonInstance): Promise<void> {
    if (stopped) {
      return
    }

    await options.onRenderButton?.(getButtonView(button))
  }

  async function renderDeck(): Promise<void> {
    if (stopped) {
      return
    }

    await options.onRenderDeck?.(buildActiveDeckButtons())
  }

  function setFeedbackLabel(state: ButtonRuntimeState, label: string | undefined): void {
    state.feedbackLabel = label
  }

  function scheduleFeedbackReset(button: ButtonInstance, delayMs: number): void {
    const existingTimer = feedbackTimers.get(button.position)
    if (existingTimer) {
      clearFeedbackTimeout(existingTimer)
    }

    const timer = scheduleFeedbackTimeout(() => {
      feedbackTimers.delete(button.position)
      setFeedbackLabel(getButtonState(deckController.getActiveDeckId(), button), undefined)
      void renderButton(button)
    }, delayMs)

    feedbackTimers.set(button.position, timer)
  }

  async function refreshDisplayCommand(button: ButtonInstance): Promise<void> {
    if (!supportsDisplayCommand(button) || button.display_command === undefined) {
      return
    }

    const result = await executeDisplayCommand(button.display_command)
    const state = getButtonState(deckController.getActiveDeckId(), button)

    const nextLabel = result.failed
      ? button.label
      : (result.stdout.split(/\r?\n/)[0]?.trim() || button.label)

    if (state.currentLabel === nextLabel) {
      return
    }

    state.currentLabel = nextLabel

    if (!state.feedbackLabel) {
      await renderButton(button)
    }
  }

  async function handleTap(keyIndex: number): Promise<void> {
    if (deckController.canGoBack() && keyIndex === reservedBackKeyIndex) {
      deckController.goBack()
      await renderDeck()
      return
    }

    const button = getDeckButtons(deckController.getActiveDeck()).find((candidate) => candidate.position === keyIndex)
    if (!button || button.type !== "action") {
      if (button?.type === "change-deck") {
        deckController.navigateTo(button.target_deck)
        await renderDeck()
      }
      return
    }

    const state = getButtonState(deckController.getActiveDeckId(), button)
    if (state.isRunning) {
      return
    }

    state.isRunning = true
    setFeedbackLabel(state, "...")
    await renderButton(button)

    const result = await executeAction(button.command)
    state.isRunning = false
    setFeedbackLabel(state, result.failed ? "ERR" : "OK")
    await renderButton(button)
    scheduleFeedbackReset(button, result.failed ? 2_000 : 1_500)
  }

  function buildActiveDeckButtons(): DeckButtonProps[] {
    const buttons = getDeckButtons(deckController.getActiveDeck()).map((button) => getButtonView(button))

    if (!deckController.canGoBack()) {
      return buttons
    }

    return [...buttons, getBackButtonView()]
  }

  function onKeyEvent(event: StreamDeckKeyEvent): void {
    if (event.type === "down") {
      pressedKeys.add(event.keyIndex)
      return
    }

    if (!pressedKeys.has(event.keyIndex)) {
      return
    }

    pressedKeys.delete(event.keyIndex)
    void handleTap(event.keyIndex)
  }

  return {
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
      void renderDeck()

      for (const button of getDeckButtons(deckController.getActiveDeck())) {
        if (!supportsDisplayCommand(button) || button.display_command === undefined) {
          continue
        }

        const scheduler = createScheduler(button.interval_ms ?? 500)
        schedulers.push(scheduler)
        scheduler.start([
          {
            id: `button-${button.position}-display`,
            run: async () => {
              await refreshDisplayCommand(button)
            },
          },
        ])

        void refreshDisplayCommand(button)
      }
    },
    stop() {
      stopped = true
      pressedKeys.clear()
      unsubscribe?.()
      unsubscribe = null

      for (const scheduler of schedulers.splice(0, schedulers.length)) {
        scheduler.stop()
      }

      for (const timer of feedbackTimers.values()) {
        clearFeedbackTimeout(timer)
      }

      feedbackTimers.clear()
    },
  }
}
