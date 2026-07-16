import { describe, expect, it, vi } from "vitest"

import {
  checkRequirements,
  formatCapabilityWarning,
  getRequiredCapability,
} from "@/system/requirements"
import type { CommandExecutor } from "./providers/shared"

const createExecutor = (
  availableCommands: ReadonlyArray<string>,
): CommandExecutor => ({
  run: vi.fn().mockImplementation(async (command, args) => {
    if (command !== "which" || args.length !== 1) {
      return { exitCode: 1, stdout: "", stderr: "" }
    }
    const target = args[0]
    if (availableCommands.includes(target)) {
      return { exitCode: 0, stdout: `/usr/bin/${target}`, stderr: "" }
    }
    return { exitCode: 1, stdout: "", stderr: "not found" }
  }),
})

describe("checkRequirements", () => {
  it("reports clipboard available when wl-copy is present", async () => {
    const executor = createExecutor(["wl-copy"])
    const result = await checkRequirements({
      platform: "linux",
      executor,
      env: {},
    })
    expect(result.clipboard.available).toBe(true)
    expect(result.clipboard.commands).toContain("wl-copy")
    expect(result.keyMacro.available).toBe(false)
    expect(result.keyMacro.missingCommands).toEqual([
      "ydotool",
      "xdotool",
      "dotool",
      "osascript",
    ])
  })

  it("reports keyMacro available when xdotool is present", async () => {
    const executor = createExecutor(["xdotool"])
    const result = await checkRequirements({
      platform: "linux",
      executor,
      env: {},
    })
    expect(result.keyMacro.available).toBe(true)
    expect(result.keyMacro.commands).toContain("xdotool")
    expect(result.clipboard.available).toBe(false)
    expect(result.clipboard.missingCommands).toEqual([
      "wl-copy",
      "xclip",
      "xsel",
      "pbcopy",
    ])
  })

  it("reports all missing when no tools are present", async () => {
    const executor = createExecutor([])
    const result = await checkRequirements({
      platform: "linux",
      executor,
      env: {},
    })
    expect(result.clipboard.available).toBe(false)
    expect(result.keyMacro.available).toBe(false)
  })

  it("reports both available when all tools are present", async () => {
    const executor = createExecutor(["wl-copy", "ydotool"])
    const result = await checkRequirements({
      platform: "linux",
      executor,
      env: {},
    })
    expect(result.clipboard.available).toBe(true)
    expect(result.keyMacro.available).toBe(true)
  })

  it("warns when preferred clipboard tool is missing on Wayland", async () => {
    const executor = createExecutor(["xclip"])
    const result = await checkRequirements({
      platform: "linux",
      executor,
      env: { WAYLAND_DISPLAY: "wayland-1" },
    })
    expect(result.clipboard.available).toBe(true)
    expect(result.clipboard.preferred).toBe("wl-copy")
    const warning = formatCapabilityWarning("clipboard", result.clipboard)
    expect(warning).toContain("wl-copy")
  })
})

describe("getRequiredCapability", () => {
  it("maps paste:// to clipboard", () => {
    expect(getRequiredCapability("paste://🔥")).toBe("clipboard")
  })

  it("maps macro:// to keyMacro", () => {
    expect(getRequiredCapability("macro://ctrl+c")).toBe("keyMacro")
  })

  it("returns null for other actions", () => {
    expect(getRequiredCapability("echo hello")).toBeNull()
  })
})
