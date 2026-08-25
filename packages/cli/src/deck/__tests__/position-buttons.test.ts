import { describe, expect, it } from "vitest"

import { positionButtons } from "../position-buttons"

const btn = (position?: number) => ({ position, _tag: `p${position ?? "u"}` })
const tagged = (label: string, position?: number) => ({
  position,
  _tag: `${label}|p${position ?? "u"}`,
})

describe("positionButtons", () => {
  it("fills gaps sequentially when no positions set", () => {
    const input = [btn(), btn(), btn()]
    const result = positionButtons(input, 5)
    expect(result.map((b) => b.position)).toEqual([0, 1, 2])
  })

  it("keeps explicit positions (array order preserved)", () => {
    const input = [btn(5), btn(2), btn(7)]
    const result = positionButtons(input, 10)
    expect(result.map((b) => b.position)).toEqual([5, 2, 7])
  })

  it("first duplicate wins, later duplicate reflows into next gap", () => {
    const input = [btn(1), btn(1)]
    const result = positionButtons(input, 5)
    expect(result.map((b) => b.position)).toEqual([1, 0])
  })

  it("preserves positions ≥ keyCount (pagination handles overflow)", () => {
    const input = [btn(0), btn(99)]
    const result = positionButtons(input, 5)
    expect(result.map((b) => b.position)).toEqual([0, 99])
  })

  it("fills gaps after fixed positions", () => {
    const input = [btn(2), btn(), btn(0), btn()]
    const result = positionButtons(input, 5)
    expect(result.map((b) => b.position)).toEqual([2, 0, 1, 3])
  })

  it("never drops — exceeds keyCount when callers need it", () => {
    const input = [btn(0), btn(1), btn(2), btn(3), btn()]
    const result = positionButtons(input, 4)
    expect(result).toHaveLength(5)
    expect(result.map((b) => b.position)).toEqual([0, 1, 2, 3, 4])
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

  it("returns a sparse result of length = input length", () => {
    const result = positionButtons([btn(), btn(), btn()], 5)
    expect(result).toHaveLength(3)
    expect(result.every((b) => typeof b.position === "number")).toBe(true)
  })

  it("first duplicate wins, later duplicate reflows into next gap (3-button variant)", () => {
    const result = positionButtons(
      [tagged("a", 0), tagged("b", 0), tagged("c")],
      3,
    )
    expect(result.map((b) => b.position)).toEqual([0, 1, 2])
    expect(result.map((b) => b._tag)).toEqual(["a|p0", "b|p0", "c|pu"])
  })

  it("preserves overflow positions as ordering hints", () => {
    // explicit 11 keeps its slot-11 semantics; positionButtons no longer
    // strips positions ≥ keyCount because the internal pipeline assigns
    // every emitted button a position (the user's stated contract).
    // Array order is preserved: explicit positions stay, then unfixed
    // fill the smallest free slots.
    const cfg = [btn(2), btn(), btn(0), btn(), btn(11)]
    const six = positionButtons(cfg, 6)
    expect(six).toHaveLength(5)
    expect(six.map((b) => b.position)).toEqual([2, 0, 11, 1, 3])
    const fifteen = positionButtons(cfg, 15)
    expect(fifteen).toHaveLength(5)
    expect(fifteen.map((b) => b.position)).toEqual([2, 0, 11, 1, 3])
  })
})
