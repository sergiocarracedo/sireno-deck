import {
  createGestureDetector,
  type GestureDetector,
  type GestureResult,
} from "@sirenodeck/cli"

export type MouseEventKind = "down" | "up"

export interface GestureMouseEvent {
  readonly kind: MouseEventKind
  readonly keyIndex: number
  readonly timestamp: number
}

export const dispatchMouseEvent = (
  detector: GestureDetector,
  event: GestureMouseEvent,
): void => {
  detector.detect({
    type: event.kind,
    timestamp: event.timestamp,
    keyIndex: event.keyIndex,
  })
}

export const createEmulatorGestureDetector = (
  onGesture: (result: GestureResult) => void,
): GestureDetector => createGestureDetector({ onGesture })

export const gestureKindToWsMessage = (
  result: GestureResult,
  deckId: string,
): {
  type: "button-action"
  deckId: string
  position: number
  gesture: "tap" | "dbl-tap" | "hold"
} => {
  return {
    type: "button-action",
    deckId,
    position: result.keyIndex ?? 0,
    gesture: result.kind,
  }
}
