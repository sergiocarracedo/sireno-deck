import {
  BUTTON_SIZE_PX,
  gridForKeyCount,
  type DeviceModelSpec,
} from "@/device/models"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"

import { addonRegistry } from "virtual:sireno/addons/registry"
import { uiOverrides } from "virtual:sireno/themes/manifest"

import {
  isSystemButton,
  renderOverlayToggleButton,
  renderSystemButton,
} from "@/deck/system-buttons/registry"
import {
  ButtonFrame,
  SPA_DOUBLE_TAP_DELAY_MS,
  SPA_HOLD_DELAY_MS,
  SplitActionSurface,
  useAddonChannel,
  type AddonGestureEvent,
} from "@sirenodeck/cli"
import { useButtonAction } from "../bridge/use-button-action"
import { ErrorBoundary } from "./ErrorBoundary"

// ponytail: the pomodoro addon's frontend subscribes to its
// `pomodoro:state` channel through this injected hook. Without it, the
// addon's hook falls back to a no-op and the countdown never renders.
// Set once at module load — `useAddonChannel` from the host uses the
// singleton `ChannelRegistry`, so the addon's components pick up state
// updates the same way built-in addons do.
;(
  globalThis as { __pomodoroUseAddonChannel?: typeof useAddonChannel }
).__pomodoroUseAddonChannel = useAddonChannel
;(
  globalThis as { __codingAgentsUseAddonChannel?: typeof useAddonChannel }
).__codingAgentsUseAddonChannel = useAddonChannel

const BUTTON_SIZE = BUTTON_SIZE_PX
const BUTTON_GAP_PX = 8
const DECK_PADDING_PX = 16

export interface DeckButton {
  id: string
  type: string
  label?: string
  position?: number
  config?: Record<string, unknown>
  addonName?: string
  frontendEntry?: string
  full?: boolean
  variant?: string
}

export interface Deck {
  id: string
  name: string
  buttons: DeckButton[]
  buttonColor?:
    | "blue"
    | "green"
    | "purple"
    | "cyan"
    | "magenta"
    | "amber"
    | "lime"
  variant?: string
  hasOverlayDeckAvailable?: boolean
  overlayDeckIcon?: string | null
  overlayDeckName?: string | null
  buttonErrors?: Array<{
    position: number
    expiresAt: number
    buttonId?: string
    details?: string
  }>
}

export interface DeckProps {
  readonly deck: Deck & { isCompact?: boolean }
  readonly deviceModel: DeviceModelSpec
  readonly children?: ReactNode
}

const resolvePosition = (button: DeckButton, fallback: number): number => {
  if (
    typeof button.position === "number" &&
    Number.isFinite(button.position) &&
    button.position >= 0
  ) {
    return button.position
  }
  return fallback
}

interface ButtonSurfaceProps {
  readonly button: DeckButton
  readonly deckOverlayIcon?: string | null
  readonly overlayDeckName?: string | null
}

interface DeckButtonCellProps {
  readonly deckId: string
  readonly position: number
  readonly button: DeckButton
  readonly col: number
  readonly row: number
  readonly splitAction?: boolean
  readonly isError?: boolean
  readonly buttonColor?:
    | "blue"
    | "green"
    | "purple"
    | "cyan"
    | "magenta"
    | "amber"
    | "lime"
  readonly variant?: string
  readonly overlayDeckIcon?: string | null
  readonly overlayDeckName?: string | null
  readonly buttonErrors?: Deck["buttonErrors"]
}

const DeckButtonCell = ({
  deckId,
  position,
  button,
  col,
  row,
  splitAction = false,
  isError = false,
  buttonColor,
  variant,
  overlayDeckIcon: deckOverlayIcon,
  overlayDeckName,
  buttonErrors,
}: DeckButtonCellProps) => {
  const { fire } = useButtonAction(deckId, position)
  const lastClickAtRef = useRef(0)
  const pendingTapTimerRef = useRef<number | null>(null)
  const holdTimerRef = useRef<number | null>(null)
  const clearHoldTimer = () => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
  }
  useEffect(
    () => () => {
      clearHoldTimer()
      if (pendingTapTimerRef.current !== null) {
        window.clearTimeout(pendingTapTimerRef.current)
        pendingTapTimerRef.current = null
      }
    },
    [],
  )

  // ponytail: per-button variant from user config beats deck-level
  // variant (which beats the legacy `buttonColor` enum). Unknown names
  // fall back to "default" at the ButtonFrame layer.
  const effectiveVariant =
    button.variant ?? variant ?? button.buttonColor ?? buttonColor ?? "default"

  if (isError) {
    return (
      <div
        style={{
          gridColumn: col,
          gridRow: row,
          width: BUTTON_SIZE,
          height: BUTTON_SIZE,
        }}
        data-button-type="core:temporary-error"
      >
        <ButtonFrame
          buttonType="core:temporary-error"
          variant="error"
          onClick={() => fire("tap")}
        >
          {renderSystemButton(
            "core:temporary-error",
            undefined,
            (buttonErrors ?? []).find((e) => e.position === position)?.details,
          )}
        </ButtonFrame>
      </div>
    )
  }
  if (splitAction) {
    const overlayIcon = deckOverlayIcon ?? undefined
    const handleClick = () => {
      const now = Date.now()
      if (now - lastClickAtRef.current < SPA_DOUBLE_TAP_DELAY_MS) {
        lastClickAtRef.current = 0
        window.clearTimeout(pendingTapTimerRef.current)
        pendingTapTimerRef.current = null
        fire("dbl-tap")
        return
      }
      lastClickAtRef.current = now
      window.clearTimeout(pendingTapTimerRef.current)
      pendingTapTimerRef.current = window.setTimeout(() => {
        pendingTapTimerRef.current = null
        fire("tap")
      }, SPA_DOUBLE_TAP_DELAY_MS)
    }
    const handlePointerDown = () => {
      clearHoldTimer()
      holdTimerRef.current = window.setTimeout(() => {
        holdTimerRef.current = null
        fire("hold")
      }, SPA_HOLD_DELAY_MS)
    }
    const handlePointerUp = () => clearHoldTimer()
    const handlePointerLeave = () => clearHoldTimer()
    return (
      <div
        style={{
          gridColumn: col,
          gridRow: row,
          width: BUTTON_SIZE,
          height: BUTTON_SIZE,
        }}
        data-button-type={button.type}
        data-split-action="true"
      >
        <ButtonFrame
          buttonType={button.type}
          variant={effectiveVariant}
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
        >
          <SplitActionSurface
            primary={renderSystemButton(button.type)}
            secondary={renderSystemButton(
              "core:overlay-toggle",
              overlayIcon,
              undefined,
              overlayDeckName ?? undefined,
            )}
          />
        </ButtonFrame>
      </div>
    )
  }
  if (button.full === true) {
    return (
      <div
        style={{
          gridColumn: col,
          gridRow: row,
          width: BUTTON_SIZE,
          height: BUTTON_SIZE,
        }}
        data-button-type={button.type}
        data-full="true"
      >
        <ErrorBoundary resetKey={button.id}>
          <ButtonSurface
            button={button}
            deckOverlayIcon={deckOverlayIcon ?? null}
            overlayDeckName={overlayDeckName ?? null}
          />
        </ErrorBoundary>
      </div>
    )
  }
  return (
    <div
      style={{
        gridColumn: col,
        gridRow: row,
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
      }}
      data-button-type={button.type}
    >
      <ButtonFrame
        buttonType={button.type}
        variant={effectiveVariant}
        onClick={() => fire("tap")}
      >
        <ErrorBoundary resetKey={button.id}>
          <ButtonSurface
            button={button}
            deckOverlayIcon={deckOverlayIcon ?? null}
            overlayDeckName={overlayDeckName ?? null}
          />
        </ErrorBoundary>
      </ButtonFrame>
    </div>
  )
}

/**
 * Per-button addon surface. Subscribes to the per-button gesture channel and
 * holds the latest gesture in state. The gesture value is replaced on each
 * incoming event and never auto-cleared, so addons can compare against
 * `gesture.at` in a `useEffect` without losing the hide-timer race.
 */
const ButtonSurface = ({
  button,
  deckOverlayIcon,
  overlayDeckName,
}: ButtonSurfaceProps) => {
  const registryEntry = addonRegistry[button.type]
  const [gesture, setGesture] = useState<AddonGestureEvent | null>(null)
  const channel = `runtime:gesture:${button.id}`
  const { data } = useAddonChannel<AddonGestureEvent>(channel)

  useEffect(() => {
    if (data !== undefined) setGesture(data)
  }, [data])

  if (isSystemButton(button.type)) {
    if (
      button.type === "core:overlay-toggle" &&
      typeof deckOverlayIcon === "string" &&
      deckOverlayIcon.length > 0
    ) {
      return renderOverlayToggleButton(
        deckOverlayIcon,
        overlayDeckName ?? undefined,
      )
    }
    return renderSystemButton(button.type)
  }

  if (registryEntry === undefined) return null
  const Component = registryEntry.Component
  return (
    <Component
      config={button.config ?? {}}
      state={null}
      buttonType={button.type}
      buttonId={button.id}
      addonName={registryEntry.addonName}
      gesture={gesture}
    />
  )
}

export const Deck = ({ deck, deviceModel, children }: DeckProps) => {
  const model = deviceModel
  const { columns, rows } = gridForKeyCount(model.keyCount)
  const compact = deck.isCompact ?? false
  const gap = compact ? 0 : BUTTON_GAP_PX
  const pad = compact ? 0 : DECK_PADDING_PX
  const width = columns * BUTTON_SIZE + (columns - 1) * gap + pad * 2
  const height = rows * BUTTON_SIZE + (rows - 1) * gap + pad * 2
  const n1Position = model.keyCount - 1
  const splitAtN1 = deck.hasOverlayDeckAvailable === true
  const errorPositions = new Set(
    (deck.buttonErrors ?? []).map((error) => error.position),
  )
  /**
   * Theme-supplied deck-chrome background. Themes can paint a full-deck
   * perspective grid (or any other background) by exporting a
   * `deckBackground` fn from their ui-overrides module. Default is
   * bg-neutral-950 — unchanged when no hook is registered.
   */
  const extras = useMemo(() => {
    const overrides = uiOverrides as {
      deckBackground?: (props: { className: string }) => string | undefined
    } | null
    const hook = overrides?.deckBackground
    if (typeof hook !== "function") return ""
    return (
      hook({ className: `bg-neutral-950 ${compact ? "p-0" : "p-4"}` }) ?? ""
    )
  }, [compact])
  const baseClass = `grid rounded-xl ${compact ? "p-0" : "p-4"}`
  const deckClass =
    extras.length > 0 ? `${baseClass} ${extras}` : `${baseClass} bg-neutral-950`

  // ponytail: positions without a button render a faint outline (emulator /
  // browser only, not the hardware screenshot).
  const occupiedPositions = new Set(
    deck.buttons
      .map((b, idx) => resolvePosition(b, idx))
      .filter((p) => p < model.keyCount),
  )
  const emptyCells: ReactNode[] = []
  if (!compact) {
    for (let position = 0; position < model.keyCount; position += 1) {
      if (occupiedPositions.has(position)) continue
      const col = (position % columns) + 1
      const row = Math.floor(position / columns) + 1
      emptyCells.push(
        <div
          key={`empty-${position}`}
          data-empty-cell="true"
          aria-hidden="true"
          className="rounded-2xl border border-solid opacity-30"
          style={{
            gridColumn: col,
            gridRow: row,
            width: BUTTON_SIZE,
            height: BUTTON_SIZE,
            borderColor: "var(--sireno-variant-default-border)",
          }}
        />,
      )
    }
  }

  return (
    <div
      className={deckClass}
      style={
        {
          gridTemplateColumns: `repeat(${columns}, ${BUTTON_SIZE}px)`,
          gridTemplateRows: `repeat(${rows}, ${BUTTON_SIZE}px)`,
          gap: `${gap}px`,
          width,
          height,
        } as CSSProperties
      }
      data-deck-id={deck.id}
      data-columns={columns}
      data-rows={rows}
    >
      {deck.buttons.map((button, idx) => {
        const position = resolvePosition(button, idx)
        if (position >= model.keyCount) return null
        const col = (position % columns) + 1
        const row = Math.floor(position / columns) + 1
        const splitAction =
          splitAtN1 &&
          position === n1Position &&
          (button.type === "core:back" || button.type === "core:settings-entry")
        return (
          <DeckButtonCell
            key={button.id}
            deckId={deck.id}
            position={position}
            button={button}
            col={col}
            row={row}
            isError={errorPositions.has(position)}
            buttonColor={deck.buttonColor}
            variant={deck.variant}
            overlayDeckIcon={deck.overlayDeckIcon ?? null}
            overlayDeckName={deck.overlayDeckName ?? null}
            buttonErrors={deck.buttonErrors}
            {...(splitAction ? { splitAction: true } : {})}
          />
        )
      })}
      {!compact && emptyCells}
      {children}
    </div>
  )
}
