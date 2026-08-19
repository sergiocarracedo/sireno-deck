/** @vitest-environment jsdom */
import { act, fireEvent, render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ChannelRegistry } from "@sirenodeck/cli"
import { getDeviceModel } from "@/device/models"

import { WebSocketProvider, type WebSocketSend } from "../bridge/ws-context"
import { Deck } from "../components/Deck"

const DECK = {
  id: "main",
  name: "Home",
  buttons: [
    {
      id: "b0",
      type: "core:change-deck",
      label: "Media",
      config: { deck: "media" },
    },
    {
      id: "b1",
      type: "core:action",
      label: "Run",
      config: { label: "Run" },
    },
  ],
}

const MODEL = getDeviceModel("mk2")

describe("Deck", () => {
  it("renders a button per entry with the right data-button-type", () => {
    const { container } = render(<Deck deck={DECK} deviceModel={MODEL} />)
    expect(
      container.querySelectorAll("[data-sireno-button-frame]"),
    ).toHaveLength(2)
  })

  it("publishes to the per-button runtime:gesture channel when a gesture arrives", () => {
    ChannelRegistry.resetForTests()
    render(<Deck deck={DECK} deviceModel={MODEL} />)

    const b0Received: Array<unknown> = []
    const b1Received: Array<unknown> = []
    const unsub0 = ChannelRegistry.instance().subscribe(
      "runtime:gesture:b0",
      (p) => b0Received.push(p),
    )
    const unsub1 = ChannelRegistry.instance().subscribe(
      "runtime:gesture:b1",
      (p) => b1Received.push(p),
    )

    act(() => {
      ChannelRegistry.instance().publish("runtime:gesture:b1", {
        gesture: "tap",
        at: 1,
      })
    })

    expect(b1Received).toHaveLength(1)
    expect(b0Received).toHaveLength(0)

    unsub0()
    unsub1()
  })

  it("sends a button-action WS message when a rendered button is clicked", () => {
    ChannelRegistry.resetForTests()
    const sent: unknown[] = []
    const send: WebSocketSend = (message) => {
      sent.push(message)
    }
    const { container } = render(
      <WebSocketProvider value={send}>
        <Deck deck={DECK} deviceModel={MODEL} />
      </WebSocketProvider>,
    )
    const cell = container.querySelector('[data-button-type="core:action"]')
    expect(cell).not.toBeNull()
    const frame = cell?.querySelector('[data-sireno-button-frame="true"]')
    expect(frame).not.toBeNull()
    act(() => {
      fireEvent.click(frame as Element)
    })
    expect(sent).toEqual([
      {
        type: "button-action",
        deckId: "main",
        position: 1,
        gesture: "tap",
      },
    ])
  })

  it("ignores buttons whose position is >= device keyCount", () => {
    const mini = getDeviceModel("mini")
    const oversizedDeck = {
      ...DECK,
      buttons: [
        ...DECK.buttons,
        { id: "6", type: "core:action", label: "Off-grid", config: {} },
        { id: "7", type: "core:action", label: "Off-grid-2", config: {} },
      ],
    }
    const { container } = render(
      <Deck deck={oversizedDeck} deviceModel={mini} />,
    )
    expect(
      container.querySelectorAll("[data-sireno-button-frame]"),
    ).toHaveLength(2)
    expect(
      container.querySelectorAll('[data-button-type="core:action"]'),
    ).toHaveLength(2)
  })
})
