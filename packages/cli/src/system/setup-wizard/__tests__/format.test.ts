import { describe, expect, it } from "vitest"

import {
  formatCapabilityPanel,
  formatResultLine,
  formatStepInstructions,
  stripAnsi,
  summarizeReport,
} from "../format"
import type {
  CapabilityName,
  CapabilityProbe,
  InstallStep,
  InstallStepResult,
  SystemReport,
} from "../types"

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
      toolInstalled: true,
      permission: null,
      missing: [],
      preferred: "ydotool",
      reason: "ok",
    },
    clipboard: {
      name: "clipboard",
      available: false,
      toolInstalled: false,
      permission: null,
      missing: ["wl-copy"],
      preferred: "wl-copy",
      reason: "Install wl-clipboard.",
    },
    notification: {
      name: "notification",
      available: true,
      toolInstalled: true,
      permission: null,
      missing: [],
      preferred: "notify-send",
      reason: "ok",
    },
    activeApp: {
      name: "activeApp",
      available: true,
      toolInstalled: true,
      permission: null,
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
            toolInstalled: true,
            permission: null,
            missing: [],
            preferred: "ydotool",
            reason: "ok",
          },
          clipboard: {
            name: "clipboard",
            available: true,
            toolInstalled: true,
            permission: null,
            missing: [],
            preferred: "wl-copy",
            reason: "ok",
          },
          notification: {
            name: "notification",
            available: true,
            toolInstalled: true,
            permission: null,
            missing: [],
            preferred: "notify-send",
            reason: "ok",
          },
          activeApp: {
            name: "activeApp",
            available: true,
            toolInstalled: true,
            permission: null,
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

describe("formatCapabilityPanel", () => {
  const ACCESSIBILITY_HINT =
    "grant Accessibility to your terminal in System Settings, then restart it"

  // A macOS box where osascript is installed but the Accessibility grant is
  // denied: keyMacro and activeApp are both blocked by the SAME permission.
  const darwinCapabilities = (): Readonly<
    Record<CapabilityName, CapabilityProbe>
  > => {
    const deniedAccessibility = {
      label: "Accessibility",
      granted: false,
      hint: ACCESSIBILITY_HINT,
      settingsUrl: "x-apple.systempreferences:whatever",
    }
    return {
      keyMacro: {
        name: "keyMacro",
        available: false,
        toolInstalled: true,
        permission: deniedAccessibility,
        missing: ["accessibility-permission"],
        preferred: "osascript",
        reason: "osascript is installed but has no Accessibility permission",
      },
      clipboard: {
        name: "clipboard",
        available: true,
        toolInstalled: true,
        permission: null,
        missing: [],
        preferred: "pbcopy",
        reason: "ok",
      },
      notification: {
        name: "notification",
        available: true,
        toolInstalled: true,
        permission: null,
        missing: [],
        preferred: "osascript",
        reason: "ok",
      },
      activeApp: {
        name: "activeApp",
        available: false,
        toolInstalled: true,
        permission: deniedAccessibility,
        missing: ["accessibility-permission"],
        preferred: "osascript",
        reason: "osascript is installed but has no Accessibility permission",
      },
    }
  }

  it("leads with the capability, not the tool", () => {
    const out = stripAnsi(formatCapabilityPanel(darwinCapabilities()))
    const firstRow = out.split("\n")[0] ?? ""
    expect(firstRow).toContain("Key macros:")
    // The tool is still shown, but after the capability it serves.
    expect(firstRow.indexOf("Key macros")).toBeLessThan(
      firstRow.indexOf("osascript"),
    )
    expect(out).toContain("Clipboard:")
    expect(out).toContain("Notifications:")
    expect(out).toContain("Active app:")
  })

  it("distinguishes a denied permission from a missing binary", () => {
    const out = stripAnsi(formatCapabilityPanel(darwinCapabilities()))
    // osascript ships with macOS — it must never be reported as not installed.
    expect(out).not.toContain("not installed")
    expect(out).toContain("installed · Accessibility not granted")
  })

  it("reports a granted permission alongside the tool", () => {
    const caps = darwinCapabilities()
    const granted = {
      ...caps.keyMacro,
      available: true,
      permission: { ...caps.keyMacro.permission!, granted: true },
      missing: [],
    }
    const out = stripAnsi(formatCapabilityPanel({ ...caps, keyMacro: granted }))
    expect(out).toContain("installed · Accessibility granted")
  })

  it("shares one footnote between capabilities blocked by the same grant", () => {
    const out = stripAnsi(formatCapabilityPanel(darwinCapabilities()))
    // The hint used to be printed in full once per affected capability.
    const hintOccurrences = out.split("then restart it").length - 1
    expect(hintOccurrences).toBe(1)
    // Both rows point at that single footnote.
    expect(out.split("\n").filter((l) => l.includes("[1]")).length).toBe(3)
  })

  it("falls back to the reason for a genuinely missing tool", () => {
    const caps = darwinCapabilities()
    const out = stripAnsi(
      formatCapabilityPanel({
        ...caps,
        clipboard: {
          ...caps.clipboard,
          available: false,
          toolInstalled: false,
          missing: ["wl-copy"],
          preferred: "wl-copy",
          reason: "Install the wl-clipboard package.",
        },
      }),
    )
    expect(out).toContain("not installed")
    expect(out).toContain("Install the wl-clipboard package.")
  })
})
