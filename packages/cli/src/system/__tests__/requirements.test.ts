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
    if (command === "command" && args[0] === "-v" && args.length === 2) {
      const target = args[1]
      if (target !== undefined && availableCommands.includes(target)) {
        return { exitCode: 0, stdout: `/usr/bin/${target}`, stderr: "" }
      }
      return { exitCode: 1, stdout: "", stderr: "not found" }
    }
    if (args[0] === "--version" && availableCommands.includes(command)) {
      return { exitCode: 0, stdout: `${command} 1.0`, stderr: "" }
    }
    return { exitCode: 1, stdout: "", stderr: "" }
  }),
})

describe("checkRequirements", () => {
  it("reports keyMacro available when ydotool is present", async () => {
    const executor = createExecutor(["ydotool"])
    const result = await checkRequirements({
      platform: "linux",
      executor,
      env: {},
    })
    expect(result.keyMacro.available).toBe(true)
    expect(result.keyMacro.commands).toContain("ydotool")
    expect(result.keyMacro.preferred).toBe("ydotool")
  })

  it("reports keyMacro available when wtype is present (wlroots fallback)", async () => {
    const executor = createExecutor(["wtype"])
    const result = await checkRequirements({
      platform: "linux",
      executor,
      env: {},
    })
    expect(result.keyMacro.available).toBe(true)
    expect(result.keyMacro.commands).toContain("wtype")
  })

  it("reports keyMacro available when osascript is present (macOS)", async () => {
    const executor = createExecutor(["osascript"])
    const result = await checkRequirements({
      platform: "darwin",
      executor,
      env: {},
    })
    expect(result.keyMacro.available).toBe(true)
    expect(result.keyMacro.commands).toContain("osascript")
    expect(result.keyMacro.preferred).toBe("osascript")
  })

  it("reports keyMacro available when powershell is present (Windows)", async () => {
    const executor = createExecutor(["powershell"])
    const result = await checkRequirements({
      platform: "win32",
      executor,
      env: {},
    })
    expect(result.keyMacro.available).toBe(true)
    expect(result.keyMacro.commands).toContain("powershell")
    expect(result.keyMacro.preferred).toBe("powershell")
  })

  it("reports keyMacro missing when no tools are present", async () => {
    const executor = createExecutor([])
    const result = await checkRequirements({
      platform: "linux",
      executor,
      env: {},
    })
    expect(result.keyMacro.available).toBe(false)
  })

  it("reports clipboard available when wl-copy is present (Wayland)", async () => {
    const executor = createExecutor(["wl-copy"])
    const result = await checkRequirements({
      platform: "linux",
      executor,
      env: { WAYLAND_DISPLAY: "wayland-1" },
    })
    expect(result.clipboard.available).toBe(true)
    expect(result.clipboard.commands).toContain("wl-copy")
    expect(result.clipboard.preferred).toBe("wl-copy")
  })

  it("reports clipboard available when xclip is present (X11)", async () => {
    const executor = createExecutor(["xclip"])
    const result = await checkRequirements({
      platform: "linux",
      executor,
      env: {},
    })
    expect(result.clipboard.available).toBe(true)
    expect(result.clipboard.preferred).toBe("xclip")
  })

  it("reports clipboard missing when no clipboard tools are present", async () => {
    const executor = createExecutor([])
    const result = await checkRequirements({
      platform: "linux",
      executor,
      env: {},
    })
    expect(result.clipboard.available).toBe(false)
    expect(result.clipboard.missingCommands).toEqual(
      expect.arrayContaining(["wl-copy", "xclip", "xsel", "pbcopy"]),
    )
  })

  it("uses extraFsProbe as fallback when which fails (stripped PATH)", async () => {
    const executor = createExecutor([])
    const extraFsProbe = (command: string): boolean => command === "ydotool"
    const result = await checkRequirements({
      platform: "linux",
      executor,
      env: {},
      extraFsProbe,
    })
    expect(result.keyMacro.available).toBe(true)
    expect(result.keyMacro.commands).toContain("ydotool")
  })

  it("treats extraFsProbe=false the same as no probe", async () => {
    const executor = createExecutor([])
    const extraFsProbe = (_command: string): boolean => false
    const result = await checkRequirements({
      platform: "linux",
      executor,
      env: {},
      extraFsProbe,
    })
    expect(result.keyMacro.available).toBe(false)
  })

  it("formatCapabilityWarning returns empty when preferred tool is available", async () => {
    const executor = createExecutor(["ydotool", "wl-copy"])
    const result = await checkRequirements({
      platform: "linux",
      executor,
      env: { WAYLAND_DISPLAY: "wayland-1" },
    })
    expect(formatCapabilityWarning("keyMacro", result.keyMacro)).toBe("")
    expect(formatCapabilityWarning("clipboard", result.clipboard)).toBe("")
  })

  it("formatCapabilityWarning flags missing preferred when fallback in place", async () => {
    const executor = createExecutor(["xclip"])
    const result = await checkRequirements({
      platform: "linux",
      executor,
      env: { WAYLAND_DISPLAY: "wayland-1" },
    })
    const warning = formatCapabilityWarning("clipboard", result.clipboard)
    expect(warning).toContain("wl-copy")
  })

  it("formatCapabilityWarning emits missing-tools line when nothing is available", async () => {
    const executor = createExecutor([])
    const result = await checkRequirements({
      platform: "linux",
      executor,
      env: {},
    })
    expect(formatCapabilityWarning("clipboard", result.clipboard)).toContain(
      "none of",
    )
  })

  it("reports notification available when notify-send is present (Linux)", async () => {
    const executor = createExecutor(["notify-send"])
    const result = await checkRequirements({
      platform: "linux",
      executor,
      env: {},
    })
    expect(result.notification.available).toBe(true)
    expect(result.notification.commands).toContain("notify-send")
    expect(result.notification.preferred).toBe("notify-send")
  })

  it("reports notification available when osascript is present (macOS)", async () => {
    const executor = createExecutor(["osascript"])
    const result = await checkRequirements({
      platform: "darwin",
      executor,
      env: {},
    })
    expect(result.notification.available).toBe(true)
    expect(result.notification.preferred).toBe("osascript")
  })

  it("reports notification available when powershell is present (Windows)", async () => {
    const executor = createExecutor(["powershell"])
    const result = await checkRequirements({
      platform: "win32",
      executor,
      env: {},
    })
    expect(result.notification.available).toBe(true)
    expect(result.notification.preferred).toBe("powershell")
  })

  it("reports notification missing when no notification tools are present", async () => {
    const executor = createExecutor([])
    const result = await checkRequirements({
      platform: "linux",
      executor,
      env: {},
    })
    expect(result.notification.available).toBe(false)
  })
})

describe("getRequiredCapability", () => {
  it("maps type:// to keyMacro", () => {
    expect(getRequiredCapability("type://🔥")).toBe("keyMacro")
  })

  it("maps type:// with combo to keyMacro", () => {
    expect(getRequiredCapability("type://ctrl+c")).toBe("keyMacro")
  })

  it("maps macro:// to keyMacro", () => {
    expect(getRequiredCapability("macro://ctrl+c")).toBe("keyMacro")
  })

  it("returns null for non-type actions", () => {
    expect(getRequiredCapability("echo hello")).toBeNull()
  })
})
