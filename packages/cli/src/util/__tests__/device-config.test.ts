import { mkdtempSync, rmSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { loadDeviceConfig, saveDeviceConfig } from "../device-config"

let dir = ""
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "sireno-device-cfg-"))
})
afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe("device-config", () => {
  it("returns null when file missing", () => {
    expect(loadDeviceConfig({ xdgConfigHome: dir })).toBeNull()
  })

  it("roundtrip save -> load returns the same config", () => {
    saveDeviceConfig({
      xdgConfigHome: dir,
      config: { serial: "ABC", path: "/dev/hidraw0", model: "MK.2" },
    })
    expect(loadDeviceConfig({ xdgConfigHome: dir })).toEqual({
      serial: "ABC",
      path: "/dev/hidraw0",
      model: "MK.2",
    })
  })

  it("atomic write doesn't leave .tmp behind on success", () => {
    saveDeviceConfig({
      xdgConfigHome: dir,
      config: { serial: "X", path: "/p", model: "M" },
    })
    expect(existsSync(join(dir, "sirenodeck/device.json.tmp"))).toBe(false)
  })

  it("corrupt JSON returns null", () => {
    const path = join(dir, "sirenodeck/device.json")
    require("node:fs").mkdirSync(join(dir, "sirenodeck"), { recursive: true })
    require("node:fs").writeFileSync(path, "{not json", "utf8")
    expect(loadDeviceConfig({ xdgConfigHome: dir })).toBeNull()
  })
})
