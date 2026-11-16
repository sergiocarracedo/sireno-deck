import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, expect, it, vi } from "vitest"

const prompts = vi.hoisted(() => ({ multiselect: vi.fn() }))
vi.mock("@clack/prompts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@clack/prompts")>()),
  multiselect: prompts.multiselect,
}))
vi.mock("../../package-manager", () => ({
  probeGlobalPackageRoots: () => ({ roots: [] }),
}))
vi.mock("@/system/credentials/native", () => ({
  createNativeCredentialBackend: () => ({}),
}))

import { addonSetupCommand, onboardAddons } from "../addon-setup"

afterEach(() => vi.restoreAllMocks())

it("runs the selected configured addons sequentially with headings", async () => {
  const dir = mkdtempSync(join(tmpdir(), "addon-onboard-"))
  const events: string[] = []
  const stdinTty = Object.getOwnPropertyDescriptor(process.stdin, "isTTY")
  const stdoutTty = Object.getOwnPropertyDescriptor(process.stdout, "isTTY")
  Object.assign(globalThis, { __addonEvents: events })
  try {
    for (const name of ["first", "second"]) {
      const root = join(dir, name)
      mkdirSync(root)
      writeFileSync(
        join(root, "sirenodeck.json"),
        JSON.stringify({ kind: "addon", name, setupEntry: "setup.mjs" }),
      )
      writeFileSync(
        join(root, "setup.mjs"),
        `export const addonName = ${JSON.stringify(name)}; export async function setupAddon() { globalThis.__addonEvents.push(${JSON.stringify(name)}); }`,
      )
    }
    const config = join(dir, "config.yml")
    writeFileSync(config, "decks: {}\naddons:\n  - ./first\n  - ./second\n")
    prompts.multiselect.mockResolvedValue([
      join(dir, "second/setup.mjs"),
      join(dir, "first/setup.mjs"),
    ])
    Object.defineProperty(process.stdin, "isTTY", {
      value: true,
      configurable: true,
    })
    Object.defineProperty(process.stdout, "isTTY", {
      value: true,
      configurable: true,
    })
    const log = vi.spyOn(console, "log").mockImplementation(() => {})
    await onboardAddons(config)
    expect(events).toEqual(["second", "first"])
    expect(log).toHaveBeenCalledWith("\nsecond\n--------------------")
    expect(log).toHaveBeenCalledWith("\nfirst\n--------------------")
    await addonSetupCommand.handler({
      module: "first",
      config,
      _: [],
      $0: "sirenodeck",
    })
    expect(events).toEqual(["second", "first", "first"])
  } finally {
    if (stdinTty) Object.defineProperty(process.stdin, "isTTY", stdinTty)
    else Reflect.deleteProperty(process.stdin, "isTTY")
    if (stdoutTty) Object.defineProperty(process.stdout, "isTTY", stdoutTty)
    else Reflect.deleteProperty(process.stdout, "isTTY")
    Reflect.deleteProperty(globalThis, "__addonEvents")
    rmSync(dir, { recursive: true, force: true })
  }
})

it("resolves a configured package name to its setup module", async () => {
  const dir = mkdtempSync(join(tmpdir(), "addon-name-"))
  const root = join(dir, "node_modules/@example/addon-calendar")
  mkdirSync(root, { recursive: true })
  writeFileSync(
    join(root, "sirenodeck.json"),
    JSON.stringify({
      kind: "addon",
      name: "calendar",
      setupEntry: "setup.mjs",
    }),
  )
  writeFileSync(
    join(root, "setup.mjs"),
    "export const addonName = 'calendar'; export async function setupAddon() { globalThis.__addonNameSetup = true }",
  )
  const config = join(dir, "config.yml")
  writeFileSync(config, "decks: {}\naddons:\n  - '@example/addon-calendar'\n")
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
    vi.spyOn(console, "log").mockImplementation(() => {})
    await addonSetupCommand.handler({
      module: "@example/addon-calendar",
      config,
      _: [],
      $0: "sirenodeck",
    })
    expect(Reflect.get(globalThis, "__addonNameSetup")).toBe(true)
  } finally {
    if (stdin) Object.defineProperty(process.stdin, "isTTY", stdin)
    else Reflect.deleteProperty(process.stdin, "isTTY")
    if (stdout) Object.defineProperty(process.stdout, "isTTY", stdout)
    else Reflect.deleteProperty(process.stdout, "isTTY")
    Reflect.deleteProperty(globalThis, "__addonNameSetup")
    rmSync(dir, { recursive: true, force: true })
  }
})
