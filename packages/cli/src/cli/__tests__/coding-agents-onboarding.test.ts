import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  enableOpenCodePlugin,
  isOpenCodePluginEnabled,
} from "../coding-agents-onboarding"

const configDir = join(tmpdir(), `sirenodeck-opencode-${process.pid}`)
const configPath = join(configDir, "opencode.json")
const previousConfigDir = process.env["OPENCODE_CONFIG_DIR"]

beforeEach(async () => {
  process.env["OPENCODE_CONFIG_DIR"] = configDir
  await rm(configDir, { recursive: true, force: true })
  await mkdir(configDir, { recursive: true })
})

afterEach(async () => {
  if (previousConfigDir === undefined) delete process.env["OPENCODE_CONFIG_DIR"]
  else process.env["OPENCODE_CONFIG_DIR"] = previousConfigDir
  await rm(configDir, { recursive: true, force: true })
})

describe("OpenCode plugin configuration", () => {
  it("adds the managed plugin without replacing existing plugins", async () => {
    await writeFile(
      configPath,
      `{
        // Keep user plugins enabled.
        "plugin": ["existing-plugin",],
      }`,
      "utf8",
    )

    expect(isOpenCodePluginEnabled()).toBe(false)
    expect(enableOpenCodePlugin()).toBe(true)
    const updated = await readFile(configPath, "utf8")
    expect(
      JSON.parse(
        updated.replace(/\/\/.*$/gm, "").replace(/,\s*([}\]])/g, "$1"),
      ),
    ).toEqual({
      plugin: ["existing-plugin", "./plugins/sirenodeck-agent-state.js"],
    })
    expect(updated).toContain("Keep user plugins enabled.")
    expect(enableOpenCodePlugin()).toBe(true)
    expect(
      (await readFile(configPath, "utf8")).match(/sirenodeck-agent-state/g),
    ).toHaveLength(1)
  })
})
