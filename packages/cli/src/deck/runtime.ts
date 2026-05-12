import { executeCommand, type CommandExecutionResult } from "../action/executor.js"

import type { ButtonInstance, DeckConfig } from "../core/schemas.js"
import type { StreamDeckKeyEvent } from "../device/stream-deck.js"

export interface DeckRuntimeOptions {
  deck: DeckConfig
  executeAction?: (command: string) => Promise<CommandExecutionResult>
  subscribeKeyEvents: (listener: (event: StreamDeckKeyEvent) => void) => () => void
}

export interface DeckRuntime {
  getActiveDeck: () => DeckConfig
  getButton: (keyIndex: number) => ButtonInstance | undefined
  start: () => void
  stop: () => void
}

export function createDeckRuntime(options: DeckRuntimeOptions): DeckRuntime {
  const buttonsByPosition = new Map<number, ButtonInstance>(
    options.deck.buttons.map((button) => [button.position, button]),
  )
  const pressedKeys = new Set<number>()
  const executeAction = options.executeAction ?? ((command: string) => executeCommand({ command }))
  let unsubscribe: (() => void) | null = null

  async function handleTap(keyIndex: number): Promise<void> {
    const button = buttonsByPosition.get(keyIndex)
    if (!button || button.type !== "action") {
      return
    }

    await executeAction(button.command)
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
    start() {
      if (unsubscribe) {
        return
      }

      unsubscribe = options.subscribeKeyEvents(onKeyEvent)
    },
    stop() {
      pressedKeys.clear()
      unsubscribe?.()
      unsubscribe = null
    },
  }
}
