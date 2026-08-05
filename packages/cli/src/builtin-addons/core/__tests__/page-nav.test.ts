import { describe, expect, it, vi } from "vitest"

import PageNavBackend from "../buttons/page-nav/backend"

const makeCtx = (config: {
  currentPage: number
  totalPages: number
  prevDeckId: string
  nextDeckId: string
}) => {
  const publish = vi.fn()
  return {
    ctx: {
      config,
      buttonId: "page-nav",
      position: 13,
      addonName: "core",
      methods: Object.freeze({}),
      publish,
      executor: { run: vi.fn() } as never,
      signal: new AbortController().signal,
      store: { buttonScope: vi.fn() } as never,
    },
    publish,
  }
}

describe("core:page-nav backend", () => {
  it("onTap navigates to nextDeckId with addToHistory: false", async () => {
    const { ctx, publish } = makeCtx({
      currentPage: 1,
      totalPages: 3,
      prevDeckId: "deck-base",
      nextDeckId: "deck-p2",
    })
    await PageNavBackend.onTap!(ctx)
    expect(publish).toHaveBeenCalledWith("runtime:navigate-deck", {
      deckId: "deck-p2",
      addToHistory: false,
      buttonId: "page-nav",
      position: 13,
    })
  })

  it("onHold navigates to prevDeckId with addToHistory: false", async () => {
    const { ctx, publish } = makeCtx({
      currentPage: 2,
      totalPages: 3,
      prevDeckId: "deck-p1",
      nextDeckId: "deck-p3",
    })
    await PageNavBackend.onHold!(ctx)
    expect(publish).toHaveBeenCalledWith("runtime:navigate-deck", {
      deckId: "deck-p1",
      addToHistory: false,
      buttonId: "page-nav",
      position: 13,
    })
  })

  it("onDblTap is not defined (we migrated to onHold)", () => {
    expect(PageNavBackend.onDblTap).toBeUndefined()
  })

  it("onHold on first page navigates back to the base deck", async () => {
    const { ctx, publish } = makeCtx({
      currentPage: 1,
      totalPages: 5,
      prevDeckId: "deck-base",
      nextDeckId: "deck-p2",
    })
    await PageNavBackend.onHold!(ctx)
    expect(publish).toHaveBeenCalledWith("runtime:navigate-deck", {
      deckId: "deck-base",
      addToHistory: false,
      buttonId: "page-nav",
      position: 13,
    })
  })

  it("onTap on last page navigates to the base deck", async () => {
    const { ctx, publish } = makeCtx({
      currentPage: 5,
      totalPages: 5,
      prevDeckId: "deck-p4",
      nextDeckId: "deck-base",
    })
    await PageNavBackend.onTap!(ctx)
    expect(publish).toHaveBeenCalledWith("runtime:navigate-deck", {
      deckId: "deck-base",
      addToHistory: false,
      buttonId: "page-nav",
      position: 13,
    })
  })

  it("only one navigate-deck event fires per gesture (no double dispatch)", async () => {
    const tapCtx = (() => {
      const { ctx, publish } = makeCtx({
        currentPage: 2,
        totalPages: 3,
        prevDeckId: "deck-p1",
        nextDeckId: "deck-p3",
      })
      return { ctx, publish }
    })()
    await PageNavBackend.onTap!(tapCtx.ctx)
    expect(tapCtx.publish).toHaveBeenCalledTimes(1)

    const holdCtx = (() => {
      const { ctx, publish } = makeCtx({
        currentPage: 2,
        totalPages: 3,
        prevDeckId: "deck-p1",
        nextDeckId: "deck-p3",
      })
      return { ctx, publish }
    })()
    await PageNavBackend.onHold!(holdCtx.ctx)
    expect(holdCtx.publish).toHaveBeenCalledTimes(1)
  })
})

describe("core:page-nav backend configSchema", () => {
  it("accepts valid config", () => {
    const result = PageNavBackend.configSchema.safeParse({
      currentPage: 1,
      totalPages: 3,
      prevDeckId: "deck-p0",
      nextDeckId: "deck-p2",
    })
    expect(result.success).toBe(true)
  })

  it("rejects currentPage < 1", () => {
    const result = PageNavBackend.configSchema.safeParse({
      currentPage: 0,
      totalPages: 3,
      prevDeckId: "deck-p0",
      nextDeckId: "deck-p2",
    })
    expect(result.success).toBe(false)
  })

  it("rejects totalPages < 1", () => {
    const result = PageNavBackend.configSchema.safeParse({
      currentPage: 1,
      totalPages: 0,
      prevDeckId: "deck-p0",
      nextDeckId: "deck-p2",
    })
    expect(result.success).toBe(false)
  })

  it("rejects empty deck id strings", () => {
    const result = PageNavBackend.configSchema.safeParse({
      currentPage: 1,
      totalPages: 3,
      prevDeckId: "",
      nextDeckId: "deck-p2",
    })
    expect(result.success).toBe(false)
  })
})
