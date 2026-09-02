import { useEffect, useRef, useState } from "react"

import { BUTTON_SIZE_PX, type DeviceModelSpec } from "@sirenodeck/cli"

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
  readonly token?: string
  readonly onGesture?: (msg: {
    deckId: string
    position: number
    gesture: "tap" | "dbl-tap" | "hold"
  }) => void
  readonly onDropPosition?: (position: number, event: React.DragEvent) => void
  // ponytail: lets the parent trigger `iframe.contentWindow.location.reload()`
  // on `iframe-reload` WS messages without giving the parent a real DOM ref
  // (which would force React to re-render and discard internal state).
  readonly onIframeRef?: (iframe: HTMLIFrameElement | null) => void
}

export const DeckFrame = ({
  frontendUrl,
  device,
  deckId,
  token = "",
  onGesture,
  onDropPosition,
  onIframeRef,
}: DeckFrameProps): React.ReactElement => {
  const { columns, keyCount } = device
  const detectorRef = useRef<GestureDetector | null>(null)
  const onGestureRef = useRef(onGesture)
  onGestureRef.current = onGesture
  const [pressedIndex, setPressedIndex] = useState<number | null>(null)
  const [iframeState, setIframeState] = useState<
    "loading" | "loaded" | "error"
  >("loading")
  const [reloadNonce, setReloadNonce] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  useEffect(() => {
    const detector = createEmulatorGestureDetector((result) => {
      const cb = onGestureRef.current
      if (cb !== undefined) cb(gestureKindToWsMessage(result, deckId))
    })
    detectorRef.current = detector
    return () => {
      detector.reset()
      detectorRef.current = null
    }
  }, [deckId])

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

  // ponytail: use the page's current hostname so the iframe works regardless of
  // which interface the phone used to reach the config UI (LAN, Tailscale, VPN).
  // The injected URL still carries the correct frontend port.
  const resolvedFrontendUrl = ((): string => {
    if (typeof window === "undefined") return frontendUrl
    try {
      const parsed = new URL(frontendUrl)
      return `${parsed.protocol}//${window.location.hostname}:${parsed.port}${parsed.pathname}${parsed.search}${parsed.hash}`
    } catch {
      return frontendUrl
    }
  })()

  const iframeUrl = ((): string => {
    const base = `${resolvedFrontendUrl}${resolvedFrontendUrl.includes("?") ? "&" : "?"}device=${device.id}&_r=${reloadNonce}`
    // ponytail: --remote puts the deck behind the daemon's token. The
    // config UI's own bundle already authenticates via the sireno-token
    // cookie, but the iframe loads the *frontend* on a different origin
    // (port 5180), which can't read the config UI's cookie. Append the
    // token to the iframe URL so the frontend's middleware lets the
    // request through on first paint — the injected cookie script in
    // that HTML then keeps subsequent module requests authenticated.
    if (typeof window === "undefined" || token.length === 0) return base
    return `${base}&token=${encodeURIComponent(token)}`
  })()

  useEffect(() => {
    setIframeState("loading")
    const iframe = iframeRef.current
    if (iframe === null) return
    const handleError = (): void => setIframeState("error")
    iframe.addEventListener("error", handleError)
    return () => iframe.removeEventListener("error", handleError)
  }, [iframeUrl])

  const setIframeRef = (el: HTMLIFrameElement | null): void => {
    iframeRef.current = el
    onIframeRef?.(el)
  }

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
        ref={setIframeRef}
        src={iframeUrl}
        onLoad={() => setIframeState("loaded")}
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
      {iframeState !== "loaded" && (
        <div
          data-testid="iframe-status"
          data-status={iframeState}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-neutral-950/80 p-4 text-center text-xs text-neutral-400"
        >
          {iframeState === "loading" ? (
            <>
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-neutral-600 border-t-sky-400" />
              <p>Loading deck…</p>
            </>
          ) : (
            <>
              <p className="font-medium text-red-400">Could not load deck</p>
              <p className="max-w-[220px]">
                Check that this device can reach
                <br />
                <span className="break-all font-mono text-neutral-300">
                  {resolvedFrontendUrl}
                </span>
              </p>
              <button
                type="button"
                onClick={() => {
                  setIframeState("loading")
                  setReloadNonce((n) => n + 1)
                }}
                className="rounded bg-sky-600 px-3 py-1.5 text-neutral-100 hover:bg-sky-500"
              >
                Retry
              </button>
            </>
          )}
        </div>
      )}
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
              onDragOver={
                onDropPosition === undefined
                  ? undefined
                  : (event) => event.preventDefault()
              }
              onDrop={
                onDropPosition === undefined
                  ? undefined
                  : (event) => onDropPosition(i, event)
              }
              className={[
                "rounded-lg border",
                "bg-gradient-to-br from-black/40 via-black/20 to-white/5",
                "border-white/10",
                "transition-all duration-200",
                "hover:from-black/20 hover:via-black/0 hover:to-white/10 hover:border-white/25",
                isPressed
                  ? "from-white/60 via-white/30 to-white/10 border-white/60 shadow-[0_0_18px_rgba(255,255,255,0.5)] scale-[0.96]"
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
