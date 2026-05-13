import { executeCommand, type CommandExecutionResult } from "../action/executor.js"
import { createDeckController, type DeckController } from "./controller.js"
import { createPollingScheduler, type PollingScheduler } from "../render/scheduler.js"
import { getCpuMetric, getFanMetric, getMemoryMetric, type FanSnapshot, type MetricSnapshot } from "../system/live-metrics.js"

import type { ButtonInstance, CpuButton, DeckConfig, FanButton, MediaButton, MemoryButton, ToggleButton, ToggleState } from "../core/schemas.js"
import type { StreamDeckKeyEvent } from "../device/stream-deck.js"
import type { DeckButtonProps } from "../render/reconciler.js"

export interface DeckRuntimeOptions {
  getCpuMetric?: () => Promise<MetricSnapshot>
  getFanMetric?: () => Promise<FanSnapshot>
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
  detailLines?: string[]
  currentDisplayValue?: string
  currentIcon?: string
  currentLabel?: string
  currentStateKey?: string
  feedbackLabel?: string
  isRunning: boolean
  progress?: number
  subtitle?: string
  variant?: "default" | "fan" | "media" | "metric" | "toggle"
}

function areLinesEqual(left: string[] | undefined, right: string[] | undefined): boolean {
  if (left === right) {
    return true
  }

  if (!left || !right) {
    return left === right
  }

  return left.length === right.length && left.every((line, index) => line === right[index])
}

function getDisplayLines(output: string, limit: number): string[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, limit)
}

function getMediaStatusLabel(output: string): string | undefined {
  const status = output.split(/\r?\n/)[0]?.trim()
  if (!status) {
    return undefined
  }

  return status.toUpperCase()
}

function getButtonIcon(button: ButtonInstance): string | undefined {
  return "icon" in button ? button.icon : undefined
}

function supportsPolledRefresh(
  button: ButtonInstance,
): button is Extract<ButtonInstance, { display_command?: string; interval_ms?: number }>
  | Extract<ButtonInstance, { status_command?: string; interval_ms?: number }>
  | CpuButton
  | FanButton
  | MediaButton
  | MemoryButton {
  return button.type === "display" || button.type === "action" || button.type === "toggle" || button.type === "cpu" || button.type === "fan" || button.type === "media" || button.type === "memory"
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
  const getFanMetricSnapshot = options.getFanMetric ?? (() => getFanMetric())
  const getMemoryMetricSnapshot = options.getMemoryMetric ?? (() => getMemoryMetric())
  const createScheduler = options.createScheduler ?? ((intervalMs: number) => createPollingScheduler({ intervalMs }))
  const scheduleFeedbackTimeout = options.scheduleFeedbackTimeout ?? setTimeout
  const clearFeedbackTimeout = options.clearFeedbackTimeout ?? clearTimeout
  const feedbackTimers = new Map<string, ReturnType<typeof setTimeout>>()
  const schedulers: PollingScheduler[] = []
  let unsubscribe: (() => void) | null = null
  let activeActivationVersion = 0
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

    const nextState: ButtonRuntimeState = {
      currentIcon: button.type === "toggle" ? button.states[0]?.icon : getButtonIcon(button),
      currentDisplayValue: undefined,
      currentLabel: button.type === "toggle" ? button.states[0]?.label : button.label,
      currentStateKey: button.type === "toggle" ? button.states[0]?.key : undefined,
      detailLines: undefined,
      isRunning: false,
      progress: undefined,
      subtitle: button.type === "toggle" ? button.states[0]?.key.toUpperCase() : undefined,
      variant: button.type === "toggle"
        ? "toggle"
        : button.type === "cpu" || button.type === "memory"
          ? "metric"
          : button.type === "fan"
            ? "fan"
            : button.type === "media"
              ? "media"
              : "default",
    }
    buttonStates.set(key, nextState)
    return nextState
  }

  function isActivationCurrent(deckId: string, activationVersion: number): boolean {
    return !stopped && deckController.getActiveDeckId() === deckId && activeActivationVersion === activationVersion
  }

  function resetPolledButtonState(deckId: string): void {
    for (const button of getDeckButtons(deckController.getActiveDeck())) {
      if (!supportsPolledRefresh(button)) {
        continue
      }

      if (button.type === "toggle" && button.status_command === undefined) {
        continue
      }

      buttonStates.delete(getButtonStateKey(deckId, button.position))
    }
  }

  async function primeActiveDeckState(activeDeckId: string, activationVersion: number): Promise<void> {
    const buttons = getDeckButtons(deckController.getActiveDeck())

    await Promise.allSettled(
      buttons.map(async (button) => {
        try {
          await refreshPolledButton(activeDeckId, button, activationVersion)
        } catch {
          // Priming must not block sibling buttons or prevent polling from starting.
        }
      }),
    )
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
            ...(state.detailLines !== undefined ? { detailLines: state.detailLines } : {}),
            ...(state.currentIcon !== undefined ? { icon: state.currentIcon } : {}),
            ...(state.currentLabel !== undefined ? { label: state.currentLabel } : {}),
            ...(state.progress !== undefined ? { progress: state.progress } : {}),
            ...(state.subtitle !== undefined ? { subtitle: state.subtitle } : {}),
            ...(state.variant !== undefined ? { variant: state.variant } : {}),
          }),
    }
  }

  async function renderButton(
    button: ButtonInstance,
    deckId = deckController.getActiveDeckId(),
    activationVersion = activeActivationVersion,
  ): Promise<void> {
    if (!isActivationCurrent(deckId, activationVersion)) {
      return
    }

    await options.onRenderButton?.(getButtonView(button, deckId))
  }

  async function renderDeck(
    deckId = deckController.getActiveDeckId(),
    activationVersion = activeActivationVersion,
  ): Promise<void> {
    if (!isActivationCurrent(deckId, activationVersion)) {
      return
    }

    await options.onRenderDeck?.(buildActiveDeckButtons())
  }

  async function activateDeckSurface(activeDeckId = deckController.getActiveDeckId()): Promise<void> {
    const activationVersion = activeActivationVersion + 1
    activeActivationVersion = activationVersion
    stopActiveDeckPolling()
    resetPolledButtonState(activeDeckId)
    await renderDeck(activeDeckId, activationVersion)

    if (!isActivationCurrent(activeDeckId, activationVersion)) {
      return
    }

    // Polling startup cannot wait on priming, or one slow button delays every other button.
    startActiveDeckPolling(activeDeckId, activationVersion)
    void primeActiveDeckState(activeDeckId, activationVersion)
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

  async function refreshPolledButton(deckId: string, button: ButtonInstance, activationVersion = activeActivationVersion): Promise<void> {
    if (!supportsPolledRefresh(button)) {
      return
    }

    if ((button.type === "display" || button.type === "action") && button.display_command !== undefined) {
      const result = await executeDisplayCommand(button.display_command)
      if (!isActivationCurrent(deckId, activationVersion)) {
        return
      }

      const state = getButtonState(deckId, button)

      const nextLabel = result.failed
        ? button.label
        : (result.stdout.split(/\r?\n/)[0]?.trim() || button.label)

      if (state.currentLabel === nextLabel) {
        return
      }

      state.currentLabel = nextLabel
      state.currentDisplayValue = undefined
      state.currentIcon = getButtonIcon(button)
      state.progress = undefined
      state.detailLines = undefined
      state.variant = "default"
      state.subtitle = undefined

      if (!state.feedbackLabel) {
        await renderButton(button, deckId, activationVersion)
      }

      return
    }

    if (button.type === "cpu") {
      const metric = await getCpuMetricSnapshot()
      if (!isActivationCurrent(deckId, activationVersion)) {
        return
      }

      const state = getButtonState(deckId, button)
      const nextLabel = button.label ?? "CPU"
      const nextProgress = button.display_mode === "progress" ? metric.percentage : undefined

      if (
        state.currentLabel === nextLabel &&
        state.currentDisplayValue === metric.label &&
        state.progress === nextProgress &&
        state.subtitle === undefined
      ) {
        return
      }

      state.currentDisplayValue = metric.label
      state.currentLabel = nextLabel
      state.currentIcon = undefined
      state.progress = nextProgress
      state.detailLines = undefined
      state.subtitle = undefined
      state.variant = "metric"

      if (!state.feedbackLabel) {
        await renderButton(button, deckId, activationVersion)
      }

      return
    }

    if (button.type === "memory") {
      const metric = await getMemoryMetricSnapshot()
      if (!isActivationCurrent(deckId, activationVersion)) {
        return
      }

      const state = getButtonState(deckId, button)
      const nextLabel = button.label ?? "Memory"
      const nextProgress = button.display_mode === "progress" ? metric.percentage : undefined

      if (
        state.currentLabel === nextLabel &&
        state.currentDisplayValue === metric.label &&
        state.progress === nextProgress &&
        state.subtitle === undefined
      ) {
        return
      }

      state.currentDisplayValue = metric.label
      state.currentLabel = nextLabel
      state.currentIcon = undefined
      state.progress = nextProgress
      state.detailLines = undefined
      state.subtitle = undefined
      state.variant = "metric"

      if (!state.feedbackLabel) {
        await renderButton(button, deckId, activationVersion)
      }

      return
    }

    if (button.type === "fan") {
      const metric = await getFanMetricSnapshot()
      if (!isActivationCurrent(deckId, activationVersion)) {
        return
      }

      const state = getButtonState(deckId, button)
      const nextDisplayValue = metric.available ? metric.label : undefined
      const nextDetailLines = metric.available
        ? metric.source ? [metric.source] : []
        : [button.unavailable_label]

      if (
        state.currentLabel === (button.label ?? "Fan") &&
        state.currentDisplayValue === nextDisplayValue &&
        areLinesEqual(state.detailLines, nextDetailLines)
      ) {
        return
      }

      state.currentDisplayValue = nextDisplayValue
      state.currentLabel = button.label ?? "Fan"
      state.currentIcon = undefined
      state.progress = undefined
      state.detailLines = nextDetailLines
      state.subtitle = undefined
      state.variant = "fan"

      if (!state.feedbackLabel) {
        await renderButton(button, deckId, activationVersion)
      }

      return
    }

    if (button.type === "media") {
      const statusResult = await executeDisplayCommand(button.status_command)
      if (!isActivationCurrent(deckId, activationVersion)) {
        return
      }

      const state = getButtonState(deckId, button)
      const nextLabel = button.label ?? "Media"

      if (statusResult.failed) {
        if (
          state.currentLabel === nextLabel
          && state.subtitle === undefined
          && areLinesEqual(state.detailLines, undefined)
        ) {
          return
        }

        state.currentDisplayValue = undefined
        state.currentLabel = nextLabel
        state.currentIcon = undefined
        state.progress = undefined
        state.detailLines = undefined
        state.subtitle = undefined
        state.variant = "media"

        if (!state.feedbackLabel) {
          await renderButton(button, deckId, activationVersion)
        }

        return
      }

      const displayResult = await executeDisplayCommand(button.display_command)
      if (!isActivationCurrent(deckId, activationVersion)) {
        return
      }

      const nextSubtitle = getMediaStatusLabel(statusResult.stdout)
      const nextDetailLines = displayResult.failed ? undefined : getDisplayLines(displayResult.stdout, 3)

      if (
        state.currentLabel === nextLabel &&
        state.subtitle === nextSubtitle &&
        areLinesEqual(state.detailLines, nextDetailLines)
      ) {
        return
      }

      state.currentDisplayValue = undefined
      state.currentLabel = nextLabel
      state.currentIcon = undefined
      state.progress = undefined
      state.detailLines = nextDetailLines
      state.subtitle = nextSubtitle
      state.variant = "media"

      if (!state.feedbackLabel) {
        await renderButton(button, deckId, activationVersion)
      }

      return
    }

    if (button.type !== "toggle" || button.status_command === undefined) {
      return
    }

    const result = await executeDisplayCommand(button.status_command)
    if (!isActivationCurrent(deckId, activationVersion) || result.failed) {
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
      await renderButton(button, deckId, activationVersion)
    }
  }

  function stopActiveDeckPolling(): void {
    for (const scheduler of schedulers.splice(0, schedulers.length)) {
      scheduler.stop()
    }
  }

  function startActiveDeckPolling(
    activeDeckId = deckController.getActiveDeckId(),
    activationVersion = activeActivationVersion,
  ): void {

    stopActiveDeckPolling()

    for (const button of getDeckButtons(deckController.getActiveDeck())) {
      if ((button.type === "display" || button.type === "action") && button.display_command !== undefined) {
        const scheduler = createScheduler(button.interval_ms ?? 500)
        schedulers.push(scheduler)
        scheduler.start([
          {
            id: `${activeDeckId}-button-${button.position}-display`,
            run: async () => {
              await refreshPolledButton(activeDeckId, button, activationVersion)
            },
          },
        ])
        continue
      }

      if (button.type !== "toggle" || button.status_command === undefined) {
        if (button.type === "cpu" || button.type === "memory" || button.type === "fan" || button.type === "media") {
          const scheduler = createScheduler(button.interval_ms ?? 500)
          schedulers.push(scheduler)
          scheduler.start([
            {
              id: `${activeDeckId}-button-${button.position}-metric`,
              run: async () => {
                await refreshPolledButton(activeDeckId, button, activationVersion)
              },
            },
          ])
        }
        continue
      }

      const scheduler = createScheduler(button.interval_ms ?? 500)
      schedulers.push(scheduler)
      scheduler.start([
        {
          id: `${activeDeckId}-button-${button.position}-status`,
          run: async () => {
            await refreshPolledButton(activeDeckId, button, activationVersion)
          },
        },
      ])
    }
  }

  async function handleTap(keyIndex: number): Promise<void> {
    if (deckController.canGoBack() && keyIndex === reservedBackKeyIndex) {
      deckController.goBack()
      await activateDeckSurface()
      return
    }

    const button = getDeckButtons(deckController.getActiveDeck()).find((candidate) => candidate.position === keyIndex)
    if (!button || (button.type !== "action" && button.type !== "media" && button.type !== "toggle")) {
      if (button?.type === "change-deck") {
        deckController.navigateTo(button.target_deck)
        await activateDeckSurface()
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

      for (const timer of feedbackTimers.values()) {
        clearFeedbackTimeout(timer)
      }

      feedbackTimers.clear()
    },
  }
}
