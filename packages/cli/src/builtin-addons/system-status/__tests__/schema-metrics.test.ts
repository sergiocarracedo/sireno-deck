import { describe, expect, it } from "vitest"

import { SystemStatusConfigSchema } from "../buttons/system-status/schemas"

describe("SystemStatusConfigSchema: metrics entry shape", () => {
  it("accepts a plain string metric id (shorthand)", () => {
    const parsed = SystemStatusConfigSchema.parse({
      type: "bars",
      metrics: ["cpu"],
    })
    expect(parsed.pages).toEqual([{ type: "bars", metrics: [{ id: "cpu" }] }])
  })

  it("accepts the object form with a custom label", () => {
    const parsed = SystemStatusConfigSchema.parse({
      type: "bars",
      metrics: [
        { id: "cpu", label: "CPU" },
        { id: "ram", label: "RAM" },
        "disk",
      ],
    })
    expect(parsed.pages[0]!.metrics).toEqual([
      { id: "cpu", label: "CPU" },
      { id: "ram", label: "RAM" },
      { id: "disk" },
    ])
  })

  it("accepts multi-page config", () => {
    const parsed = SystemStatusConfigSchema.parse({
      pages: [
        { type: "bars", metrics: ["cpu"] },
        { type: "kpis", metrics: ["ram"] },
      ],
    })
    expect(parsed.pages).toHaveLength(2)
    expect(parsed.pages[0]!.type).toBe("bars")
    expect(parsed.pages[1]!.type).toBe("kpis")
  })

  it("rejects an unknown metric id", () => {
    expect(() =>
      SystemStatusConfigSchema.parse({ type: "bars", metrics: ["bogus"] }),
    ).toThrow()
  })

  it("rejects an empty metrics array", () => {
    expect(() =>
      SystemStatusConfigSchema.parse({ type: "bars", metrics: [] }),
    ).toThrow()
  })

  it("rejects more than three metrics on a bars page", () => {
    expect(() =>
      SystemStatusConfigSchema.parse({
        type: "bars",
        metrics: ["cpu", "ram", "disk", "network"],
      }),
    ).toThrow()
  })

  it("rejects an empty label string on the object form", () => {
    expect(() =>
      SystemStatusConfigSchema.parse({
        type: "bars",
        metrics: [{ id: "cpu", label: "" }],
      }),
    ).toThrow()
  })

  it("rejects extra fields on the metric entry", () => {
    expect(() =>
      SystemStatusConfigSchema.parse({
        type: "bars",
        metrics: [{ id: "cpu", color: "red" }],
      }),
    ).toThrow()
  })

  it("rejects more than 5 pages", () => {
    expect(() =>
      SystemStatusConfigSchema.parse({
        pages: Array.from({ length: 6 }, () => ({
          type: "bars",
          metrics: ["cpu"],
        })),
      }),
    ).toThrow()
  })

  it("accepts a chart page with windowSeconds", () => {
    const parsed = SystemStatusConfigSchema.parse({
      type: "chart",
      metrics: ["cpu"],
      windowSeconds: 30,
    })
    const page = parsed.pages[0]!
    expect(page.type).toBe("chart")
    if (page.type === "chart") {
      expect(page.windowSeconds).toBe(30)
    }
  })
})
