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

  it("returns a sparse array (length equals assigned count, not keyCount)", () => {
    // Three buttons on a keyCount of 5 — output should have exactly 3 entries
    // even though there are empty slots at positions 3 and 4.
    const result = positionButtons([btn(), btn(), btn()], 5)
    expect(result).toHaveLength(3)
    expect(result.every((b) => typeof b.position === "number")).toBe(true)
  })

  it("drops overflow positions without emitting them", () => {
    // explicit position 7 is out of range; the sparse result has only 1 button.
    const result = positionButtons([btn(0), btn(7)], 5)
    expect(result).toHaveLength(1)
    expect(result[0]?.position).toBe(0)
  })

  it("first duplicate wins, later duplicate reflows into next gap", () => {
    // duplicates of position 0 — first button wins slot 0, second reflows
    // into slot 1 (next empty), and the trailing unfixed button fills slot 2.
    const result = positionButtons([btn(0), btn(0), btn()], 3)
    expect(result.map((b) => b.position)).toEqual([0, 1, 2])
  })

  it("same config produces layouts of the right length for any keyCount", () => {
    const cfg = [btn(2), btn(), btn(0), btn(), btn(11)]
    const six = positionButtons(cfg, 6)
    const fifteen = positionButtons(cfg, 15)
    // explicit 11 dropped (overflow on keyCount=6). The other 4 buttons fit.
    expect(six).toHaveLength(4)
    expect(six.map((b) => b.position)).toEqual([2, 0, 1, 3])
    // on keyCount=15, all 5 fit (push order: explicit 2, 0, 11; unfixed fills 1, 3).
    expect(fifteen).toHaveLength(5)
    expect(fifteen.map((b) => b.position)).toEqual([2, 0, 11, 1, 3])
  })
})
