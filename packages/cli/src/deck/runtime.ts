import { executeCommand, type CommandExecutionResult } from "../action/executor.js"
import { createPollingScheduler, type PollingScheduler } from "../render/scheduler.js"

import type { ButtonInstance, DeckConfig } from "../core/schemas.js"
import type { StreamDeckKeyEvent } from "../device/stream-deck.js"
import type { DeckButtonProps } from "../render/reconciler.js"

export interface DeckRuntimeOptions {
  deck: DeckConfig
  executeAction?: (command: string) => Promise<CommandExecutionResult>
  executeDisplayCommand?: (command: string) => Promise<CommandExecutionResult>
  onRenderButton?: (button: DeckButtonProps) => Promise<void> | void
  onRenderDeck?: (buttons: DeckButtonProps[]) => Promise<void> | void
  subscribeKeyEvents: (listener: (event: StreamDeckKeyEvent) => void) => () => void
  createScheduler?: (intervalMs: number) => PollingScheduler
  scheduleFeedbackTimeout?: typeof setTimeout
  clearFeedbackTimeout?: typeof clearTimeout
}

export interface DeckRuntime {
  getActiveDeck: () => DeckConfig
  getButton: (keyIndex: number) => ButtonInstance | undefined
  getRenderButtons: () => DeckButtonProps[]
  start: () => void
  stop: () => void
}

interface ButtonRuntimeState {
  currentLabel?: string
  feedbackLabel?: string
  isRunning: boolean
}

export function createDeckRuntime(options: DeckRuntimeOptions): DeckRuntime {
  const buttonsByPosition = new Map<number, ButtonInstance>(
    options.deck.buttons.map((button) => [button.position, button]),
  )
  const buttonStates = new Map<number, ButtonRuntimeState>()
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

  for (const button of options.deck.buttons) {
    buttonStates.set(button.position, {
      currentLabel: button.label,
      isRunning: false,
    })
  }

  function getButtonView(button: ButtonInstance): DeckButtonProps {
    const state = buttonStates.get(button.position)

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

    await options.onRenderDeck?.(options.deck.buttons.map((button) => getButtonView(button)))
  }

  function setFeedbackLabel(keyIndex: number, label: string | undefined): void {
    const state = buttonStates.get(keyIndex)
    if (!state) {
      return
    }

    state.feedbackLabel = label
  }

  function scheduleFeedbackReset(button: ButtonInstance, delayMs: number): void {
    const existingTimer = feedbackTimers.get(button.position)
    if (existingTimer) {
      clearFeedbackTimeout(existingTimer)
    }

    const timer = scheduleFeedbackTimeout(() => {
      feedbackTimers.delete(button.position)
      setFeedbackLabel(button.position, undefined)
      void renderButton(button)
    }, delayMs)

    feedbackTimers.set(button.position, timer)
  }

  async function refreshDisplayCommand(button: ButtonInstance): Promise<void> {
    if (button.display_command === undefined) {
      return
    }

    const result = await executeDisplayCommand(button.display_command)
    const state = buttonStates.get(button.position)
    if (!state) {
      return
    }

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
    const button = buttonsByPosition.get(keyIndex)
    if (!button || button.type !== "action") {
      return
    }

    const state = buttonStates.get(keyIndex)
    if (!state || state.isRunning) {
      return
    }

    state.isRunning = true
    setFeedbackLabel(keyIndex, "...")
    await renderButton(button)

    const result = await executeAction(button.command)
    state.isRunning = false
    setFeedbackLabel(keyIndex, result.failed ? "ERR" : "OK")
    await renderButton(button)
    scheduleFeedbackReset(button, result.failed ? 2_000 : 1_500)
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
      return options.deck
    },
    getButton(keyIndex) {
      return buttonsByPosition.get(keyIndex)
    },
    getRenderButtons() {
      return options.deck.buttons.map((button) => getButtonView(button))
    },
    start() {
      if (unsubscribe) {
        return
      }

      stopped = false
      unsubscribe = options.subscribeKeyEvents(onKeyEvent)
      void renderDeck()

      for (const button of options.deck.buttons) {
        if (button.display_command === undefined) {
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
