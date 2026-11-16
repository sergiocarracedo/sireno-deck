import { describe, expect, it, vi } from "vitest"
import yargs from "yargs"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

const mocks = vi.hoisted(() => ({ install: vi.fn(), setup: vi.fn() }))
vi.mock("../commands/install", () => ({ installPackage: mocks.install }))
vi.mock("../commands/addon-setup", () => ({
  addonSetupCommand: {
    command: "setup <module>",
    handler: mocks.setup,
  },
  configuredAddonSetups: () => [],
  runAddonSetup: vi.fn(),
}))

import { buildCli } from "../index"

describe("addon and theme commands", () => {
  it("registers nested addon and theme commands instead of addon-setup", async () => {
    const { commands } = await buildCli()
    const names = commands.map((item) => item.command)
    expect(names).toContain("addon <command>")
    expect(names).toContain("theme <command>")
    expect(names).not.toContain("addon-setup <module>")
    const parser = yargs([]).command(commands).strict().exitProcess(false)
    const help = await parser.parseAsync(["addon", "--help"])
    expect(help).toBeDefined()
  })

  it("dispatches generic, addon and theme installation with the right kind", async () => {
    const dir = mkdtempSync(join(tmpdir(), "addon-command-"))
    const config = join(dir, "config.yml")
    writeFileSync(config, "decks: {}\n")
    try {
      const { commands } = await buildCli()
      for (const [args, expectedKind] of [
        [["install", "example"], undefined],
        [["addon", "install", "example"], "addon"],
        [["theme", "install", "example"], "theme"],
      ] as const) {
        mocks.install.mockClear()
        await yargs([])
          .command(commands)
          .strict()
          .exitProcess(false)
          .parseAsync([...args, "--config", config])
        expect(mocks.install).toHaveBeenCalledWith(
          expect.objectContaining({
            packageName: "example",
            ...(expectedKind ? { expectedKind } : {}),
          }),
        )
      }
      await yargs([])
        .command(commands)
        .strict()
        .exitProcess(false)
        .parseAsync(["addon", "setup", "example"])
      expect(mocks.setup).toHaveBeenCalledWith(
        expect.objectContaining({ module: "example" }),
      )
      expect(() =>
        yargs([])
          .command(commands)
          .strict()
          .exitProcess(false)
          .showHelpOnFail(false)
          .parse(["addon-setup", "example"]),
      ).toThrow()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
