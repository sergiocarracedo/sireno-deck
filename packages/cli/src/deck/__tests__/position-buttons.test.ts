import { describe, expect, it } from "vitest"

import { positionButtons } from "../position-buttons"

const btn = (position?: number) => ({ position, _tag: `p${position ?? "u"}` })

describe("positionButtons", () => {
  it("fills gaps sequentially when no positions set", () => {
    const input = [btn(), btn(), btn()]
    const result = positionButtons(input, 5)
    expect(result.map((b) => b.position)).toEqual([0, 1, 2])
  })

  it("respects explicit positions", () => {
    const input = [btn(5), btn(2), btn(7)]
    const result = positionButtons(input, 10)
    expect(result.map((b) => b.position)).toEqual([5, 2, 7])
  })

  it("bumps duplicate to next gap", () => {
    const input = [btn(1), btn(1)]
    const result = positionButtons(input, 5)
    expect(result.map((b) => b.position)).toEqual([1, 0])
  })

  it("drops overflow positions", () => {
    const input = [btn(0), btn(99)]
    const result = positionButtons(input, 5)
    expect(result.map((b) => b.position)).toEqual([0])
  })

  it("fills gaps after fixed positions", () => {
    const input = [btn(2), btn(), btn(0), btn()]
    const result = positionButtons(input, 5)
    expect(result.map((b) => b.position)).toEqual([2, 0, 1, 3])
  })

  it("drops excess when keyCount exhausted", () => {
    const input = [btn(0), btn(1), btn(2), btn(3), btn()]
    const result = positionButtons(input, 4)
    expect(result).toHaveLength(4)
  })

  it("handles empty input", () => {
    expect(positionButtons([], 5)).toEqual([])
  })

  it("preserves button identity beyond position", () => {
    const a = { position: 1, id: "a", type: "x" }
    const b = { position: undefined, id: "b", type: "y" }
    const result = positionButtons([a, b], 5)
    expect(result[0]).toBe(a)
    expect(result[1]?.id).toBe("b")
    expect(result[1]?.position).toBe(0)
  })
})
