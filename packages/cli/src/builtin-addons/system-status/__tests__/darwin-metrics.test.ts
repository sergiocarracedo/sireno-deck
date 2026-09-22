import { describe, expect, it } from "vitest"

import {
  parseDarwinBattery,
  parseDarwinDiskBytes,
  parseDarwinGpuUtilization,
  parseDarwinNetstat,
  parseDarwinSwap,
} from "../domain/live-metrics"

// Fixtures are trimmed but otherwise verbatim output from a macOS 26 /
// Apple Silicon machine.

describe("parseDarwinSwap", () => {
  it("parses sysctl vm.swapusage into bytes", () => {
    const raw =
      "total = 15360.00M  used = 14146.44M  free = 1213.56M  (encrypted)"
    const out = parseDarwinSwap(raw)
    expect(out).not.toBeNull()
    expect(out!.totalBytes).toBeCloseTo(15360 * 1024 ** 2, 0)
    expect(out!.usedBytes).toBeCloseTo(14146.44 * 1024 ** 2, 0)
  })

  it("honours the K/M/G suffix", () => {
    expect(
      parseDarwinSwap("total = 2.00G  used = 1.00G  free = 1.00G")?.totalBytes,
    ).toBe(2 * 1024 ** 3)
  })

  it("returns null when swap is disabled (zero total)", () => {
    expect(
      parseDarwinSwap("total = 0.00M  used = 0.00M  free = 0.00M"),
    ).toBeNull()
  })

  it("returns null on unparseable input", () => {
    expect(parseDarwinSwap("nonsense")).toBeNull()
  })
})

describe("parseDarwinBattery", () => {
  it("reads the percentage out of pmset -g batt", () => {
    const raw =
      "Now drawing from 'AC Power'\n -InternalBattery-0 (id=22937699)\t100%; charged; 0:00 remaining present: true"
    expect(parseDarwinBattery(raw)).toBe(100)
  })

  it("handles a partial charge while discharging", () => {
    expect(
      parseDarwinBattery(
        " -InternalBattery-0 (id=1)\t47%; discharging; 3:12 remaining present: true",
      ),
    ).toBe(47)
  })

  it("returns null when no battery is present", () => {
    expect(parseDarwinBattery("Now drawing from 'AC Power'")).toBeNull()
  })
})

describe("parseDarwinNetstat", () => {
  // Only the <Link#N> rows carry per-interface totals; the address rows repeat
  // the same counters, so summing every row would double-count.
  const raw = [
    "Name       Mtu   Network       Address            Ipkts Ierrs     Ibytes    Opkts Oerrs     Obytes  Coll",
    "lo0        16384 <Link#1>                       7251503     0 2801475738  7251503     0 2801475738     0",
    "lo0        16384 127           127.0.0.1        7251503     - 2801475738  7251503     - 2801475738     -",
    "en0        1500  <Link#11>  aa:bb:cc:dd:ee:ff   1000     0     500000     900     0     250000     0",
    "en0        1500  192.168.1     192.168.1.5       1000     -     500000     900     -     250000     -",
  ].join("\n")

  it("sums only the Link rows of real interfaces", () => {
    expect(parseDarwinNetstat(raw)).toEqual({ rx: 500000, tx: 250000 })
  })

  it("skips loopback and virtual interfaces", () => {
    const out = parseDarwinNetstat(raw)!
    // lo0 contributes 2.8 GB; if it leaked in the totals would dwarf en0.
    expect(out.rx).toBeLessThan(1_000_000)
  })

  it("returns null when the header is missing", () => {
    expect(parseDarwinNetstat("garbage\nmore garbage")).toBeNull()
  })
})

describe("parseDarwinGpuUtilization", () => {
  it("reads Device Utilization % from IOAccelerator", () => {
    const raw =
      '"PerformanceStatistics" = {"Tiler Utilization %"=6,"Renderer Utilization %"=12,"Device Utilization %"=37,"SplitSceneCount"=0}'
    expect(parseDarwinGpuUtilization(raw)).toBe(37)
  })

  it("prefers Device Utilization over the per-engine figures", () => {
    const raw = '"Renderer Utilization %"=99,"Device Utilization %"=5'
    expect(parseDarwinGpuUtilization(raw)).toBe(5)
  })

  it("returns null when the key is absent", () => {
    expect(parseDarwinGpuUtilization('"Alloc system memory"=123')).toBeNull()
  })
})

describe("parseDarwinDiskBytes", () => {
  // ioreg lists several IOBlockStorageDriver nodes; only the backing store has
  // non-zero counters, so the sum is what matters.
  it("sums read and write byte counters across devices", () => {
    const raw = [
      '"Statistics" = {"Bytes (Read)"=0,"Bytes (Write)"=0}',
      '"Statistics" = {"Bytes (Read)"=517059211264,"Bytes (Write)"=381199343616}',
      '"Statistics" = {"Bytes (Read)"=0,"Bytes (Write)"=0}',
    ].join("\n")
    expect(parseDarwinDiskBytes(raw)).toBe(517059211264 + 381199343616)
  })

  it("returns null when no counters are present", () => {
    expect(parseDarwinDiskBytes('"Operations (Read)"=5')).toBeNull()
  })

  it("treats an all-zero tree as a real zero, not as missing", () => {
    expect(parseDarwinDiskBytes('"Bytes (Read)"=0,"Bytes (Write)"=0')).toBe(0)
  })
})
