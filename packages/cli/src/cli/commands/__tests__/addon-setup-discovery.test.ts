import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { discoverAddonSetups } from "../addon-setup-discovery"

const directories: string[] = []
afterEach(() => {
  for (const dir of directories.splice(0))
    rmSync(dir, { recursive: true, force: true })
})

describe("addon setup discovery", () => {
  it("finds only enabled, installed configured addons with setup", () => {
    const dir = mkdtempSync(join(tmpdir(), "addon-setup-discovery-"))
    directories.push(dir)
    const root = join(dir, "node_modules", "@example", "addon-calendar")
    mkdirSync(join(root, "dist"), { recursive: true })
    writeFileSync(
      join(root, "sirenodeck.json"),
      JSON.stringify({
        kind: "addon",
        name: "calendar",
        setupEntry: "dist/setup.js",
      }),
    )
    writeFileSync(join(root, "dist", "setup.js"), "export {}")
    const configPath = join(dir, "config.yml")
    writeFileSync(
      configPath,
      "decks: {}\naddons:\n  - '@example/addon-calendar'\n  - src: '@example/disabled'\n    enabled: false\n  - '@example/missing'\n",
    )
    expect(discoverAddonSetups(configPath, [], dir)).toEqual([
      {
        name: "calendar",
        source: "@example/addon-calendar",
        setupPath: join(root, "dist", "setup.js"),
      },
    ])
  })

  it("resolves local addons and ignores setup paths outside their root", () => {
    const dir = mkdtempSync(join(tmpdir(), "addon-setup-local-"))
    directories.push(dir)
    for (const [name, setupEntry] of [
      ["good", "setup.js"],
      ["bad", "../outside.js"],
    ]) {
      const root = join(dir, name!)
      mkdirSync(root)
      writeFileSync(
        join(root, "sirenodeck.json"),
        JSON.stringify({ kind: "addon", name, setupEntry }),
      )
      writeFileSync(join(root, "setup.js"), "export {}")
    }
    writeFileSync(join(dir, "outside.js"), "export {}")
    const config = join(dir, "config.yml")
    writeFileSync(config, "decks: {}\naddons:\n  - ./good\n  - ./bad\n")
    expect(discoverAddonSetups(config)).toEqual([
      {
        name: "good",
        source: "./good",
        setupPath: join(dir, "good", "setup.js"),
      },
    ])
  })
})
