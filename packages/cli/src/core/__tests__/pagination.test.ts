import { describe, expect, it } from "vitest"

import { NEXT_PAGE_MARKER, paginate } from "../pagination"

describe("paginate", () => {
  it("empty list returns 0 pages", () => {
    const result = paginate<string>([], { keyCount: 15 })
    expect(result.pages).toHaveLength(0)
    expect(result.totalItems).toBe(0)
  })

  it("list <= pageSize returns 1 page, no marker", () => {
    const result = paginate(["a", "b", "c"], { keyCount: 15 })
    expect(result.pages).toHaveLength(1)
    const page = result.pages[0]!
    expect(page.items.filter((i) => i !== null)).toHaveLength(3)
    expect(page.items).not.toContain(NEXT_PAGE_MARKER)
    expect(page.hasNext).toBe(false)
    expect(page.hasPrev).toBe(false)
  })

  it("list exactly pageSize returns 1 page, no marker", () => {
    const result = paginate<string>(
      Array.from({ length: 13 }, (_, i) => `i${i}`),
      { keyCount: 15 },
    )
    expect(result.pages).toHaveLength(1)
    const page = result.pages[0]!
    expect(page.items).toHaveLength(13)
    expect(page.items).not.toContain(NEXT_PAGE_MARKER)
  })

  it("list pageSize+1 returns 2 pages, marker on every page", () => {
    const result = paginate<string>(
      Array.from({ length: 14 }, (_, i) => `i${i}`),
      { keyCount: 15 },
    )
    expect(result.pages).toHaveLength(2)
    for (const page of result.pages) {
      expect(page.items.some((it) => it?.value === NEXT_PAGE_MARKER)).toBe(true)
    }
    expect(result.pages[0]!.hasNext).toBe(true)
    expect(result.pages[1]!.hasNext).toBe(false)
    expect(result.pages[1]!.hasPrev).toBe(true)
  })

  it("list 3×pageSize+2 returns 4 pages, marker on every page", () => {
    const result = paginate<string>(
      Array.from({ length: 41 }, (_, i) => `i${i}`),
      { keyCount: 15 },
    )
    expect(result.pages).toHaveLength(4)
    for (let i = 0; i < 4; i++) {
      expect(
        result.pages[i]!.items.some((it) => it?.value === NEXT_PAGE_MARKER),
      ).toBe(true)
      expect(result.pages[i]!.hasNext).toBe(i < 3)
    }
  })

  it("final page shorter than pageSize is padded with nulls", () => {
    const result = paginate<string>(
      Array.from({ length: 16 }, (_, i) => `i${i}`),
      { keyCount: 15 },
    )
    expect(result.pages).toHaveLength(2)
    const last = result.pages[1]!
    expect(last.items).toHaveLength(13)
    const nulls = last.items.filter((i) => i === null)
    expect(nulls.length).toBeGreaterThan(0)
  })

  it("hasNext is true on all but last page", () => {
    const result = paginate<string>(
      Array.from({ length: 50 }, (_, i) => `i${i}`),
      { keyCount: 15 },
    )
    for (let i = 0; i < result.pages.length - 1; i++) {
      expect(result.pages[i]!.hasNext).toBe(true)
    }
    expect(result.pages[result.pages.length - 1]!.hasNext).toBe(false)
  })

  it("totalPages matches page count", () => {
    const result = paginate<string>(
      Array.from({ length: 100 }, (_, i) => `i${i}`),
      { keyCount: 15 },
    )
    for (const page of result.pages) {
      expect(page.totalPages).toBe(result.pages.length)
    }
  })

  it("throws on keyCount <= 0", () => {
    expect(() => paginate(["a"], { keyCount: 0 })).toThrow()
  })

  it("throws on pageSize <= 0", () => {
    expect(() => paginate(["a"], { keyCount: 2, pageSize: 0 })).toThrow()
  })
})
