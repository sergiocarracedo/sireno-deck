import { useRef, useState } from "react";

import { BUTTON_SIZE_PX, type DeviceModelSpec } from "@sireno-deck-2/cli";

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

  const iframeUrl = `${frontendUrl}${frontendUrl.includes("?") ? "&" : "?"}device=${device.id}`;

return (
    <div
      className="relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 shadow-lg"
      style={{ width: BUTTON_SIZE_PX * columns, height: BUTTON_SIZE_PX * Math.ceil(keyCount / columns) }}
    >
      <iframe
        src={iframeUrl}
        className="block"
        style={{ width: BUTTON_SIZE_PX * columns, height: BUTTON_SIZE_PX * Math.ceil(keyCount / columns) }}
        title="Deck Preview"
      />
      <div
        data-testid="deck-frame"
        data-deck={deckId}
        data-key-count={keyCount}
        data-columns={columns}
        className="absolute inset-0 grid"
        style={{
          gridTemplateColumns: `repeat(${columns}, ${BUTTON_SIZE_PX}px)`,
          gridTemplateRows: `repeat(${Math.ceil(keyCount / columns)}, ${BUTTON_SIZE_PX}px)`,
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
                "opacity-0 transition-opacity duration-75",
                "hover:opacity-20",
                isPressed ? "opacity-30" : "",
              ].join(" ")}
              style={{ aspectRatio: "1" }}
            />
          );
        })}
      </div>
    </div>
  );
};
