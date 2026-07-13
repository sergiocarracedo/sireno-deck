import { describe, expect, it } from "vitest"

import { DEVICE_MODELS, isKnownDeviceModel, resolveKeyCount } from "../models"

describe("device/models", () => {
  it("recognizes Stream Deck Original V2 (productId 0x006d)", () => {
    expect(isKnownDeviceModel("originalv2")).toBe(true)
    expect(resolveKeyCount("originalv2")).toBe(15)
  })

  it("recognizes Stream Deck Original (productId 0x0060)", () => {
    expect(isKnownDeviceModel("original")).toBe(true)
    expect(resolveKeyCount("original")).toBe(15)
  })

  it("DEVICE_MODELS keeps originals and the MK.2 on the same 15-key grid", () => {
    const fifteenKeyModels = DEVICE_MODELS.filter((m) => m.keyCount === 15)
    expect(fifteenKeyModels.map((m) => m.id)).toEqual(
      expect.arrayContaining(["original", "originalv2", "mk2"]),
    )
    for (const m of fifteenKeyModels) {
      expect(m.columns).toBe(5)
      expect(m.rows).toBe(3)
    }
  })
})
