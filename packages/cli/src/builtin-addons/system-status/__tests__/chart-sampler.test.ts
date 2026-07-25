/** @vitest-environment node */
import { beforeEach, describe, expect, it } from "vitest"

import {
  CHART_HISTORY_CHANNEL,
  RING_CAPACITY,
  feedSampler,
  getSamplerState,
  resetSampler,
} from "../domain/chart-sampler"

describe("chart-sampler", () => {
  beforeEach(() => {
    resetSampler()
  })

  it("returns empty state before any feed", () => {
    const state = getSamplerState()
    expect(state.samples).toEqual({})
  })

  it("stores samples up to RING_CAPACITY", () => {
    for (let i = 0; i < RING_CAPACITY; i++) {
      feedSampler("cpu", i, Date.now() + i * 1000)
    }

    const state = getSamplerState()
    expect(state.samples.cpu).toHaveLength(RING_CAPACITY)
  })

  it("drops oldest sample when over capacity", () => {
    for (let i = 0; i < RING_CAPACITY + 5; i++) {
      feedSampler("cpu", i, Date.now() + i * 1000)
    }

    const state = getSamplerState()
    expect(state.samples.cpu!.length).toBe(RING_CAPACITY)
    expect(state.samples.cpu![0]!.value).toBe(5)
  })

  it("stores multiple metrics independently", () => {
    feedSampler("cpu", 50, Date.now())
    feedSampler("ram", 60, Date.now())

    const state = getSamplerState()
    expect(state.samples.cpu!.length).toBe(1)
    expect(state.samples.ram!.length).toBe(1)
    expect(state.samples.cpu![0]!.value).toBe(50)
    expect(state.samples.ram![0]!.value).toBe(60)
  })

  it("resets state after resetSampler", () => {
    feedSampler("cpu", 50, Date.now())
    resetSampler()
    const state = getSamplerState()
    expect(state.samples).toEqual({})
  })
})

// ponytail: CHART_HISTORY_CHANNEL is used as the poller channel in manifest
describe("CHART_HISTORY_CHANNEL constant", () => {
  it("matches the channel used in the manifest", () => {
    expect(CHART_HISTORY_CHANNEL).toBe("runtime:system-status:chart-history")
  })
})
