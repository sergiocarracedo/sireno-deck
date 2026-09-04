import { describe, expect, it, vi } from "vitest"

import backend from "../backend"

describe("media player service", () => {
  it.each([
    ["onTap", "media:toggle"],
    ["onDblTap", "media:previous"],
    ["onHold", "media:next"],
  ] as const)("maps %s to %s", async (handler, method) => {
    const action = vi.fn(async () => undefined)
    await backend[handler]?.({
      methods: { [method]: action },
    } as never)

    expect(action).toHaveBeenCalledOnce()
  })
})
