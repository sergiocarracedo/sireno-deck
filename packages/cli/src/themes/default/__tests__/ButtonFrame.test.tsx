/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest"

import { ButtonFrame } from "@/ui"

describe("themes/default/ButtonFrame", () => {
  it("renders children inside a div with default frame tokens", () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root = document.createElement("div")
    container.appendChild(root)

    const React = require("react")
    const ReactDOM = require("react-dom/client")
    const act = require("react-dom/test-utils").act

    act(() => {
      ReactDOM.createRoot(root).render(
        React.createElement(ButtonFrame, {
          pressed: false,
          isTapping: false,
          isHolding: false,
          holdProgress: 0,
          buttonType: "test:btn",
          onPointerDown: () => undefined,
          onPointerUp: () => undefined,
          onPointerLeave: () => undefined,
          onClick: () => undefined,
          onDoubleClick: () => undefined,
          onContextMenu: () => undefined,
          children: React.createElement("span", null, "Hello"),
        }),
      )
    })

    const frame = root.querySelector('[data-sireno-button-frame="true"]')
    expect(frame).not.toBeNull()
    expect(frame?.getAttribute("data-variant")).toBe("default")
    expect(frame?.className).toContain("bg-bg")
    expect(frame?.className).toContain("rounded-2xl")
    expect(frame?.textContent).toContain("Hello")
  })

  it("renders error variant with red background", () => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root = document.createElement("div")
    container.appendChild(root)

    const React = require("react")
    const ReactDOM = require("react-dom/client")
    const act = require("react-dom/test-utils").act

    act(() => {
      ReactDOM.createRoot(root).render(
        React.createElement(ButtonFrame, {
          pressed: false,
          isTapping: false,
          isHolding: false,
          holdProgress: 0,
          buttonType: "test:btn",
          variant: "error",
          children: React.createElement("span", null, "Error"),
        }),
      )
    })

    const frame = root.querySelector('[data-sireno-button-frame="true"]')
    expect(frame).not.toBeNull()
    expect(frame?.getAttribute("data-variant")).toBe("error")
    expect(frame?.className).toContain("bg-red-600")
  })
})
