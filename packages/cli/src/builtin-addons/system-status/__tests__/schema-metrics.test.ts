import { describe, expect, it } from "vitest"

import { GenericSystemStatusSchema } from "../buttons/generic/schemas"

describe("GenericSystemStatusSchema: metrics entry shape", () => {
  it("accepts a plain string metric id (shorthand)", () => {
    const parsed = GenericSystemStatusSchema.parse({
      metrics: ["cpu"],
    })
    expect(parsed.metrics).toEqual([{ id: "cpu" }])
  })

  it("accepts the object form with a custom label", () => {
    const parsed = GenericSystemStatusSchema.parse({
      metrics: [
        { id: "cpu", label: "CPU" },
        { id: "ram", label: "RAM" },
        "disk",
      ],
    })
    expect(parsed.metrics).toEqual([
      { id: "cpu", label: "CPU" },
      { id: "ram", label: "RAM" },
      { id: "disk" },
    ])
  })

  it("rejects an unknown metric id", () => {
    expect(() =>
      GenericSystemStatusSchema.parse({ metrics: ["bogus"] }),
    ).toThrow()
  })

  it("rejects an empty metrics array", () => {
    expect(() => GenericSystemStatusSchema.parse({ metrics: [] })).toThrow()
  })

  it("rejects more than three metrics", () => {
    expect(() =>
      GenericSystemStatusSchema.parse({
        metrics: ["cpu", "ram", "disk", "network"],
      }),
    ).toThrow()
  })

  it("rejects an empty label string on the object form", () => {
    expect(() =>
      GenericSystemStatusSchema.parse({
        metrics: [{ id: "cpu", label: "" }],
      }),
    ).toThrow()
  })
})
