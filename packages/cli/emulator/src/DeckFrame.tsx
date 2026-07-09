import { useEffect, useRef, useState } from "react"

import { BUTTON_SIZE_PX, type DeviceModelSpec } from "@sireno-deck/cli"

import {
  createEmulatorGestureDetector,
  dispatchMouseEvent,
  gestureKindToWsMessage,
  type GestureDetector,
} from "./gesture"

export interface DeckFrameProps {
  readonly frontendUrl: string
  readonly device: DeviceModelSpec
  readonly deckId: string
  readonly onGesture?: (msg: {
    deckId: string
    position: number
    gesture: "tap" | "dbl-tap" | "hold"
  }) => void
}

export const DeckFrame = ({
  frontendUrl,
  device,
  deckId,
  onGesture,
}: DeckFrameProps): React.ReactElement => {
  const { columns, keyCount } = device
  const detectorRef = useRef<GestureDetector | null>(null)
  const [pressedIndex, setPressedIndex] = useState<number | null>(null)

  useEffect(() => {
    const detector = createEmulatorGestureDetector((result) => {
      onGesture?.(gestureKindToWsMessage(result, deckId))
    })
    detectorRef.current = detector
    return () => {
      detector.reset()
      detectorRef.current = null
    }
  }, [deckId, onGesture])

  const handleDown = (keyIndex: number): void => {
    setPressedIndex(keyIndex)
    dispatchMouseEvent(detectorRef.current!, {
      kind: "down",
      keyIndex,
      timestamp: Date.now(),
    })
  }

  const handleUp = (keyIndex: number): void => {
    setPressedIndex(null)
    dispatchMouseEvent(detectorRef.current!, {
      kind: "up",
      keyIndex,
      timestamp: Date.now(),
    })
  }

  const iframeUrl = `${frontendUrl}${frontendUrl.includes("?") ? "&" : "?"}device=${device.id}`

  const BUTTON_GAP_PX = 8
  const DECK_PADDING_PX = 16

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 shadow-lg"
      style={{
        width:
          columns * BUTTON_SIZE_PX +
          (columns - 1) * BUTTON_GAP_PX +
          DECK_PADDING_PX * 2,
        height:
          Math.ceil(keyCount / columns) * BUTTON_SIZE_PX +
          (Math.ceil(keyCount / columns) - 1) * BUTTON_GAP_PX +
          DECK_PADDING_PX * 2,
      }}
    >
      <iframe
        src={iframeUrl}
        className="block"
        style={{
          width:
            columns * BUTTON_SIZE_PX +
            (columns - 1) * BUTTON_GAP_PX +
            DECK_PADDING_PX * 2,
          height:
            Math.ceil(keyCount / columns) * BUTTON_SIZE_PX +
            (Math.ceil(keyCount / columns) - 1) * BUTTON_GAP_PX +
            DECK_PADDING_PX * 2,
        }}
        title="Deck Preview"
      />
      <div
        data-testid="deck-frame"
        data-deck={deckId}
        data-key-count={keyCount}
        data-columns={columns}
        className="absolute inset-0 grid p-4"
        style={{
          gridTemplateColumns: `repeat(${columns}, ${BUTTON_SIZE_PX}px)`,
          gridTemplateRows: `repeat(${Math.ceil(keyCount / columns)}, ${BUTTON_SIZE_PX}px)`,
          gap: `${BUTTON_GAP_PX}px`,
        }}
      >
        {Array.from({ length: keyCount }, (_, i) => {
          const isPressed = pressedIndex === i
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
                if (e.buttons === 1) handleUp(i)
              }}
              className={[
                "rounded-lg border border-white/10",
                "bg-gradient-to-br from-black/40 via-black/20 to-white/5",
                "transition-all duration-75",
                "hover:from-black/30 hover:via-black/10 hover:to-white/10",
                isPressed
                  ? "from-white/30 via-white/15 to-white/5 border-white/30"
                  : "",
              ].join(" ")}
              style={{ aspectRatio: "1" }}
            />
          )
        })}
      </div>
    </div>
  )
}
