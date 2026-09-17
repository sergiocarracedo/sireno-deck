import { describe, expect, it } from "vitest"

import { parseMacmonSample } from "../domain/live-metrics"

// Verbatim from `macmon pipe --samples 1` on a Mac17,6 (M5 Max, macOS 26),
// trimmed to the keys this reads.
const REAL = JSON.stringify({
  temp: { cpu_temp_avg: 56.67721939086914, gpu_temp_avg: 52.20405578613281 },
  fans: [
    { max_rpm: 5349, name: "fan0", rpm: 3336 },
    { max_rpm: 5777, name: "fan1", rpm: 3597 },
  ],
  cpu_power: 27.407024383544922,
})

describe("parseMacmonSample", () => {
  it("reads cpu temp, gpu temp and fan rpm from a real sample", () => {
    const s = parseMacmonSample(REAL)
    expect(s?.cpuTemp).toBeCloseTo(56.677, 2)
    expect(s?.gpuTemp).toBeCloseTo(52.204, 2)
    // Several fans: report the one doing the work, not an average.
    expect(s?.fanRpm).toBe(3597)
  })

  it("tolerates the newline-delimited stream `pipe` emits", () => {
    expect(parseMacmonSample(`${REAL}\n${REAL}\n`)?.fanRpm).toBe(3597)
  })

  it("reports no fan on a passively cooled machine", () => {
    // An empty array is "this Mac has no fans", which is not 0 RPM.
    const s = parseMacmonSample(JSON.stringify({ temp: {}, fans: [] }))
    expect(s?.fanRpm).toBeNull()
    expect(s?.cpuTemp).toBeNull()
  })

  it("ignores a fan reporting zero", () => {
    const s = parseMacmonSample(
      JSON.stringify({ temp: {}, fans: [{ name: "fan0", rpm: 0 }] }),
    )
    expect(s?.fanRpm).toBeNull()
  })

  it("returns null rather than throwing on junk", () => {
    expect(parseMacmonSample("not json")).toBeNull()
    expect(parseMacmonSample("")).toBeNull()
    expect(parseMacmonSample("{broken")).toBeNull()
  })

  it("survives missing keys", () => {
    const s = parseMacmonSample("{}")
    expect(s).not.toBeNull()
    expect(s?.cpuTemp).toBeNull()
    expect(s?.fanRpm).toBeNull()
  })
})
