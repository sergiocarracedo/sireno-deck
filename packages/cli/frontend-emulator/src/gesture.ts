import { nextGesture, type GestureEvent, type GestureResult } from "@sireno-deck-2/cli";

export type MouseEventKind = "down" | "up";

export interface GestureMouseEvent {
  readonly kind: MouseEventKind;
  readonly keyIndex: number;
  readonly timestamp: number;
}

const toCore = (event: GestureMouseEvent): GestureEvent => ({
  type: event.kind,
  timestamp: event.timestamp,
  keyIndex: event.keyIndex,
});

export const dispatchMouseEvent = (
  buffer: ReadonlyArray<GestureMouseEvent>,
  newEvent: GestureMouseEvent,
): { buffer: GestureMouseEvent[]; result: GestureResult | null } => {
  const core: GestureEvent = toCore(newEvent);
  const coreBuffer: GestureEvent[] = buffer.map(toCore);
  const result = nextGesture([...coreBuffer, core]);
  return { buffer: [...buffer, newEvent], result };
};

export const gestureKindToWsMessage = (
  result: GestureResult,
  deckId: string,
): {
  type: "button-action";
  deckId: string;
  position: number;
  gesture: "tap" | "dbl-tap" | "hold";
} => {
  return {
    type: "button-action",
    deckId,
    position: result.keyIndex ?? 0,
    gesture: result.kind,
  };
};
