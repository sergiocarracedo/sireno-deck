import { describe, expect, it } from "vitest"

import { buildInstallPlan, needsConfigSeed } from "../plan"
import type { SystemReport } from "../types"

const baseReport = (overrides: Partial<SystemReport> = {}): SystemReport => ({
  platform: "linux",
  homeDir: "/home/u",
  xdgConfigHome: "/home/u/.config",
  session: "x11",
  packageManager: "apt",
  capabilities: {
    keyMacro: {
      name: "keyMacro",
      available: false,
      missing: ["ydotool", "wtype", "xdotool", "dotool"],
      preferred: "ydotool",
      reason: "Install ydotool.",
    },
    clipboard: {
      name: "clipboard",
      available: false,
      missing: ["xclip", "xsel"],
      preferred: "xclip",
      reason: "Install xclip.",
    },
    notification: {
      name: "notification",
      available: false,
      missing: ["notify-send"],
      preferred: "notify-send",
      reason: "Install libnotify.",
    },
    activeApp: {
      name: "activeApp",
      available: false,
      missing: ["xdotool", "xprop"],
      preferred: "xdotool",
      reason: "Install xdotool.",
    },
  },
  udev: {
    rulesInstalled: false,
    rulesPath: "/etc/udev/rules.d/70-sireno-deck.rules",
    streamDeckConnected: false,
    matchedProductIds: [],
  },
  config: { exists: false, path: "/home/u/.config/sireno-deck/config.yml" },
  ...overrides,
})

describe("buildInstallPlan", () => {
  it("produces one step per missing capability on Linux X11 with apt", () => {
    const plan = buildInstallPlan(baseReport())
    const ids = plan.map((s) => s.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        "cap:keyMacro",
        "cap:clipboard",
        "cap:notification",
        "cap:activeApp",
        "udev:rules",
      ]),
    )
    expect(plan.length).toBe(5)
  })

  it("keyMacro step uses sudo and the apt ydotool package on apt", () => {
    const plan = buildInstallPlan(baseReport())
    const step = plan.find((s) => s.id === "cap:keyMacro")
    expect(step?.packageManager).toBe("apt")
    expect(step?.packages).toEqual(["ydotool"])
    expect(step?.sudo).toBe(true)
  })

  it("clipboard step uses wl-clipboard on Wayland", () => {
    const plan = buildInstallPlan(
      baseReport({
        session: "wayland",
        capabilities: {
          ...baseReport().capabilities,
          clipboard: {
            name: "clipboard",
            available: false,
            missing: ["wl-copy"],
            preferred: "wl-copy",
            reason: "Install wl-clipboard.",
          },
        },
      }),
    )
    const step = plan.find((s) => s.id === "cap:clipboard")
    expect(step?.packages).toEqual(["wl-clipboard"])
    expect(step?.sudo).toBe(true)
  })

  it("clipboard step uses xclip on X11", () => {
    const plan = buildInstallPlan(baseReport())
    const step = plan.find((s) => s.id === "cap:clipboard")
    expect(step?.packages).toEqual(["xclip"])
  })

  it("activeApp step emits gnome-extension manual step on Wayland+GNOME", () => {
    const plan = buildInstallPlan(
      baseReport({
        session: "wayland",
        capabilities: {
          ...baseReport().capabilities,
          activeApp: {
            name: "activeApp",
            available: false,
            missing: ["xdotool"],
            preferred: "gnome-shell-extension",
            reason: "GNOME extension",
          },
        },
      }),
    )
    const step = plan.find((s) => s.id === "cap:activeApp:gnome-extension")
    expect(step?.manualOnly).toBe(true)
    expect(step?.sudo).toBe(false)
    expect(step?.manualInstructions).toContain("extensions.gnome.org")
  })

  it("udev step is always sudo", () => {
    const plan = buildInstallPlan(baseReport())
    const step = plan.find((s) => s.id === "udev:rules")
    expect(step?.sudo).toBe(true)
    expect(step?.manualInstructions).toContain(
      "/etc/udev/rules.d/70-sireno-deck.rules",
    )
  })

  it("udev step description changes when Stream Deck is connected", () => {
    const plan = buildInstallPlan(
      baseReport({
        udev: {
          ...baseReport().udev,
          streamDeckConnected: true,
          matchedProductIds: ["0086"],
        },
      }),
    )
    const step = plan.find((s) => s.id === "udev:rules")
    expect(step?.description).toContain("Stream Deck detected")
  })

  it("empty plan when everything is available", () => {
    const report = baseReport({
      capabilities: {
        keyMacro: {
          name: "keyMacro",
          available: true,
          missing: [],
          preferred: "ydotool",
          reason: "ok",
        },
        clipboard: {
          name: "clipboard",
          available: true,
          missing: [],
          preferred: "xclip",
          reason: "ok",
        },
        notification: {
          name: "notification",
          available: true,
          missing: [],
          preferred: "notify-send",
          reason: "ok",
        },
        activeApp: {
          name: "activeApp",
          available: true,
          missing: [],
          preferred: "xdotool",
          reason: "ok",
        },
      },
      udev: {
        ...baseReport().udev,
        rulesInstalled: true,
      },
    })
    expect(buildInstallPlan(report)).toEqual([])
  })

  it("macOS produces no capability steps because tools are built-ins", () => {
    const report = baseReport({ platform: "darwin", packageManager: "brew" })
    expect(buildInstallPlan(report)).toEqual([])
  })

  it("packageManager none marks steps as manualOnly with fallback instructions", () => {
    const plan = buildInstallPlan(baseReport({ packageManager: "none" }))
    const step = plan.find((s) => s.id === "cap:keyMacro")
    expect(step?.packageManager).toBe("none")
    expect(step?.manualOnly).toBe(true)
    expect(step?.manualInstructions.length).toBeGreaterThan(0)
  })
})

describe("needsConfigSeed", () => {
  it("returns true when config does not exist", () => {
    expect(needsConfigSeed(baseReport())).toBe(true)
  })

  it("returns false when config exists", () => {
    expect(
      needsConfigSeed(
        baseReport({
          config: {
            exists: true,
            path: "/home/u/.config/sireno-deck/config.yml",
          },
        }),
      ),
    ).toBe(false)
  })
})
