/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { appendBridgeMessage, clearBridgeMessages } from "../bridge-log-store"
import { BridgeLogsPage } from "../pages/BridgeLogsPage"

describe("BridgeLogsPage", () => {
  it("renders matching messages by default", () => {
    clearBridgeMessages()
    appendBridgeMessage({
      ts: 1,
      direction: "received",
      type: "deck-config",
      channel: null,
      payload: { deckId: "main" },
    })
    render(<BridgeLogsPage />)
    expect(screen.getByTestId("bridge-logs-list").textContent).toContain(
      "deck-config",
    )
  })

  it("filters out messages when content substring doesn't match", () => {
    clearBridgeMessages()
    appendBridgeMessage({
      ts: 1,
      direction: "received",
      type: "deck-config",
      channel: null,
      payload: { deckId: "main" },
    })
    render(<BridgeLogsPage />)
    const input = screen.getByTestId("bridge-logs-content")
    fireEvent.change(input, { target: { value: "no-such-token" } })
    expect(screen.getByTestId("bridge-logs-list").textContent).toContain(
      "no messages",
    )
  })
})
