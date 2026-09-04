/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render } from "@testing-library/react"

import {
  LabelValueListSurface,
  type LabelValueListLine,
} from "../LabelValueListSurface"

// ponytail: jsdom does not implement ResizeObserver; the autofit hook uses it
// only to re-measure on container resize, so a no-op stub is enough.
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

afterEach(cleanup)

function unitTexts(container: HTMLElement): string[] {
  const nodes = container.querySelectorAll("[data-sireno-text-size]")
  return Array.from(nodes)
    .map((n) => n.textContent ?? "")
    .filter((t) => t.length > 0)
}

describe("LabelValueListSurface", () => {
  it("uses long unit text in the big variant when unitLong is provided", () => {
    const lines: readonly [LabelValueListLine] = [
      { label: "Uptime", value: "2", units: "h", unitLong: "hours" },
    ]
    const { container } = render(<LabelValueListSurface lines={lines} />)
    const units = unitTexts(container)
    expect(units).toContain("hours")
    expect(units).not.toContain("h")
  })

  it("uses short units in the default variant when unitLong is provided", () => {
    const lines: readonly [LabelValueListLine, LabelValueListLine] = [
      { label: "Uptime", value: "2", units: "h", unitLong: "hours" },
      { label: "CPU", value: "42", units: "%" },
    ]
    const { container } = render(<LabelValueListSurface lines={lines} />)
    const units = unitTexts(container)
    expect(units).toContain("h")
    expect(units).not.toContain("hours")
    expect(units).toContain("%")
  })

  it("renders short units in the default variant when only units is provided", () => {
    const lines: readonly [LabelValueListLine, LabelValueListLine] = [
      { label: "CPU", value: "42", units: "%" },
      { label: "RAM", value: "60", units: "%" },
    ]
    const { container } = render(<LabelValueListSurface lines={lines} />)
    const units = unitTexts(container)
    expect(units.filter((t) => t === "%")).toHaveLength(2)
  })

  it("omits labels for compact lists", () => {
    const lines: readonly [
      LabelValueListLine,
      LabelValueListLine,
      LabelValueListLine,
    ] = [
      { label: "Cost", value: "$1.00" },
      { label: "Tokens", value: "100" },
      { label: "Context", value: "10", units: "%" },
    ]
    const { container } = render(<LabelValueListSurface lines={lines} />)

    expect(container.textContent).not.toContain("Cost")
    expect(container.textContent).not.toContain("Tokens")
    expect(container.textContent).not.toContain("Context")
    expect(container.textContent).toContain("$1.00")
    expect(container.textContent).toContain("100")
    expect(container.textContent).toContain("10")
    expect(container.textContent).toContain("%")
  })
})
