import { executeCommand, type CommandExecutionResult } from "../action/executor.js"
import { createDeckController, type DeckController } from "./controller.js"
import { createPollingScheduler, type PollingScheduler } from "../render/scheduler.js"
import { getCpuMetric, getMemoryMetric, type MetricSnapshot } from "../system/live-metrics.js"

import type { ButtonInstance, CpuButton, DeckConfig, MemoryButton, ToggleButton, ToggleState } from "../core/schemas.js"
import type { StreamDeckKeyEvent } from "../device/stream-deck.js"
import type { DeckButtonProps } from "../render/reconciler.js"

export interface DeckRuntimeOptions {
  getCpuMetric?: () => Promise<MetricSnapshot>
  getMemoryMetric?: () => Promise<MetricSnapshot>
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
  activateCurrentDeck: () => Promise<void>
  getActiveDeck: () => DeckConfig
  getActiveDeckButtons: () => DeckButtonProps[]
  getButton: (keyIndex: number) => ButtonInstance | undefined
  getRenderButtons: () => DeckButtonProps[]
  getReservedBackKeyIndex: () => number
  start: () => void
  stop: () => void
}

interface ButtonRuntimeState {
  currentDisplayValue?: string
  currentIcon?: string
  currentLabel?: string
  currentStateKey?: string
  feedbackLabel?: string
  isRunning: boolean
  progress?: number
  subtitle?: string
  variant?: "default" | "metric" | "toggle"
}

function supportsPolledRefresh(
  button: ButtonInstance,
): button is Extract<ButtonInstance, { display_command?: string; interval_ms?: number }>
  | Extract<ButtonInstance, { status_command?: string; interval_ms?: number }>
  | CpuButton
  | MemoryButton {
  return button.type === "display" || button.type === "action" || button.type === "toggle" || button.type === "cpu" || button.type === "memory"
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
  const getCpuMetricSnapshot = options.getCpuMetric ?? (() => getCpuMetric())
  const getMemoryMetricSnapshot = options.getMemoryMetric ?? (() => getMemoryMetric())
  const createScheduler = options.createScheduler ?? ((intervalMs: number) => createPollingScheduler({ intervalMs }))
  const scheduleFeedbackTimeout = options.scheduleFeedbackTimeout ?? setTimeout
  const clearFeedbackTimeout = options.clearFeedbackTimeout ?? clearTimeout
  const feedbackTimers = new Map<string, ReturnType<typeof setTimeout>>()
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
      currentIcon: button.type === "toggle" ? button.states[0]?.icon : button.icon,
      currentDisplayValue: undefined,
      currentLabel: button.type === "toggle" ? button.states[0]?.label : button.label,
      currentStateKey: button.type === "toggle" ? button.states[0]?.key : undefined,
      isRunning: false,
      progress: undefined,
      subtitle: button.type === "toggle" ? button.states[0]?.key.toUpperCase() : undefined,
      variant: button.type === "toggle" ? "toggle" : button.type === "cpu" || button.type === "memory" ? "metric" : "default",
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

  function getButtonView(button: ButtonInstance, deckId = deckController.getActiveDeckId()): DeckButtonProps {
    const state = getButtonState(deckId, button)

    return {
      keyIndex: button.position,
      ...(state.feedbackLabel !== undefined
        ? { label: state.feedbackLabel }
        : {
            ...(state.currentDisplayValue !== undefined ? { displayValue: state.currentDisplayValue } : {}),
            ...(state.currentIcon !== undefined ? { icon: state.currentIcon } : {}),
            ...(state.currentLabel !== undefined ? { label: state.currentLabel } : {}),
            ...(state.progress !== undefined ? { progress: state.progress } : {}),
            ...(state.subtitle !== undefined ? { subtitle: state.subtitle } : {}),
            ...(state.variant !== undefined ? { variant: state.variant } : {}),
          }),
    }
  }

  async function renderButton(button: ButtonInstance, deckId = deckController.getActiveDeckId()): Promise<void> {
    if (stopped || deckController.getActiveDeckId() !== deckId) {
      return
    }

    await options.onRenderButton?.(getButtonView(button, deckId))
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

  function getToggleState(button: ToggleButton, stateKey: string | undefined): ToggleState {
    return button.states.find((state) => state.key === stateKey) ?? button.states[0]
  }

  function applyToggleState(state: ButtonRuntimeState, button: ToggleButton, stateKey: string | undefined): void {
    const nextState = getToggleState(button, stateKey)

    state.currentIcon = nextState.icon
    state.currentLabel = nextState.label
    state.currentStateKey = nextState.key
    state.subtitle = nextState.key.toUpperCase()
    state.variant = "toggle"
  }

  function scheduleFeedbackReset(button: ButtonInstance, deckId: string, delayMs: number): void {
    const stateKey = getButtonStateKey(deckId, button.position)
    const existingTimer = feedbackTimers.get(stateKey)
    if (existingTimer) {
      clearFeedbackTimeout(existingTimer)
    }

    const timer = scheduleFeedbackTimeout(() => {
      feedbackTimers.delete(stateKey)
      setFeedbackLabel(getButtonState(deckId, button), undefined)
      void renderButton(button, deckId)
    }, delayMs)

    feedbackTimers.set(stateKey, timer)
  }

  async function refreshPolledButton(deckId: string, button: ButtonInstance): Promise<void> {
    if (!supportsPolledRefresh(button)) {
      return
    }

    if ((button.type === "display" || button.type === "action") && button.display_command !== undefined) {
      const result = await executeDisplayCommand(button.display_command)
      const state = getButtonState(deckId, button)

      const nextLabel = result.failed
        ? button.label
        : (result.stdout.split(/\r?\n/)[0]?.trim() || button.label)

      if (state.currentLabel === nextLabel) {
        return
      }

      state.currentLabel = nextLabel
      state.currentDisplayValue = undefined
      state.currentIcon = button.icon
      state.progress = undefined
      state.variant = "default"
      state.subtitle = undefined

      if (!state.feedbackLabel) {
        await renderButton(button, deckId)
      }

      return
    }

    if (button.type === "cpu") {
      const metric = await getCpuMetricSnapshot()
      const state = getButtonState(deckId, button)

      if (state.currentDisplayValue === metric.label && state.progress === metric.percentage) {
        return
      }

      state.currentDisplayValue = metric.label
      state.currentLabel = button.label ?? "CPU"
      state.currentIcon = undefined
      state.progress = metric.percentage
      state.subtitle = button.display_mode === "progress" ? undefined : "TEXT"
      state.variant = "metric"

      if (!state.feedbackLabel) {
        await renderButton(button, deckId)
      }

      return
    }

    if (button.type === "memory") {
      const metric = await getMemoryMetricSnapshot()
      const state = getButtonState(deckId, button)

      if (state.currentDisplayValue === metric.label && state.progress === metric.percentage) {
        return
      }

      state.currentDisplayValue = metric.label
      state.currentLabel = button.label ?? "Memory"
      state.currentIcon = undefined
      state.progress = metric.percentage
      state.subtitle = button.display_mode === "progress" ? undefined : "TEXT"
      state.variant = "metric"

      if (!state.feedbackLabel) {
        await renderButton(button, deckId)
      }

      return
    }

    if (button.type !== "toggle" || button.status_command === undefined) {
      return
    }

    const result = await executeDisplayCommand(button.status_command)
    if (result.failed) {
      return
    }

    const nextStateKey = result.stdout.split(/\r?\n/)[0]?.trim()
    const matchedState = button.states.find((state) => state.key === nextStateKey)
    if (!matchedState) {
      return
    }

    const state = getButtonState(deckId, button)
    if (state.currentStateKey === matchedState.key) {
      return
    }

    applyToggleState(state, button, matchedState.key)

    if (!state.feedbackLabel) {
      await renderButton(button, deckId)
    }
  }

  function stopActiveDeckPolling(): void {
    for (const scheduler of schedulers.splice(0, schedulers.length)) {
      scheduler.stop()
    }
  }

  function startActiveDeckPolling(): void {
    const activeDeckId = deckController.getActiveDeckId()

    stopActiveDeckPolling()

    for (const button of getDeckButtons(deckController.getActiveDeck())) {
      if ((button.type === "display" || button.type === "action") && button.display_command !== undefined) {
        const scheduler = createScheduler(button.interval_ms ?? 500)
        schedulers.push(scheduler)
        scheduler.start([
          {
            id: `${activeDeckId}-button-${button.position}-display`,
            run: async () => {
              await refreshPolledButton(activeDeckId, button)
            },
          },
        ])

        void refreshPolledButton(activeDeckId, button)
        continue
      }

      if (button.type !== "toggle" || button.status_command === undefined) {
        if (button.type === "cpu" || button.type === "memory") {
          const scheduler = createScheduler(button.interval_ms ?? 500)
          schedulers.push(scheduler)
          scheduler.start([
            {
              id: `${activeDeckId}-button-${button.position}-metric`,
              run: async () => {
                await refreshPolledButton(activeDeckId, button)
              },
            },
          ])

          void refreshPolledButton(activeDeckId, button)
        }
        continue
      }

      const scheduler = createScheduler(button.interval_ms ?? 500)
      schedulers.push(scheduler)
      scheduler.start([
        {
          id: `${activeDeckId}-button-${button.position}-status`,
          run: async () => {
            await refreshPolledButton(activeDeckId, button)
          },
        },
      ])

      void refreshPolledButton(activeDeckId, button)
    }
  }

  async function handleTap(keyIndex: number): Promise<void> {
    if (deckController.canGoBack() && keyIndex === reservedBackKeyIndex) {
      stopActiveDeckPolling()
      deckController.goBack()
      startActiveDeckPolling()
      await renderDeck()
      return
    }

    const button = getDeckButtons(deckController.getActiveDeck()).find((candidate) => candidate.position === keyIndex)
    if (!button || (button.type !== "action" && button.type !== "toggle")) {
      if (button?.type === "change-deck") {
        stopActiveDeckPolling()
        deckController.navigateTo(button.target_deck)
        startActiveDeckPolling()
        await renderDeck()
      }
      return
    }

    const deckId = deckController.getActiveDeckId()
    const state = getButtonState(deckId, button)
    if (state.isRunning) {
      return
    }

    state.isRunning = true

    if (button.type === "toggle" && button.status_command === undefined) {
      const currentIndex = button.states.findIndex((candidate) => candidate.key === state.currentStateKey)
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % button.states.length : 0
      applyToggleState(state, button, button.states[nextIndex]?.key)
    }

    setFeedbackLabel(state, "...")
    await renderButton(button, deckId)

    const command = button.type === "toggle"
      ? getToggleState(button, button.status_command === undefined ? state.currentStateKey : state.currentStateKey === undefined ? button.states[0]?.key : button.states[(button.states.findIndex((candidate) => candidate.key === state.currentStateKey) + 1) % button.states.length]?.key).command
      : button.command

    const result = await executeAction(command)
    state.isRunning = false
    setFeedbackLabel(state, result.failed ? "ERR" : "OK")
    await renderButton(button, deckId)
    scheduleFeedbackReset(button, deckId, result.failed ? 2_000 : 1_500)
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
    async activateCurrentDeck() {
      startActiveDeckPolling()
      await renderDeck()
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
      startActiveDeckPolling()
      void renderDeck()
    },
    stop() {
      stopped = true
      pressedKeys.clear()
      unsubscribe?.()
      unsubscribe = null

      stopActiveDeckPolling()

      for (const timer of feedbackTimers.values()) {
        clearFeedbackTimeout(timer)
      }

      feedbackTimers.clear()
    },
  }
}
