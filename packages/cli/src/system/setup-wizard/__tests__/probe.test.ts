import { describe, expect, it, vi } from "vitest"

import type { CommandExecutor } from "@/system/providers/shared"
import { probeAll } from "../probe"

const noFsProbe = (_command: string): boolean => false

const createExecutor = (
  availableCommands: ReadonlyArray<string>,
): CommandExecutor => ({
  run: vi.fn().mockImplementation(async (command, args) => {
    if (command === "sh" && args[0] === "-c" && args.length === 2) {
      const script = args[1] ?? ""
      const match = script.match(/^command -v (.+)$/)
      if (match) {
        const target = match[1]!.replaceAll(`'`, "")
        if (availableCommands.includes(target)) {
          return { exitCode: 0, stdout: `/usr/bin/${target}`, stderr: "" }
        }
        return { exitCode: 1, stdout: "", stderr: "not found" }
      }
    }
    if (args[0] === "--version" && availableCommands.includes(command)) {
      return { exitCode: 0, stdout: `${command} 1.0`, stderr: "" }
    }
    return { exitCode: 1, stdout: "", stderr: "" }
  }),
})

const fileExists = (path: string): boolean =>
  path === "/etc/udev/rules.d/70-sireno-deck.rules"

describe("probeAll", () => {
  it("reports keyMacro available on Linux when ydotool is present", async () => {
    const executor = createExecutor(["ydotool"])
    const report = await probeAll({
      platform: "linux",
      homeDir: "/home/u",
      xdgConfigHome: "/home/u/.config",
      env: {},
      executor,
      extraFsProbe: noFsProbe,
      fileExists: () => false,
      readFile: () => null,
    })
    expect(report.capabilities.keyMacro.available).toBe(true)
    expect(report.capabilities.keyMacro.missing).toEqual([
      "wtype",
      "xdotool",
      "dotool",
    ])
    expect(report.capabilities.keyMacro.preferred).toBe("ydotool")
  })

  it("reports keyMacro missing on Linux when no tools are present", async () => {
    const executor = createExecutor([])
    const report = await probeAll({
      platform: "linux",
      homeDir: "/home/u",
      xdgConfigHome: "/home/u/.config",
      env: {},
      executor,
      extraFsProbe: noFsProbe,
      fileExists: () => false,
      readFile: () => null,
    })
    expect(report.capabilities.keyMacro.available).toBe(false)
    expect(report.capabilities.keyMacro.missing).toEqual(
      expect.arrayContaining(["ydotool", "wtype", "xdotool", "dotool"]),
    )
  })

  it("reports clipboard preferred wl-copy on Wayland when missing", async () => {
    const executor = createExecutor([])
    const report = await probeAll({
      platform: "linux",
      homeDir: "/home/u",
      xdgConfigHome: "/home/u/.config",
      env: { XDG_SESSION_TYPE: "wayland", WAYLAND_DISPLAY: "wayland-0" },
      executor,
      extraFsProbe: noFsProbe,
      fileExists: () => false,
      readFile: () => null,
    })
    expect(report.session).toBe("wayland")
    expect(report.capabilities.clipboard.preferred).toBe("wl-copy")
    expect(report.capabilities.clipboard.missing).toEqual(["wl-copy"])
  })

  it("reports clipboard preferred xclip on X11 when missing", async () => {
    const executor = createExecutor([])
    const report = await probeAll({
      platform: "linux",
      homeDir: "/home/u",
      xdgConfigHome: "/home/u/.config",
      env: { DISPLAY: ":0" },
      executor,
      extraFsProbe: noFsProbe,
      fileExists: () => false,
      readFile: () => null,
    })
    expect(report.session).toBe("x11")
    expect(report.capabilities.clipboard.preferred).toBe("xclip")
  })

  it("uses extraFsProbe when which fails (stripped PATH)", async () => {
    const executor = createExecutor([])
    const report = await probeAll({
      platform: "linux",
      homeDir: "/home/u",
      xdgConfigHome: "/home/u/.config",
      env: {},
      executor,
      extraFsProbe: (cmd) => cmd === "ydotool",
      fileExists: () => false,
      readFile: () => null,
    })
    expect(report.capabilities.keyMacro.available).toBe(true)
  })

  it("reports osascript available on darwin and no udev probe", async () => {
    const executor = createExecutor(["osascript", "pbcopy"])
    const report = await probeAll({
      platform: "darwin",
      homeDir: "/Users/u",
      xdgConfigHome: "/Users/u/.config",
      env: {},
      executor,
      extraFsProbe: noFsProbe,
      fileExists: () => false,
      readFile: () => null,
    })
    expect(report.capabilities.keyMacro.available).toBe(true)
    expect(report.capabilities.clipboard.available).toBe(true)
    expect(report.capabilities.notification.available).toBe(true)
    expect(report.capabilities.activeApp.available).toBe(true)
    expect(report.udev.rulesInstalled).toBe(true)
  })

  it("reports powershell available on win32", async () => {
    const executor = createExecutor(["powershell"])
    const report = await probeAll({
      platform: "win32",
      homeDir: "C:/Users/u",
      xdgConfigHome: "C:/Users/u/.config",
      env: {},
      executor,
      extraFsProbe: noFsProbe,
      fileExists: () => false,
      readFile: () => null,
    })
    expect(report.capabilities.keyMacro.preferred).toBe("powershell")
    expect(report.capabilities.notification.preferred).toBe("powershell")
  })

  it("treats Wayland+GNOME active-app as available (extension-installed) but flags reason with install URL", async () => {
    const executor = createExecutor(["wl-copy", "ydotool", "notify-send"])
    const report = await probeAll({
      platform: "linux",
      homeDir: "/home/u",
      xdgConfigHome: "/home/u/.config",
      env: {
        XDG_SESSION_TYPE: "wayland",
        WAYLAND_DISPLAY: "wayland-0",
        XDG_CURRENT_DESKTOP: "ubuntu:GNOME",
      },
      executor,
      extraFsProbe: noFsProbe,
      fileExists: () => false,
      readFile: () => null,
    })
    expect(report.session).toBe("wayland")
    expect(report.capabilities.activeApp.available).toBe(true)
    expect(report.capabilities.activeApp.preferred).toBe(
      "gnome-shell-extension",
    )
    expect(report.capabilities.activeApp.reason).toContain(
      "Window Calls Extended",
    )
  })

  it("detects Stream Deck via injected lsusb output", async () => {
    vi.doMock("node:child_process", () => ({
      execFileSync: (cmd: string) => {
        if (
          cmd === "lsusb" ||
          cmd === "/usr/bin/lsusb" ||
          cmd === "/usr/sbin/lsusb"
        ) {
          return Buffer.from(
            "Bus 001 Device 005: ID 0fd9:0086 Elgato Stream Deck MK.2\n",
          )
        }
        throw new Error("not found")
      },
    }))
    vi.resetModules()
    const { probeAll: probeAllFresh } = await import("../probe")
    const executor = createExecutor([])
    const report = await probeAllFresh({
      platform: "linux",
      homeDir: "/home/u",
      xdgConfigHome: "/home/u/.config",
      env: {},
      executor,
      extraFsProbe: noFsProbe,
      fileExists: () => false,
      readFile: () => null,
    })
    vi.doUnmock("node:child_process")
    expect(report.udev.streamDeckConnected).toBe(true)
    expect(report.udev.matchedProductIds).toContain("0086")
  })

  it("reports config missing when target path does not exist", async () => {
    const executor = createExecutor([])
    const report = await probeAll({
      platform: "linux",
      homeDir: "/home/u",
      xdgConfigHome: "/home/u/.config",
      env: {},
      executor,
      extraFsProbe: noFsProbe,
      fileExists: () => false,
      readFile: () => null,
    })
    expect(report.config.exists).toBe(false)
    expect(report.config.path).toBe("/home/u/.config/sireno-deck/config.yml")
  })

  it("detects package manager apt when /usr/bin/apt-get is present", async () => {
    const executor = createExecutor(["apt-get"])
    const report = await probeAll({
      platform: "linux",
      homeDir: "/home/u",
      xdgConfigHome: "/home/u/.config",
      env: {},
      executor,
      extraFsProbe: noFsProbe,
      fileExists: () => false,
      readFile: () => null,
    })
    expect(report.packageManager).toBe("apt")
  })

  it("reports package manager none when no manager is present", async () => {
    const executor = createExecutor([])
    const report = await probeAll({
      platform: "linux",
      homeDir: "/home/u",
      xdgConfigHome: "/home/u/.config",
      env: {},
      executor,
      extraFsProbe: noFsProbe,
      fileExists: () => false,
      readFile: () => null,
    })
    expect(report.packageManager).toBe("none")
  })

  it("reports udev rules installed when fileExists returns true at the canonical path", async () => {
    const executor = createExecutor([])
    const report = await probeAll({
      platform: "linux",
      homeDir: "/home/u",
      xdgConfigHome: "/home/u/.config",
      env: {},
      executor,
      extraFsProbe: noFsProbe,
      fileExists: fileExists,
      readFile: () => null,
    })
    expect(report.udev.rulesInstalled).toBe(true)
    expect(report.udev.rulesPath).toBe("/etc/udev/rules.d/70-sireno-deck.rules")
  })

  it("returns session 'unknown' when no display env is set", async () => {
    const executor = createExecutor([])
    const report = await probeAll({
      platform: "linux",
      homeDir: "/home/u",
      xdgConfigHome: "/home/u/.config",
      env: {},
      executor,
      extraFsProbe: noFsProbe,
      fileExists: () => false,
      readFile: () => null,
    })
    expect(report.session).toBe("unknown")
  })
})
