/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { getDeviceModel } from "@/device/models"
import { WebSocketProvider, type WebSocketSend } from "../bridge/ws-context"
import { Deck } from "../components/Deck"
import {
  isSystemButton,
  renderSystemButton,
  SYSTEM_BUTTON_LABELS,
} from "@/deck/system-buttons/registry"

const SYSTEM_TYPES: ReadonlyArray<{
  type: string
  expectedLabel: string
}> = [
  { type: "core:back", expectedLabel: "Back" },
  { type: "core:settings-entry", expectedLabel: "Settings" },
  { type: "core:overlay-toggle", expectedLabel: "Overlay" },
  { type: "core:next-page", expectedLabel: "Next" },
  { type: "core:temporary-error", expectedLabel: "Error" },
]

describe("system-button registry", () => {
  it("isSystemButton recognises the five core:* types", () => {
    expect(SYSTEM_BUTTON_LABELS).toEqual([
      "core:back",
      "core:settings-entry",
      "core:overlay-toggle",
      "core:next-page",
      "core:temporary-error",
    ])
    for (const { type } of SYSTEM_TYPES) {
      expect(isSystemButton(type)).toBe(true)
    }
    expect(isSystemButton("core:change-deck")).toBe(false)
    expect(isSystemButton("addon:foo")).toBe(false)
  })

  it("renderSystemButton returns a non-null surface for every system type", () => {
    for (const { type, expectedLabel } of SYSTEM_TYPES) {
      const node = renderSystemButton(type)
      expect(node).not.toBeNull()
      const { container } = render(<>{node}</>)
      expect(container.textContent).toContain(expectedLabel)
    }
  })

  it("renderSystemButton returns null for non-system types", () => {
    expect(renderSystemButton("core:action")).toBeNull()
    expect(renderSystemButton("addon:anything")).toBeNull()
    expect(renderSystemButton("")).toBeNull()
  })
})

describe("Deck with system buttons", () => {
  it("renders a cell for a core:back button (the n-1 case)", () => {
    const deck = {
      id: "sub",
      name: "Sub",
      buttons: [{ id: "14", type: "core:back", config: {} }],
    }
    const { container } = render(<Deck deck={deck} deviceModel={getDeviceModel("mk2")} />)
    const cell = container.querySelector('[data-button-type="core:back"]')
    expect(cell).not.toBeNull()
    expect(screen.getByText("Back")).toBeTruthy()
  })

  it("sends a button-action WS message when a system button is tapped", () => {
    const deck = {
      id: "sub",
      name: "Sub",
      buttons: [{ id: "14", type: "core:back", config: {} }],
    }
    const sent: unknown[] = []
    const send: WebSocketSend = (m) => {
      sent.push(m)
    }
    const { container } = render(
      <WebSocketProvider value={send}>
        <Deck deck={deck} deviceModel={getDeviceModel("mk2")} />
      </WebSocketProvider>,
    )
    const cell = container.querySelector('[data-button-type="core:back"]')
    expect(cell).not.toBeNull()
    const frame = cell?.querySelector('[data-sireno-button-frame="true"]')
    expect(frame).not.toBeNull()
    act(() => {
      fireEvent.click(frame as Element)
    })
    expect(sent).toEqual([
      {
        type: "button-action",
        deckId: "sub",
        position: 14,
        gesture: "tap",
      },
    ])
  })

  it("renders a SplitActionSurface at the n-1 slot for main deck when overlay is available", () => {
    const deck = {
      id: "main",
      name: "Main",
      hasOverlayDeckAvailable: true,
      buttons: [{ id: "14", type: "core:settings-entry", config: {} }],
    }
    const { container } = render(
      <Deck deck={deck} deviceModel={getDeviceModel("mk2")} />,
    )
    const cell = container.querySelector('[data-split-action="true"]')
    expect(cell).not.toBeNull()
    expect(screen.getByText("Settings")).toBeTruthy()
    expect(screen.getByText("Overlay")).toBeTruthy()
  })

  it("renders a SplitActionSurface at the n-1 slot for sub-deck when overlay is available", () => {
    const deck = {
      id: "sub",
      name: "Sub",
      hasOverlayDeckAvailable: true,
      buttons: [{ id: "14", type: "core:back", config: {} }],
    }
    const { container } = render(
      <Deck deck={deck} deviceModel={getDeviceModel("mk2")} />,
    )
    const cell = container.querySelector('[data-split-action="true"]')
    expect(cell).not.toBeNull()
    expect(screen.getByText("Back")).toBeTruthy()
    expect(screen.getByText("Overlay")).toBeTruthy()
  })

  it("does not render a SplitActionSurface when overlay is not available", () => {
    const deck = {
      id: "sub",
      name: "Sub",
      hasOverlayDeckAvailable: false,
      buttons: [{ id: "14", type: "core:back", config: {} }],
    }
    const { container } = render(
      <Deck deck={deck} deviceModel={getDeviceModel("mk2")} />,
    )
    expect(container.querySelector('[data-split-action="true"]')).toBeNull()
  })
})
