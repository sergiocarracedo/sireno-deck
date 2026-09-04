import { useEffect, useRef, useState } from "react"

import {
  BUTTON_SIZE_PX,
  DECK_GAP_PX,
  DECK_PADDING_PX,
  deckDimensions,
  type DeviceModelSpec,
} from "@sirenodeck/cli"
import { Dropdown, Button, Label } from "@heroui/react"

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
  readonly gap?: boolean
  readonly onGesture?: (msg: {
    deckId: string
    position: number
    gesture: "tap" | "dbl-tap" | "hold"
  }) => void
  readonly onDropPosition?: (position: number, event: React.DragEvent) => void
  readonly onKeyAction?: (
    position: number,
    action: "edit" | "copy" | "duplicate" | "up" | "down" | "delete",
  ) => void
  readonly fitToContainer?: boolean
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
  gap = true,
  onGesture,
  onDropPosition,
  onKeyAction,
  fitToContainer = false,
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
  const frameRef = useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = useState(1)

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
    let parsed: URL
    try {
      parsed = new URL(resolvedFrontendUrl)
    } catch {
      return resolvedFrontendUrl
    }
    parsed.searchParams.set("device", device.id)
    parsed.searchParams.set("_r", String(reloadNonce))
    parsed.searchParams.set("compact", "0")
    parsed.searchParams.set("gap", String(gap))
    if (token.length > 0) parsed.searchParams.set("token", token)
    const base = parsed.toString()
    // ponytail: --remote puts the deck behind the daemon's token. The
    // config UI's own bundle already authenticates via the sireno-token
    // cookie, but the iframe loads the *frontend* on a different origin
    // (port 5180), which can't read the config UI's cookie. Append the
    // token to the iframe URL so the frontend's middleware lets the
    // request through on first paint — the injected cookie script in
    // that HTML then keeps subsequent module requests authenticated.
    return base
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

  const resolvedGap = gap ? DECK_GAP_PX : 0
  const { width: frameWidth, height: frameHeight } = deckDimensions(
    { columns, rows: Math.ceil(keyCount / columns) },
    resolvedGap,
    DECK_PADDING_PX,
  )

  useEffect(() => {
    if (!fitToContainer) {
      setScale(1)
      return
    }
    const parent = frameRef.current?.parentElement
    if (parent === null || parent === undefined) return
    const resize = (): void =>
      setScale(Math.min(1, Math.max(0.1, parent.clientWidth / frameWidth)))
    resize()
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(resize)
    observer.observe(parent)
    return () => observer.disconnect()
  }, [fitToContainer, frameWidth])

  return (
    <div
      ref={frameRef}
      className="relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 shadow-lg"
      style={{
        width: frameWidth * scale,
        height: frameHeight * scale,
      }}
    >
      <div
        className="absolute left-0 top-0"
        style={{
          width: frameWidth,
          height: frameHeight,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <iframe
          ref={setIframeRef}
          src={iframeUrl}
          onLoad={() => setIframeState("loaded")}
          className="block"
          style={{ width: frameWidth, height: frameHeight }}
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
          className="absolute inset-0 z-10 grid p-4 pointer-events-none"
          style={{
            gridTemplateColumns: `repeat(${columns}, ${BUTTON_SIZE_PX}px)`,
            gridTemplateRows: `repeat(${Math.ceil(keyCount / columns)}, ${BUTTON_SIZE_PX}px)`,
            gap: `${resolvedGap}px`,
          }}
        >
          {Array.from({ length: keyCount }, (_, i) => {
            const isPressed = pressedIndex === i
            const editorControls =
              onKeyAction === undefined ? null : (
                <div className="pointer-events-none absolute top-0 right-0 z-20 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100">
                  <Dropdown>
                    <Button
                      type="button"
                      aria-label={`Actions for key ${i}`}
                      className="h-6 w-6 min-w-6 rounded-full bg-neutral-950/90 p-0 text-xs text-neutral-200"
                      onMouseDown={(event) => event.stopPropagation()}
                    >
                      ⋮
                    </Button>
                    <Dropdown.Popover>
                      <Dropdown.Menu
                        aria-label="Key actions"
                        onAction={(key) =>
                          onKeyAction(
                            i,
                            String(key) as
                              | "edit"
                              | "copy"
                              | "duplicate"
                              | "up"
                              | "down"
                              | "delete",
                          )
                        }
                      >
                        {(
                          [
                            ["edit", "Edit/select"],
                            ["copy", "Copy config"],
                            ["duplicate", "Duplicate"],
                            ["up", "Previous position"],
                            ["down", "Next position"],
                            ["delete", "Delete"],
                          ] as const
                        ).map(([action, label]) => (
                          <Dropdown.Item
                            key={action}
                            id={action}
                            textValue={label}
                          >
                            <Label>{label}</Label>
                          </Dropdown.Item>
                        ))}
                      </Dropdown.Menu>
                    </Dropdown.Popover>
                  </Dropdown>
                </div>
              )
            return (
              <div key={i} className="group relative">
                <button
                  type="button"
                  data-testid={`deck-key-${i}`}
                  data-key-index={i}
                  aria-label={`Key ${i}`}
                  aria-pressed={isPressed}
                  onPointerDown={() => handleDown(i)}
                  onPointerUp={() => handleUp(i)}
                  onPointerLeave={(e) => {
                    if (e.buttons === 1) handleUp(i)
                  }}
                  onPointerCancel={() => handleUp(i)}
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
                    "h-full w-full rounded-lg border",
                    "bg-gradient-to-br from-black/40 via-black/20 to-white/5",
                    "border-white/10",
                    "pointer-events-auto transition-all duration-200",
                    "hover:from-black/20 hover:via-black/0 hover:to-white/10 hover:border-white/25",
                    isPressed
                      ? "from-white/60 via-white/30 to-white/10 border-white/60 shadow-[0_0_18px_rgba(255,255,255,0.5)] scale-[0.96]"
                      : "",
                  ].join(" ")}
                />
                {editorControls}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
