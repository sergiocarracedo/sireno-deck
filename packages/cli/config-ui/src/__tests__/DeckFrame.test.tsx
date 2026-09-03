/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { DEVICE_MODELS } from "@sirenodeck/cli"

import { fireEvent, render } from "@testing-library/react"

import { DeckFrame } from "../DeckFrame"

const mk2 = DEVICE_MODELS.find((m) => m.id === "mk2")!

describe("DeckFrame (emulator)", () => {
  it("renders keyCount cells with correct grid columns", () => {
    const { getByTestId } = render(
      <DeckFrame
        frontendUrl="http://127.0.0.1:5180"
        deckId="main"
        device={mk2}
      />,
    )
    const frame = getByTestId("deck-frame")
    expect(frame.getAttribute("data-key-count")).toBe(String(mk2.keyCount))
    expect(frame.getAttribute("data-columns")).toBe(String(mk2.columns))
    expect(frame.querySelectorAll("button[data-key-index]")).toHaveLength(
      mk2.keyCount,
    )
  })

  it("renders each key with aria-label 'Key N'", () => {
    const { getByTestId } = render(
      <DeckFrame
        frontendUrl="http://127.0.0.1:5180"
        deckId="main"
        device={mk2}
      />,
    )
    for (let i = 0; i < mk2.keyCount; i++) {
      expect(getByTestId(`deck-key-${i}`).getAttribute("aria-label")).toBe(
        `Key ${i}`,
      )
    }
  })

  it("exposes the iframe DOM node via onIframeRef so the SPA can reload it", () => {
    const onIframeRef = vi.fn()
    const { container } = render(
      <DeckFrame
        frontendUrl="http://127.0.0.1:5180"
        deckId="main"
        device={mk2}
        onIframeRef={onIframeRef}
      />,
    )
    expect(onIframeRef).toHaveBeenCalled()
    const iframe = onIframeRef.mock.calls.at(-1)?.[0]
    expect(iframe).toBeInstanceOf(HTMLIFrameElement)
    expect(iframe).toBe(container.querySelector("iframe"))
  })

  it("derives iframe src from window.location.hostname while keeping the injected frontend port", () => {
    vi.stubGlobal("location", {
      ...window.location,
      hostname: "phone.lan",
      protocol: "http:",
    })
    const { container } = render(
      <DeckFrame
        frontendUrl="http://127.0.0.1:5180"
        deckId="main"
        device={mk2}
      />,
    )
    const iframe = container.querySelector("iframe")
    expect(iframe).toHaveAttribute(
      "src",
      expect.stringContaining("http://phone.lan:5180"),
    )
    expect(iframe).toHaveAttribute("src", expect.stringContaining("device=mk2"))
    vi.unstubAllGlobals()
  })

  it("shows a loading overlay until the iframe fires onLoad", () => {
    const { container, getByTestId, queryByTestId } = render(
      <DeckFrame
        frontendUrl="http://127.0.0.1:5180"
        deckId="main"
        device={mk2}
      />,
    )
    expect(getByTestId("iframe-status").getAttribute("data-status")).toBe(
      "loading",
    )
    const iframe = container.querySelector("iframe")!
    fireEvent.load(iframe)
    expect(queryByTestId("iframe-status")).not.toBeInTheDocument()
  })

  it("passes the supported boolean gap parameter to the frontend", () => {
    const { container } = render(
      <DeckFrame
        frontendUrl="http://127.0.0.1:5180"
        deckId="main"
        device={mk2}
        gap={false}
      />,
    )
    expect(container.querySelector("iframe")).toHaveAttribute(
      "src",
      expect.stringContaining("gap=false"),
    )
  })

  describe("gesture delivery", () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it("delivers tap gesture when key is pressed and released (re-render safe)", () => {
      const onGesture = vi.fn()
      const Wrapper = (): React.ReactElement => (
        <DeckFrame
          frontendUrl="http://127.0.0.1:5180"
          deckId="main"
          device={mk2}
          onGesture={onGesture}
        />
      )
      const { getByTestId, rerender } = render(<Wrapper />)
      const key = getByTestId("deck-key-3")

      fireEvent.mouseDown(key)
      // parent re-renders between down and up — the detector must survive
      rerender(<Wrapper />)
      fireEvent.mouseUp(key)

      vi.advanceTimersByTime(500)
      expect(onGesture).toHaveBeenCalledWith({
        type: "button-action",
        deckId: "main",
        position: 3,
        gesture: "tap",
      })
    })
  })
})
