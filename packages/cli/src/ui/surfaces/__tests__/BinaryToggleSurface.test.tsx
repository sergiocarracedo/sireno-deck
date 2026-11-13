/** @vitest-environment jsdom */
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { BinaryToggleSurface } from "../BinaryToggleSurface"

describe("BinaryToggleSurface", () => {
  it.each([true, false])("shows only the %s state", (status) => {
    const { getByRole, queryByText } = render(
      <BinaryToggleSurface label="Work" status={status} />,
    )
    const indicator = getByRole("img", { name: status ? "On" : "Off" })
    expect(indicator.className).toContain(status ? "bg-accent" : "bg-danger")
    expect(indicator.style.width).toBe("40px")
    expect(indicator.style.height).toBe("7px")
    expect(indicator.style.boxShadow).toBe(status ? "0 0 6px currentColor" : "")
    expect(queryByText("ON")).toBeNull()
    expect(queryByText("OFF")).toBeNull()
  })

  it("places the indicator in a dedicated bottom row", () => {
    const { getByRole } = render(
      <BinaryToggleSurface
        label="Long calendar name"
        details="Account"
        status
      />,
    )
    expect(getByRole("img", { name: "On" }).parentElement?.className).toContain(
      "self-end",
    )
  })

  it("darkens only the off surface without dimming its content", () => {
    const { container, rerender } = render(
      <BinaryToggleSurface label="Work" status={false} />,
    )
    expect(container.firstElementChild?.className).toContain(
      "before:bg-black/40",
    )
    rerender(<BinaryToggleSurface label="Work" status />)
    expect(container.firstElementChild?.className).not.toContain(
      "before:bg-black/40",
    )
  })

  it("preserves the label's case and applies its color", () => {
    const { getByText } = render(
      <BinaryToggleSurface label="My calendar" labelColor="#aa55cc" status />,
    )
    const label = getByText("My calendar")
    expect(label.style.color).toBe("rgb(170, 85, 204)")
    expect(label.className).not.toContain("uppercase")
  })

  it("renders an icon only when supplied", () => {
    const { container, rerender } = render(
      <BinaryToggleSurface label="Work" status />,
    )
    expect(container.querySelector("[data-sireno-ui-icon]")).toBeNull()
    rerender(
      <BinaryToggleSurface label="Work" status source="icon://calendar" />,
    )
    expect(container.querySelector("[data-sireno-ui-icon]")).not.toBeNull()
  })
})
