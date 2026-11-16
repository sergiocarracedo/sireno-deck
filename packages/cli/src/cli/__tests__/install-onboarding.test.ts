import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  install: vi.fn(),
  setup: vi.fn(),
  discover: vi.fn(),
}))
vi.mock("../commands/install", () => ({ installPackage: mocks.install }))
vi.mock("../commands/addon-setup", () => ({
  addonSetupCommand: { command: "setup <module>" },
  configuredAddonSetups: mocks.discover,
  runAddonSetup: mocks.setup,
}))
import { buildCli } from "../index"

it("prints a setup command after non-interactive installation", async () => {
  const dir = mkdtempSync(join(tmpdir(), "addon-install-"))
  const config = join(dir, "config.yml")
  writeFileSync(config, "decks: {}\n")
  const stdin = Object.getOwnPropertyDescriptor(process.stdin, "isTTY")
  const stdout = Object.getOwnPropertyDescriptor(process.stdout, "isTTY")
  try {
    Object.defineProperty(process.stdin, "isTTY", {
      value: false,
      configurable: true,
    })
    Object.defineProperty(process.stdout, "isTTY", {
      value: false,
      configurable: true,
    })
    mocks.discover.mockReturnValue([
      {
        name: "calendar",
        source: "@sirenodeck/addon-calendar",
        setupPath: "/calendar/setup.js",
      },
    ])
    const log = vi.spyOn(console, "log").mockImplementation(() => {})
    const command = (await buildCli()).commands.find(
      (item) => item.command === "install <packageName>",
    )!
    await command.handler({
      packageName: "@sirenodeck/addon-calendar",
      config,
      _: [],
      $0: "sirenodeck",
    })
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining(
        "sirenodeck addon setup @sirenodeck/addon-calendar",
      ),
    )
    expect(mocks.setup).not.toHaveBeenCalled()
  } finally {
    if (stdin) Object.defineProperty(process.stdin, "isTTY", stdin)
    else Reflect.deleteProperty(process.stdin, "isTTY")
    if (stdout) Object.defineProperty(process.stdout, "isTTY", stdout)
    else Reflect.deleteProperty(process.stdout, "isTTY")
    vi.restoreAllMocks()
    rmSync(dir, { recursive: true, force: true })
  }
})

it("starts setup after an interactive installation", async () => {
  const dir = mkdtempSync(join(tmpdir(), "addon-install-"))
  const config = join(dir, "config.yml")
  writeFileSync(config, "decks: {}\n")
  const stdin = Object.getOwnPropertyDescriptor(process.stdin, "isTTY")
  const stdout = Object.getOwnPropertyDescriptor(process.stdout, "isTTY")
  try {
    Object.defineProperty(process.stdin, "isTTY", {
      value: true,
      configurable: true,
    })
    Object.defineProperty(process.stdout, "isTTY", {
      value: true,
      configurable: true,
    })
    mocks.discover.mockReturnValue([
      {
        name: "calendar",
        source: "@sirenodeck/addon-calendar",
        setupPath: "/calendar/setup.js",
      },
    ])
    const command = (await buildCli()).commands.find(
      (item) => item.command === "install <packageName>",
    )!
    await command.handler({
      packageName: "@sirenodeck/addon-calendar",
      config,
      _: [],
      $0: "sirenodeck",
    })
    expect(mocks.setup).toHaveBeenCalledWith("/calendar/setup.js", config)
  } finally {
    if (stdin) Object.defineProperty(process.stdin, "isTTY", stdin)
    else Reflect.deleteProperty(process.stdin, "isTTY")
    if (stdout) Object.defineProperty(process.stdout, "isTTY", stdout)
    else Reflect.deleteProperty(process.stdout, "isTTY")
    vi.restoreAllMocks()
    rmSync(dir, { recursive: true, force: true })
  }
})
