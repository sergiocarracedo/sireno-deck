import { describe, expect, it, vi } from "vitest"

import type { StreamDeckDeviceHandle } from "./stream-deck"
import {
  _resetDeviceRegistryForTests,
  getCurrentBrightness,
  getOpenDeviceHandles,
  registerDeviceHandle,
  setBrightnessAll,
  unregisterDeviceHandle,
} from "./registry"

function makeHandle(overrides: Partial<StreamDeckDeviceHandle> = {}): StreamDeckDeviceHandle {
  return {
    clearPanel: async () => {},
    close: async () => {},
    fillKeyBuffer: async () => {},
    setBrightness: async () => {},
    ...overrides,
  }
}

describe("device registry", () => {
  it("starts empty after reset", () => {
    _resetDeviceRegistryForTests()
    expect(getOpenDeviceHandles()).toEqual([])
  })

  it("register and unregister round-trip", () => {
    _resetDeviceRegistryForTests()
    const a = makeHandle()
    const b = makeHandle()
    registerDeviceHandle(a)
    registerDeviceHandle(b)
    expect(getOpenDeviceHandles()).toHaveLength(2)
    expect(getOpenDeviceHandles()).toContain(a)
    expect(getOpenDeviceHandles()).toContain(b)
    unregisterDeviceHandle(a)
    expect(getOpenDeviceHandles()).toHaveLength(1)
    expect(getOpenDeviceHandles()).not.toContain(a)
    expect(getOpenDeviceHandles()).toContain(b)
  })

  it("getOpenDeviceHandles returns a snapshot copy (mutating the result does not affect the registry)", () => {
    _resetDeviceRegistryForTests()
    const a = makeHandle()
    registerDeviceHandle(a)
    const snapshot = getOpenDeviceHandles()
    expect(snapshot).toHaveLength(1)
    expect(() => {
      ;(snapshot as StreamDeckDeviceHandle[]).push(makeHandle())
    }).not.toThrow()
    expect(getOpenDeviceHandles()).toHaveLength(1)
  })

  it("setBrightnessAll happy path: all handles succeed", async () => {
    _resetDeviceRegistryForTests()
    const a = makeHandle({ setBrightness: vi.fn().mockResolvedValue(undefined) })
    const b = makeHandle({ setBrightness: vi.fn().mockResolvedValue(undefined) })
    registerDeviceHandle(a)
    registerDeviceHandle(b)
    const result = await setBrightnessAll(50)
    expect(result).toEqual({ succeeded: 2, failed: 0, errors: [] })
    expect(a.setBrightness).toHaveBeenCalledWith(50)
    expect(b.setBrightness).toHaveBeenCalledWith(50)
  })

  it("setBrightnessAll partial failure: one mock throws, the other succeeds; logger.warn is called", async () => {
    _resetDeviceRegistryForTests()
    const successHandle = makeHandle({
      setBrightness: vi.fn().mockResolvedValue(undefined),
    })
    const failureHandle = makeHandle({
      setBrightness: vi.fn().mockRejectedValue(new Error("device disconnected")),
    })
    registerDeviceHandle(successHandle)
    registerDeviceHandle(failureHandle)
    const warnMock = vi.fn()
    const result = await setBrightnessAll(75, { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: warnMock })
    expect(result).toEqual({
      succeeded: 1,
      failed: 1,
      errors: ["device disconnected"],
    })
    expect(successHandle.setBrightness).toHaveBeenCalledWith(75)
    expect(failureHandle.setBrightness).toHaveBeenCalledWith(75)
    expect(warnMock).toHaveBeenCalledTimes(1)
    const [logArg, message] = warnMock.mock.calls[0]!
    expect(message).toBe("setBrightnessAll: device failed")
    expect(logArg).toMatchObject({ percentage: 75 })
  })

  it("setBrightnessAll total failure: all handles throw; result reports all errors", async () => {
    _resetDeviceRegistryForTests()
    const a = makeHandle({
      setBrightness: vi.fn().mockRejectedValue(new Error("a broken")),
    })
    const b = makeHandle({
      setBrightness: vi.fn().mockRejectedValue(new Error("b broken")),
    })
    registerDeviceHandle(a)
    registerDeviceHandle(b)
    const result = await setBrightnessAll(0)
    expect(result).toEqual({
      succeeded: 0,
      failed: 2,
      errors: ["a broken", "b broken"],
    })
  })

  it("setBrightnessAll with no open handles returns a zero result", async () => {
    _resetDeviceRegistryForTests()
    const result = await setBrightnessAll(50)
    expect(result).toEqual({ succeeded: 0, failed: 0, errors: [] })
  })

  it("registry isolation: _resetDeviceRegistryForTests clears state between tests", () => {
    const a = makeHandle()
    registerDeviceHandle(a)
    expect(getOpenDeviceHandles()).toHaveLength(1)
    _resetDeviceRegistryForTests()
    expect(getOpenDeviceHandles()).toHaveLength(0)
  })

  it("getCurrentBrightness returns 50 by default", () => {
    _resetDeviceRegistryForTests()
    expect(getCurrentBrightness()).toBe(50)
  })

  it("setBrightnessAll updates the shared currentBrightness", async () => {
    _resetDeviceRegistryForTests()
    const a = makeHandle({ setBrightness: vi.fn().mockResolvedValue(undefined) })
    registerDeviceHandle(a)
    await setBrightnessAll(75)
    expect(getCurrentBrightness()).toBe(75)
    await setBrightnessAll(0)
    expect(getCurrentBrightness()).toBe(0)
  })
})
