/** @vitest-environment jsdom */
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { DisconnectedOverlay } from "../components/DisconnectedOverlay"

describe("DisconnectedOverlay", () => {
  it("renders nothing when status is open", () => {
    const { container } = render(
      <DisconnectedOverlay
        status="open"
        disconnectedSince={null}
        attempt={0}
        lastError={null}
        now={0}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it("renders nothing when elapsed is below 30000ms", () => {
    const { container } = render(
      <DisconnectedOverlay
        status="closed"
        disconnectedSince={0}
        attempt={1}
        lastError={null}
        now={10000}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it("renders overlay at 30000ms with status, attempt, elapsed mm:ss", () => {
    const { getByTestId } = render(
      <DisconnectedOverlay
        status="closed"
        disconnectedSince={0}
        attempt={3}
        lastError="WebSocket connection error"
        now={30000}
      />,
    )
    const overlay = getByTestId("disconnected-overlay")
    expect(overlay).toBeTruthy()
    expect(overlay.textContent).toContain("Connection lost")
    expect(overlay.textContent).toContain("Disconnected")
    expect(overlay.textContent).toContain("closed")
    expect(overlay.textContent).toContain("3")
    expect(overlay.textContent).toContain("00:30")
    expect(overlay.textContent).toContain("WebSocket connection error")
  })

  it("contains no buttons or interactive controls", () => {
    const { getByTestId } = render(
      <DisconnectedOverlay
        status="failed"
        disconnectedSince={0}
        attempt={10}
        lastError={null}
        now={45000}
      />,
    )
    const overlay = getByTestId("disconnected-overlay")
    expect(overlay.querySelectorAll("button").length).toBe(0)
    expect(overlay.querySelectorAll('input, select, textarea').length).toBe(0)
  })

  it("renders 'Failed to reconnect' when status is failed", () => {
    const { getByTestId } = render(
      <DisconnectedOverlay
        status="failed"
        disconnectedSince={0}
        attempt={10}
        lastError={null}
        now={30000}
      />,
    )
    expect(getByTestId("disconnected-overlay").textContent).toContain(
      "Failed to reconnect after 10 attempts",
    )
  })

  it("renders nothing when disconnectedSince is null even if status is closed", () => {
    const { container } = render(
      <DisconnectedOverlay
        status="closed"
        disconnectedSince={null}
        attempt={3}
        lastError={null}
        now={60000}
      />,
    )
    expect(container.firstChild).toBeNull()
  })
})
