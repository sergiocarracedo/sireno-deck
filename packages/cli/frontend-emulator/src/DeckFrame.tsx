import { useRef, useState } from "react";

import type { DeviceModelSpec } from "@sireno-deck-2/cli";

import { dispatchMouseEvent, gestureKindToWsMessage, type GestureMouseEvent } from "./gesture.ts";

export interface DeckFrameProps {
  readonly frontendUrl: string;
  readonly device: DeviceModelSpec;
  readonly deckId: string;
  readonly onGesture?: (msg: {
    deckId: string;
    position: number;
    gesture: "tap" | "dbl-tap" | "hold";
  }) => void;
}

export const DeckFrame = ({
  frontendUrl,
  device,
  deckId,
  onGesture,
}: DeckFrameProps): React.ReactElement => {
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
    <div className="relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 shadow-lg">
      <iframe
        src={frontendUrl}
        className="w-full"
        style={{ aspectRatio: `${columns} / ${Math.ceil(keyCount / columns)}` }}
        title="Deck Preview"
      />
      <div
        data-testid="deck-frame"
        data-deck={deckId}
        data-key-count={keyCount}
        data-columns={columns}
        className="absolute inset-0 grid gap-3 p-4"
        style={{
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gridTemplateRows: `repeat(${Math.ceil(keyCount / columns)}, 1fr)`,
        }}
      >
        {Array.from({ length: keyCount }, (_, i) => {
          const isPressed = pressedIndex === i;
          return (
            <button
              key={i}
              type="button"
              data-testid={`deck-key-${i}`}
              data-key-index={i}
              aria-label={`Key ${i}`}
              aria-pressed={isPressed}
              onMouseDown={() => handleDown(i)}
              onMouseUp={() => handleUp(i)}
              onMouseLeave={(e) => {
                if (e.buttons === 1) handleUp(i);
              }}
              className={[
                "relative overflow-hidden rounded-lg border border-neutral-700",
                "bg-gradient-to-b from-neutral-700 to-neutral-900",
                "shadow-[inset_0_2px_4px_rgba(255,255,255,0.15),inset_0_-2px_4px_rgba(0,0,0,0.4),0_2px_4px_rgba(0,0,0,0.5)]",
                "transition-all duration-75",
                "hover:border-neutral-500 hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(0,0,0,0.4),0_2px_6px_rgba(56,189,248,0.4)]",
                "active:scale-[0.97] active:shadow-[inset_0_2px_6px_rgba(0,0,0,0.5),inset_0_-2px_2px_rgba(0,0,0,0.3),0_1px_2px_rgba(0,0,0,0.6)]",
                isPressed
                  ? "scale-[0.97] border-accent shadow-[inset_0_2px_6px_rgba(0,0,0,0.5),inset_0_-2px_2px_rgba(0,0,0,0.3),0_0_12px_rgba(56,189,248,0.6)]"
                  : "",
              ].join(" ")}
              style={{ aspectRatio: "1" }}
            >
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-transparent" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
