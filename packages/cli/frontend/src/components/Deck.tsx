import { useEffect, useState, type CSSProperties, type ReactNode } from "react"
import {
  BUTTON_SIZE_PX,
  DEVICE_MODELS,
  gridForKeyCount,
  type DeviceModelSpec,
} from "@/device/models"

import { addonRegistry } from "virtual:sireno/addons/registry"

import {
  ButtonFrame,
  SplitActionSurface,
  useAddonChannel,
  type AddonGestureEvent,
} from "@sireno-deck/cli"
import {
  isSystemButton,
  renderSystemButton,
} from "@/deck/system-buttons/registry"
import { useButtonAction } from "../bridge/use-button-action"
import { ErrorBoundary } from "./ErrorBoundary"

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
}

export interface Deck {
  id: string
  name: string
  buttons: DeckButton[]
  hasOverlayDeckAvailable?: boolean
}

export interface DeckProps {
  readonly deck: Deck & { isCompact?: boolean }
  readonly children?: ReactNode
}

const resolveDeviceModel = (): DeviceModelSpec => {
  if (typeof window !== "undefined") {
    const id =
      (window as unknown as { __SIRENO_DEVICE_MODEL__?: string })
        .__SIRENO_DEVICE_MODEL__ ??
      new URLSearchParams(window.location.search).get("device")
    if (id !== undefined && id !== null) {
      const found = DEVICE_MODELS.find((m) => m.id === id)
      if (found !== undefined) return found
    }
  }
  return DEVICE_MODELS[0]!
}

const resolvePosition = (button: DeckButton, fallback: number): number => {
  if (
    typeof button.position === "number" &&
    Number.isFinite(button.position) &&
    button.position >= 0
  ) {
    return button.position
  }
  const parsed = Number.parseInt(button.id, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

interface ButtonSurfaceProps {
  readonly button: DeckButton
}

interface DeckButtonCellProps {
  readonly deckId: string
  readonly position: number
  readonly button: DeckButton
  readonly col: number
  readonly row: number
  readonly splitAction?: boolean
}

const DeckButtonCell = ({
  deckId,
  position,
  button,
  col,
  row,
  splitAction = false,
}: DeckButtonCellProps) => {
  const { fire } = useButtonAction(deckId, position)
  if (splitAction) {
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
        <ButtonFrame buttonType={button.type} onClick={() => fire("tap")}>
          <SplitActionSurface
            primary={renderSystemButton("core:back")}
            secondary={renderSystemButton("core:overlay-toggle")}
          />
        </ButtonFrame>
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
      <ButtonFrame buttonType={button.type} onClick={() => fire("tap")}>
        <ErrorBoundary resetKey={button.id}>
          <ButtonSurface button={button} />
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
const ButtonSurface = ({ button }: ButtonSurfaceProps) => {
  const registryEntry = addonRegistry[button.type]
  const [gesture, setGesture] = useState<AddonGestureEvent | null>(null)
  const channel = `runtime:gesture:${button.id}`
  const { data } = useAddonChannel<AddonGestureEvent>(channel)

  useEffect(() => {
    if (data !== undefined) setGesture(data)
  }, [data])

  if (isSystemButton(button.type)) {
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
      gesture={gesture}
    />
  )
}

export const Deck = ({ deck, children }: DeckProps) => {
  const model = resolveDeviceModel()
  const { columns, rows } = gridForKeyCount(model.keyCount)
  const compact = deck.isCompact ?? false
  const gap = compact ? 0 : BUTTON_GAP_PX
  const pad = compact ? 0 : DECK_PADDING_PX
  const width = columns * BUTTON_SIZE + (columns - 1) * gap + pad * 2
  const height = rows * BUTTON_SIZE + (rows - 1) * gap + pad * 2
  const n1Position = model.keyCount - 1
  const splitAtN1 = deck.hasOverlayDeckAvailable === true
  return (
    <div
      className={`grid rounded-xl bg-neutral-950 ${compact ? "p-0" : "p-4"}`}
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
        const col = (position % columns) + 1
        const row = Math.floor(position / columns) + 1
        const splitAction =
          splitAtN1 &&
          position === n1Position &&
          button.type === "core:back"
        return (
          <DeckButtonCell
            key={button.id}
            deckId={deck.id}
            position={position}
            button={button}
            col={col}
            row={row}
            {...(splitAction ? { splitAction: true } : {})}
          />
        )
      })}
      {children}
    </div>
  )
}