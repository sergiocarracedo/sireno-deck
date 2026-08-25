import { describe, expect, it } from "vitest"

import type { AddonCheck } from "../api"
import { runAddonChecks } from "../check-runner"

const passing = (): AddonCheck => ({
  name: "ok",
  check: async () => ({ available: true }),
})

const failing = (reason: string): AddonCheck => ({
  name: "missing",
  check: async () => ({ available: false, reason }),
})

const throwing = (): AddonCheck => ({
  name: "boom",
  check: async () => {
    throw new Error("provider not loaded")
  },
})

describe("runAddonChecks", () => {
  it("returns empty array when no addons have checks", async () => {
    const result = await runAddonChecks([{ name: "weather" }, { name: "time" }])
    expect(result).toEqual([])
  })

  it("runs checks in parallel across addons", async () => {
    const a: AddonCheck = {
      name: "a",
      check: async () => {
        await new Promise((r) => setTimeout(r, 10))
        return { available: true }
      },
    }
    const b: AddonCheck = {
      name: "b",
      check: async () => {
        await new Promise((r) => setTimeout(r, 10))
        return { available: true }
      },
    }
    const start = Date.now()
    const result = await runAddonChecks([
      { name: "x", checks: [a] },
      { name: "y", checks: [b] },
    ])
    const elapsed = Date.now() - start
    expect(result).toHaveLength(2)
    expect(elapsed).toBeLessThan(50)
  })

  it("returns available: true for passing checks", async () => {
    const result = await runAddonChecks([
      { name: "media", checks: [passing()] },
    ])
    expect(result[0]).toEqual({
      addonName: "media",
      checkName: "ok",
      available: true,
    })
  })

  it("returns available: false with reason for failing checks", async () => {
    const result = await runAddonChecks([
      { name: "media", checks: [failing("install playerctl")] },
    ])
    expect(result[0]).toEqual({
      addonName: "media",
      checkName: "missing",
      available: false,
      reason: "install playerctl",
    })
  })

  it("returns available: false with check-error reason when check throws", async () => {
    const result = await runAddonChecks([
      { name: "media", checks: [throwing()] },
    ])
    expect(result[0]).toEqual({
      addonName: "media",
      checkName: "boom",
      available: false,
      reason: "check error: provider not loaded",
    })
  })

  it("produces one outcome per check when an addon has multiple checks", async () => {
    const result = await runAddonChecks([
      { name: "media", checks: [passing(), failing("x")] },
    ])
    expect(result).toHaveLength(2)
    expect(result[0]?.available).toBe(true)
    expect(result[1]?.available).toBe(false)
  })
})
