import { describe, expect, it } from "vitest"

import { pagesSchema } from "../paginated-schema"
import { z } from "zod"

const page = z.object({ type: z.enum(["a", "b"]), value: z.number() }).strict()

describe("pagesSchema", () => {
  it("normalizes a single object to { pages: [object] }", () => {
    const schema = pagesSchema(page)
    const result = schema.parse({ type: "a", value: 1 })
    expect(result).toEqual({ pages: [{ type: "a", value: 1 }] })
  })

  it("passes through an array as { pages: array }", () => {
    const schema = pagesSchema(page)
    const result = schema.parse([
      { type: "a", value: 1 },
      { type: "b", value: 2 },
    ])
    expect(result).toEqual({
      pages: [
        { type: "a", value: 1 },
        { type: "b", value: 2 },
      ],
    })
  })

  it("passes through an explicit { pages: [...] } form", () => {
    const schema = pagesSchema(page)
    const result = schema.parse({
      pages: [{ type: "a", value: 1 }],
    })
    expect(result).toEqual({ pages: [{ type: "a", value: 1 }] })
  })

  it("rejects an empty array", () => {
    const schema = pagesSchema(page)
    expect(() => schema.parse([])).toThrow()
  })

  it("rejects more than 5 pages", () => {
    const schema = pagesSchema(page)
    const pages = Array.from({ length: 6 }, (_, i) => ({
      type: i % 2 === 0 ? "a" : "b",
      value: i,
    }))
    expect(() => schema.parse(pages)).toThrow()
  })

  it("rejects invalid page objects", () => {
    const schema = pagesSchema(page)
    expect(() => schema.parse([{ type: "a" }])).toThrow()
  })
})
