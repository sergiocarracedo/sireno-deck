import { useRef, useState } from "react";

import type { DeviceModelSpec } from "@sireno-deck-2/cli";

import { dispatchMouseEvent, gestureKindToWsMessage, type GestureMouseEvent } from "./gesture.ts";

export interface DeckFrameProps {
  readonly device: DeviceModelSpec;
  readonly deckId: string;
  readonly onGesture?: (msg: {
    deckId: string;
    position: number;
    gesture: "tap" | "dbl-tap" | "hold";
  }) => void;
}

export const DeckFrame = ({ device, deckId, onGesture }: DeckFrameProps): React.ReactElement => {
  const { columns, keyCount } = device;
  const bufferRef = useRef<GestureMouseEvent[]>([]);
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);

  const handleDown = (keyIndex: number): void => {
    bufferRef.current = [...bufferRef.current, { kind: "down", keyIndex, timestamp: Date.now() }];
    setPressedIndex(keyIndex);
  };

  const handleUp = (keyIndex: number): void => {
    const { buffer, result } = dispatchMouseEvent(bufferRef.current, {
      kind: "up",
      keyIndex,
      timestamp: Date.now(),
    });
    bufferRef.current = buffer;
    setPressedIndex(null);
    if (result !== null && onGesture !== undefined) {
      onGesture(gestureKindToWsMessage(result, deckId));
    }
  };

  return (
    <div
      data-testid="deck-frame"
      data-deck={deckId}
      data-key-count={keyCount}
      data-columns={columns}
      className="grid gap-2 rounded-xl border border-neutral-800 bg-neutral-900 p-4 shadow-lg"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(64px, 96px))` }}
    >
      {Array.from({ length: keyCount }, (_, i) => (
        <button
          key={i}
          type="button"
          data-testid={`deck-key-${i}`}
          data-key-index={i}
          aria-label={`Key ${i}`}
          aria-pressed={pressedIndex === i}
          onMouseDown={() => handleDown(i)}
          onMouseUp={() => handleUp(i)}
          onMouseLeave={(e) => {
            if (e.buttons === 1) handleUp(i);
          }}
          className={
            "aspect-square rounded border text-xs transition " +
            (pressedIndex === i
              ? "border-blue-400 bg-blue-900/40 text-blue-100"
              : "border-neutral-700 bg-neutral-800 text-neutral-500 hover:border-blue-500 hover:bg-neutral-700")
          }
        >
          {i}
        </button>
      ))}
    </div>
  );
};
