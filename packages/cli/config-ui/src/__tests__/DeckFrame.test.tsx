/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { DEVICE_MODELS } from "@sirenodeck/sirenodeck"

import { fireEvent, render, screen } from "@testing-library/react"

import { DeckFrame } from "../DeckFrame"

const mk2 = DEVICE_MODELS.find((m) => m.id === "mk2")!

describe("DeckFrame (emulator)", () => {
  it("labels and icons the key menu, and confirms before deleting", () => {
    const onKeyAction = vi.fn()
    render(
      <DeckFrame
        frontendUrl="http://127.0.0.1:5180"
        deckId="main"
        device={mk2}
        onKeyAction={onKeyAction}
      />,
    )

    fireEvent.click(screen.getByRole("button", { name: "Actions for key 3" }))
    const edit = screen.getByRole("menuitem", { name: "Edit" })
    expect(edit.querySelector("svg")).toBeInTheDocument()
    fireEvent.click(edit)
    expect(onKeyAction).toHaveBeenLastCalledWith(3, "edit")

    fireEvent.click(screen.getByRole("button", { name: "Actions for key 3" }))
    const deleteItem = screen.getByRole("menuitem", { name: "Delete" })
    expect(deleteItem).toHaveClass("text-danger")
    expect(deleteItem.querySelector("svg")).toBeInTheDocument()
    fireEvent.click(deleteItem)
    expect(
      screen.getByRole("heading", { name: "Delete key 4?" }),
    ).toBeInTheDocument()
    expect(onKeyAction).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))
    expect(onKeyAction).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole("button", { name: "Actions for key 3" }))
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }))
    fireEvent.click(screen.getByRole("button", { name: "Delete button" }))
    expect(onKeyAction).toHaveBeenLastCalledWith(3, "delete")
  })

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

      fireEvent.pointerDown(key)
      // parent re-renders between down and up — the detector must survive
      rerender(<Wrapper />)
      fireEvent.pointerUp(key)

      vi.advanceTimersByTime(500)
      expect(onGesture).toHaveBeenCalledWith({
        type: "button-action",
        deckId: "main",
        position: 3,
        gesture: "tap",
      })
    })

    it("delivers touch gestures without invoking edit controls", () => {
      const onGesture = vi.fn()
      const onKeyAction = vi.fn()
      const { getByTestId } = render(
        <DeckFrame
          frontendUrl="http://127.0.0.1:5180"
          deckId="main"
          device={mk2}
          onGesture={onGesture}
          onKeyAction={onKeyAction}
        />,
      )
      const key = getByTestId("deck-key-4")

      fireEvent.pointerDown(key, { pointerType: "touch" })
      fireEvent.pointerUp(key, { pointerType: "touch" })
      vi.advanceTimersByTime(500)

      expect(onGesture).toHaveBeenCalledWith({
        type: "button-action",
        deckId: "main",
        position: 4,
        gesture: "tap",
      })
      expect(onKeyAction).not.toHaveBeenCalled()
    })

    it("delivers tap, double-tap, and hold gestures", () => {
      const onGesture = vi.fn()
      const { getByTestId } = render(
        <DeckFrame
          frontendUrl="http://127.0.0.1:5180"
          deckId="main"
          device={mk2}
          onGesture={onGesture}
        />,
      )
      const key = getByTestId("deck-key-5")

      fireEvent.pointerDown(key)
      fireEvent.pointerUp(key)
      vi.advanceTimersByTime(201)
      fireEvent.pointerDown(key)
      fireEvent.pointerUp(key)
      fireEvent.pointerDown(key)
      fireEvent.pointerUp(key)
      fireEvent.pointerDown(key)
      vi.advanceTimersByTime(201)
      fireEvent.pointerUp(key)

      expect(onGesture.mock.calls.map(([gesture]) => gesture.gesture)).toEqual([
        "tap",
        "dbl-tap",
        "hold",
      ])
    })

    it("does not dispatch a preview drag as an edit action", () => {
      const onGesture = vi.fn()
      const onKeyAction = vi.fn()
      const { getByTestId } = render(
        <DeckFrame
          frontendUrl="http://127.0.0.1:5180"
          deckId="main"
          device={mk2}
          onGesture={onGesture}
          onKeyAction={onKeyAction}
        />,
      )
      const key = getByTestId("deck-key-2")

      fireEvent.pointerDown(key, { buttons: 1 })
      fireEvent.pointerLeave(key, { buttons: 1 })
      fireEvent.pointerUp(key)

      expect(onGesture).not.toHaveBeenCalled()
      expect(onKeyAction).not.toHaveBeenCalled()
    })
  })
})
