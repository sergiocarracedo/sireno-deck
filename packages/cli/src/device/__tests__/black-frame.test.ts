import { afterEach, describe, expect, it, vi } from "vitest"

import { pushBlackFrame } from "../black-frame"

describe("pushBlackFrame", () => {
  afterEach(() => vi.useRealTimers())

  it("blanks every key without changing device brightness", async () => {
    vi.useFakeTimers()
    const device = {
      getKeyCount: () => 2,
      fillKeyBuffer: vi.fn(async () => undefined),
      setBrightness: vi.fn(async () => undefined),
    }
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
    }

    const push = pushBlackFrame(device as never, logger as never)
    await vi.runAllTimersAsync()
    await push

    expect(device.fillKeyBuffer).toHaveBeenCalledTimes(2)
    expect(device.fillKeyBuffer).toHaveBeenNthCalledWith(
      1,
      0,
      Buffer.alloc(72 * 72 * 3),
    )
    expect(device.setBrightness).not.toHaveBeenCalled()
  })
})
