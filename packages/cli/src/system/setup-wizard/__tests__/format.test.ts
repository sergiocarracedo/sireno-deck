import { describe, expect, it } from "vitest"

import {
  formatResultLine,
  formatStepInstructions,
  stripAnsi,
  summarizeReport,
} from "../format"
import type { InstallStep, InstallStepResult, SystemReport } from "../types"

const baseReport = (overrides: Partial<SystemReport> = {}): SystemReport => ({
  platform: "linux",
  homeDir: "/home/u",
  xdgConfigHome: "/home/u/.config",
  session: "wayland",
  packageManager: "apt",
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
      available: false,
      missing: ["wl-copy"],
      preferred: "wl-copy",
      reason: "Install wl-clipboard.",
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
      preferred: "gnome-shell-extension",
      reason: "ok",
    },
  },
  udev: {
    rulesInstalled: false,
    rulesPath: "/etc/udev/rules.d/70-sirenodeck.rules",
    streamDeckConnected: false,
    matchedProductIds: [],
  },
  config: { exists: false, path: "/home/u/.config/sirenodeck/config.yml" },
  ...overrides,
})

describe("summarizeReport", () => {
  it("marks not-ok when a capability or config is missing", () => {
    const summary = summarizeReport(baseReport())
    expect(summary.ok).toBe(false)
    expect(summary.missingCapabilities).toEqual(["clipboard"])
    expect(summary.udevMissing).toBe(true)
    expect(summary.configMissing).toBe(true)
    expect(summary.configPath).toBe("/home/u/.config/sirenodeck/config.yml")
    expect(summary.session).toBe("wayland")
    expect(summary.packageManager).toBe("apt")
  })

  it("emits lines that mention missing capabilities and udev", () => {
    const summary = summarizeReport(baseReport())
    expect(summary.lines.some((l) => l.includes("Platform: linux"))).toBe(true)
    expect(summary.lines.some((l) => l.includes("Package manager: apt"))).toBe(
      true,
    )
    expect(summary.lines.some((l) => l.includes("Missing capabilities"))).toBe(
      true,
    )
    expect(summary.lines.some((l) => l.includes("udev rules: missing"))).toBe(
      true,
    )
  })

  it("marks ok when everything is present and rules installed", () => {
    const summary = summarizeReport(
      baseReport({
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
            preferred: "wl-copy",
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
            preferred: "gnome-shell-extension",
            reason: "ok",
          },
        },
        udev: {
          ...baseReport().udev,
          rulesInstalled: true,
        },
        config: {
          exists: true,
          path: "/home/u/.config/sirenodeck/config.yml",
        },
      }),
    )
    expect(summary.ok).toBe(true)
    expect(summary.missingCapabilities).toEqual([])
    expect(summary.udevMissing).toBe(false)
    expect(summary.configMissing).toBe(false)
  })

  it("hides udev lines on darwin", () => {
    const summary = summarizeReport(
      baseReport({
        platform: "darwin",
        packageManager: "brew",
      }),
    )
    expect(summary.lines.some((l) => l.includes("udev rules"))).toBe(false)
  })

  it("emits Stream Deck detection line when connected", () => {
    const summary = summarizeReport(
      baseReport({
        udev: {
          ...baseReport().udev,
          streamDeckConnected: true,
          matchedProductIds: ["0086", "006d"],
        },
      }),
    )
    expect(
      summary.lines.some((l) => l.includes("Stream Deck: connected")),
    ).toBe(true)
  })
})

describe("formatStepInstructions", () => {
  it("returns sudo-prefixed command for apt-managed step", () => {
    const step: InstallStep = {
      id: "cap:keyMacro",
      capability: "keyMacro",
      title: "Key macro",
      description: "Install ydotool.",
      packageManager: "apt",
      packages: ["ydotool"],
      sudo: true,
      manualOnly: false,
      manualInstructions: "",
      verifyCommand: "which ydotool",
    }
    expect(formatStepInstructions(step)).toBe("sudo apt install -y ydotool")
  })

  it("returns brew install command (no sudo) for brew step", () => {
    const step: InstallStep = {
      id: "cap:keyMacro",
      capability: "keyMacro",
      title: "Key macro",
      description: "",
      packageManager: "brew",
      packages: ["ydotool"],
      sudo: false,
      manualOnly: false,
      manualInstructions: "",
    }
    expect(formatStepInstructions(step)).toBe("brew install ydotool")
  })

  it("returns manualInstructions verbatim when present", () => {
    const step: InstallStep = {
      id: "udev:rules",
      capability: "udev",
      title: "udev",
      description: "",
      packageManager: "none",
      packages: [],
      sudo: true,
      manualOnly: false,
      manualInstructions: "sudo tee /etc/udev/rules.d/70-sirenodeck.rules",
    }
    expect(formatStepInstructions(step)).toBe(
      "sudo tee /etc/udev/rules.d/70-sirenodeck.rules",
    )
  })

  it("returns fallback text when packageManager is none and no manualInstructions", () => {
    const step: InstallStep = {
      id: "cap:keyMacro",
      capability: "keyMacro",
      title: "Key macro",
      description: "",
      packageManager: "none",
      packages: [],
      sudo: true,
      manualOnly: true,
      manualInstructions: "",
    }
    expect(formatStepInstructions(step)).toContain("Install manually")
  })
})

describe("formatResultLine", () => {
  const step: InstallStep = {
    id: "cap:keyMacro",
    capability: "keyMacro",
    title: "Key macro tool",
    description: "",
    packageManager: "apt",
    packages: ["ydotool"],
    sudo: true,
    manualOnly: false,
    manualInstructions: "sudo apt install -y ydotool",
  }

  const cases: ReadonlyArray<[InstallStepResult, string]> = [
    ["installed", "✓ Key macro tool"],
    ["skipped", "· Key macro tool (skipped)"],
    ["failed", "✗ Key macro tool"],
    ["manual", "→ Key macro tool (manual"],
  ]
  for (const [result, expectedPrefix] of cases) {
    it(`renders ${result} with prefix ${expectedPrefix}`, () => {
      expect(
        stripAnsi(formatResultLine(step, result)).startsWith(expectedPrefix),
      ).toBe(true)
    })
  }
})
