import { describe, expect, it } from "vitest"

import type { CommandExecutor } from "@/system/providers/shared"
import { buildMediaAddonChecks } from "../checks"

const fakeExecutor = (present: ReadonlyArray<string>): CommandExecutor => ({
  async run(command, args) {
    if (command === "command" && args[0] === "-v" && args[1] !== undefined) {
      return {
        exitCode: present.includes(args[1]) ? 0 : 1,
        stdout: present.includes(args[1]) ? `/usr/bin/${args[1]}` : "",
        stderr: "",
      }
    }
    return { exitCode: 0, stdout: "", stderr: "" }
  },
})

describe("buildMediaAddonChecks", () => {
  it("returns one check named 'media-control'", () => {
    const checks = buildMediaAddonChecks({
      platform: "linux",
      executor: fakeExecutor(["playerctl", "wpctl"]),
    })
    expect(checks).toHaveLength(1)
    expect(checks[0]?.name).toBe("media-control")
  })

  it("returns available: true on linux when playerctl + wpctl both present", async () => {
    const checks = buildMediaAddonChecks({
      platform: "linux",
      executor: fakeExecutor(["playerctl", "wpctl"]),
    })
    const result = await checks[0]!.check()
    expect(result.available).toBe(true)
  })

  it("returns available: false on linux when playerctl missing", async () => {
    const checks = buildMediaAddonChecks({
      platform: "linux",
      executor: fakeExecutor(["wpctl"]),
    })
    const result = await checks[0]!.check()
    expect(result.available).toBe(false)
    expect(result.reason).toContain("playerctl")
  })

  it("returns available: false on linux when wpctl missing", async () => {
    const checks = buildMediaAddonChecks({
      platform: "linux",
      executor: fakeExecutor(["playerctl"]),
    })
    const result = await checks[0]!.check()
    expect(result.available).toBe(false)
    expect(result.reason).toContain("wpctl")
  })

  it("returns available: true on darwin when osascript present", async () => {
    const checks = buildMediaAddonChecks({
      platform: "darwin",
      executor: fakeExecutor(["osascript"]),
    })
    const result = await checks[0]!.check()
    expect(result.available).toBe(true)
  })

  it("returns available: false on darwin when osascript missing", async () => {
    const checks = buildMediaAddonChecks({
      platform: "darwin",
      executor: fakeExecutor([]),
    })
    const result = await checks[0]!.check()
    expect(result.available).toBe(false)
    expect(result.reason).toContain("osascript")
  })

  it("returns available: true on win32 when powershell present", async () => {
    const checks = buildMediaAddonChecks({
      platform: "win32",
      executor: fakeExecutor(["powershell"]),
    })
    const result = await checks[0]!.check()
    expect(result.available).toBe(true)
  })

  it("returns available: false on win32 when powershell missing", async () => {
    const checks = buildMediaAddonChecks({
      platform: "win32",
      executor: fakeExecutor([]),
    })
    const result = await checks[0]!.check()
    expect(result.available).toBe(false)
    expect(result.reason).toContain("powershell")
  })

  it("returns available: false on unsupported platform", async () => {
    const checks = buildMediaAddonChecks({
      platform: "freebsd" as NodeJS.Platform,
      executor: fakeExecutor([]),
    })
    const result = await checks[0]!.check()
    expect(result.available).toBe(false)
    expect(result.reason).toContain("unsupported")
  })
})
