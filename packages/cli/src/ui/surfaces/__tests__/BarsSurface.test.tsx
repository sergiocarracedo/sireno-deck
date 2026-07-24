/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"

import { BarsSurface, type BarsItem } from "../BarsSurface"

function singleItem(overrides: Partial<BarsItem> = {}): readonly [BarsItem] {
  return [
    {
      title: "CPU",
      value: 50,
      maxValue: 100,
      color: "#34d399",
      ...overrides,
    },
  ]
}

describe("BarsSurface", () => {
  it("renders both clipped layers with correct clip-path for partial fill", () => {
    const { container } = render(
      <BarsSurface items={singleItem({ value: 50 })} />,
    )
    const layers = container.querySelectorAll("[data-sireno-bars-layer]")
    expect(layers).toHaveLength(2)

    const aboveLayer = container.querySelector(
      '[data-sireno-bars-layer="above"]',
    )
    const overLayer = container.querySelector('[data-sireno-bars-layer="over"]')
    expect(aboveLayer).not.toBeNull()
    expect(overLayer).not.toBeNull()
    expect((aboveLayer as HTMLElement).style.clipPath).toBe("inset(0 0 50% 0)")
    expect((overLayer as HTMLElement).style.clipPath).toBe("inset(50% 0 0 0)")
  })

  it("renders zero fill with both layers fully clipped to opposite halves", () => {
    const { container } = render(
      <BarsSurface items={singleItem({ value: 0 })} />,
    )
    const aboveLayer = container.querySelector(
      '[data-sireno-bars-layer="above"]',
    ) as HTMLElement
    const overLayer = container.querySelector(
      '[data-sireno-bars-layer="over"]',
    ) as HTMLElement
    expect(aboveLayer.style.clipPath).toBe("inset(0 0 0% 0)")
    expect(overLayer.style.clipPath).toBe("inset(100% 0 0 0)")
  })

  it("renders full fill with both layers fully clipped to opposite halves", () => {
    const { container } = render(
      <BarsSurface items={singleItem({ value: 100 })} />,
    )
    const aboveLayer = container.querySelector(
      '[data-sireno-bars-layer="above"]',
    ) as HTMLElement
    const overLayer = container.querySelector(
      '[data-sireno-bars-layer="over"]',
    ) as HTMLElement
    expect(aboveLayer.style.clipPath).toBe("inset(0 0 100% 0)")
    expect(overLayer.style.clipPath).toBe("inset(0% 0 0 0)")
  })

  it("paints the above-fill layer with the bar color and the over-fill layer with a muted color", () => {
    const { container } = render(
      <BarsSurface items={singleItem({ color: "#34d399", value: 30 })} />,
    )
    const aboveLayer = container.querySelector(
      '[data-sireno-bars-layer="above"]',
    ) as HTMLElement
    const overLayer = container.querySelector(
      '[data-sireno-bars-layer="over"]',
    ) as HTMLElement
    expect(aboveLayer.style.color).toBe("rgb(52, 211, 153)")
    expect(overLayer.style.color).toContain("color-mix")
  })

  it("renders the units in a smaller size than the value when both are provided", () => {
    const { container } = render(
      <BarsSurface
        items={singleItem({ displayValue: "5.2", units: "MB/s", value: 60 })}
      />,
    )
    const layers = container.querySelectorAll("[data-sireno-bars-layer]")
    const sizes: string[] = []
    for (const layer of Array.from(layers)) {
      const valueText = layer.querySelector('[data-sireno-text-size="sm"]')
      const unitText = layer.querySelector('[data-sireno-text-size="xs"]')
      expect(valueText).not.toBeNull()
      expect(unitText).not.toBeNull()
      sizes.push(
        (valueText as HTMLElement).getAttribute("data-sireno-text-size") ?? "",
      )
    }
    expect(sizes.every((s) => s === "sm")).toBe(true)
  })

  it("renders a single Text when units are absent", () => {
    const { container } = render(
      <BarsSurface items={singleItem({ displayValue: "42", value: 42 })} />,
    )
    const layers = container.querySelectorAll("[data-sireno-bars-layer]")
    for (const layer of Array.from(layers)) {
      const sizeSm = layer.querySelectorAll('[data-sireno-text-size="sm"]')
      const sizeXs = layer.querySelectorAll('[data-sireno-text-size="xs"]')
      expect(sizeSm).toHaveLength(1)
      expect(sizeXs).toHaveLength(0)
    }
  })

  it("accepts displayValue alone as the value text (no units required)", () => {
    const { container } = render(
      <BarsSurface items={singleItem({ displayValue: "100", value: 100 })} />,
    )
    const layers = container.querySelectorAll("[data-sireno-bars-layer]")
    for (const layer of Array.from(layers)) {
      expect(layer.textContent).toBe("100")
    }
  })

  it("falls back to Math.round(value) when displayValue is omitted", () => {
    const { container } = render(
      <BarsSurface items={singleItem({ value: 73 })} />,
    )
    const layers = container.querySelectorAll("[data-sireno-bars-layer]")
    for (const layer of Array.from(layers)) {
      expect(layer.textContent).toBe("73")
    }
  })

  it("honors barMaxWidthClass on the bar fill container", () => {
    const { container } = render(
      <BarsSurface
        barMaxWidthClass="max-w-[40px]"
        items={singleItem({ value: 25 })}
      />,
    )
    const fill = container.querySelector('[data-sireno-bars-fill="true"]')
    expect(fill).not.toBeNull()
    const barContainer = fill?.parentElement
    expect(barContainer?.className).toContain("max-w-[40px]")
  })

  it("throws when given more than three items", () => {
    expect(() =>
      render(
        <BarsSurface
          items={
            [
              { title: "a", value: 1, maxValue: 1 },
              { title: "b", value: 1, maxValue: 1 },
              { title: "c", value: 1, maxValue: 1 },
              { title: "d", value: 1, maxValue: 1 },
            ] as unknown as readonly [BarsItem, BarsItem, BarsItem]
          }
        />,
      ),
    ).toThrow(/Bars supports 1-3 items/)
  })
})
