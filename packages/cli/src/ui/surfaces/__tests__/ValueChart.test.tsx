/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"

import { ValueChart, type ValueChartSeries } from "../ValueChart"

function singleSeries(
  overrides: Partial<ValueChartSeries> = {},
): readonly [ValueChartSeries] {
  return [
    {
      id: "cpu",
      color: "#34d399",
      icon: "icon://cpu",
      points: [
        { at: Date.now() - 4000, value: 50 },
        { at: Date.now() - 3000, value: 60 },
        { at: Date.now() - 2000, value: 45 },
        { at: Date.now() - 1000, value: 70 },
      ],
      yMax: 100,
      ...overrides,
    },
  ]
}

function twoSeries(): readonly [ValueChartSeries, ValueChartSeries] {
  return [
    {
      id: "cpu",
      color: "#34d399",
      icon: "icon://cpu",
      points: [{ at: Date.now() - 1000, value: 50 }],
      yMax: 100,
    },
    {
      id: "ram",
      color: "#f59e0b",
      icon: "icon://memory-stick",
      points: [{ at: Date.now() - 1000, value: 60 }],
      yMax: 100,
    },
  ]
}

describe("ValueChart", () => {
  it("renders an SVG path for one series", () => {
    const { container } = render(
      <ValueChart series={singleSeries()} windowSeconds={60} />,
    )
    const svg = container.querySelector('svg[preserveAspectRatio="none"]')!
    const chartPaths = svg.querySelectorAll("path")
    expect(chartPaths.length).toBe(1)
    expect(chartPaths[0]!.getAttribute("d")).not.toBe("")
  })

  it("renders two SVG paths for two series", () => {
    const { container } = render(
      <ValueChart series={twoSeries()} windowSeconds={60} />,
    )
    const svg = container.querySelector('svg[preserveAspectRatio="none"]')!
    const chartPaths = svg.querySelectorAll("path")
    expect(chartPaths.length).toBe(2)
    expect(chartPaths[0]!.getAttribute("stroke")).toBe("#34d399")
    expect(chartPaths[1]!.getAttribute("stroke")).toBe("#f59e0b")
  })

  it("throws when given three series", () => {
    const three = [
      ...twoSeries(),
      {
        id: "disk",
        color: "#3b82f6",
        icon: "icon://hard-drive",
        points: [{ at: Date.now() - 1000, value: 30 }],
        yMax: 100,
      },
    ] as unknown as readonly [ValueChartSeries, ValueChartSeries]
    expect(() =>
      render(<ValueChart series={three} windowSeconds={60} />),
    ).toThrow(/supports 1-2 series/)
  })

  it("renders legend icon and value for each series", () => {
    const { container } = render(
      <ValueChart
        series={singleSeries({
          points: [{ at: Date.now() - 1000, value: 73 }],
        })}
        windowSeconds={60}
      />,
    )
    const legends = container.querySelectorAll("[data-sireno-icon-source]")
    expect(legends.length).toBe(1)
    expect(container.textContent).toContain("73")
  })

  it("renders baseline line when all points are outside window", () => {
    const old = Date.now() - 120_000
    const { container } = render(
      <ValueChart
        series={singleSeries({ points: [{ at: old, value: 50 }] })}
        windowSeconds={10}
      />,
    )
    const lines = container.querySelectorAll("line")
    expect(lines.length).toBe(1)
  })

  it("clips points older than windowSeconds", () => {
    const now = Date.now()
    const points = [
      { at: now - 120_000, value: 10 },
      { at: now - 40_000, value: 20 },
      { at: now - 20_000, value: 30 },
    ]
    const { container } = render(
      <ValueChart series={singleSeries({ points })} windowSeconds={60} />,
    )
    // Points at 40s and 20s ago are within 60s window; 120s ago is clipped
    const svg = container.querySelector('svg[preserveAspectRatio="none"]')!
    const paths = svg.querySelectorAll("path")
    // A single series → one path (the clipped series has 2 points)
    // Point 1: value 20 → y = (100-20) = 80
    // Point 2: value 30 → y = (100-30) = 70
    expect(paths.length).toBe(1)
    const d = paths[0]!.getAttribute("d")!
    expect(d).toContain("80.0")
    expect(d).toContain("70.0")
    // The 10-value point should NOT appear (would be y=90)
    expect(d).not.toContain("90.0")
  })

  it("displays latest value in legend even when clipped", () => {
    const now = Date.now()
    const points = [
      { at: now - 120_000, value: 10 },
      { at: now - 1000, value: 99 },
    ]
    const { container } = render(
      <ValueChart series={singleSeries({ points })} windowSeconds={10} />,
    )
    expect(container.textContent).toContain("99")
  })
})
