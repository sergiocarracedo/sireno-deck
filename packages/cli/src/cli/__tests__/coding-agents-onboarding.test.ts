import { mkdtempSync, readFileSync, unlinkSync, writeFileSync } from "node:fs"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  enableClaudeHooks,
  enableOpenCodePlugin,
  isClaudeHookEnabled,
  isOpenCodePluginEnabled,
  removeClaudeHook,
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

describe("claude code hooks", () => {
  // ponytail: modelled on the real settings.json of the machine this was
  // built for — three third-party hooks from other tools plus unrelated
  // top-level keys. Clobbering any of it is the worst thing this code could
  // do, so it is pinned here rather than left to review.
  const EXISTING = {
    theme: "dark",
    autoCompactWindow: 0.8,
    permissions: { allow: ["Bash(git status)"] },
    modelSettings: { model: "opus" },
    statusLine: { type: "command", command: "my-statusline" },
    hooks: {
      PreToolUse: [
        { hooks: [{ type: "command", command: "git-ai checkpoint claude" }] },
      ],
      PostToolUse: [
        { hooks: [{ type: "command", command: "git-ai checkpoint claude" }] },
      ],
      SessionStart: [
        { hooks: [{ type: "command", command: "bash herdr-agent-state.sh" }] },
      ],
      Stop: [
        { hooks: [{ type: "command", command: "bash worktree-footer.sh" }] },
      ],
    },
  }

  let dir: string
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "cc-settings-"))
    process.env["CLAUDE_CONFIG_DIR"] = dir
    writeFileSync(join(dir, "settings.json"), JSON.stringify(EXISTING, null, 2))
  })
  afterEach(() => {
    delete process.env["CLAUDE_CONFIG_DIR"]
  })

  const settings = (): Record<string, unknown> =>
    JSON.parse(readFileSync(join(dir, "settings.json"), "utf8")) as Record<
      string,
      unknown
    >

  it("leaves every pre-existing hook and setting intact", () => {
    expect(enableClaudeHooks()).toBe(true)
    const after = settings()
    for (const key of [
      "theme",
      "autoCompactWindow",
      "permissions",
      "modelSettings",
      "statusLine",
    ]) {
      expect(after[key]).toEqual((EXISTING as Record<string, unknown>)[key])
    }
    const hooks = after["hooks"] as Record<string, unknown[]>
    // Other tools' entries survive, byte for byte, and stay first.
    for (const [event, original] of Object.entries(EXISTING.hooks)) {
      expect(hooks[event]![0]).toEqual(original[0])
    }
    // Ours were appended to the events that already existed.
    expect(hooks["PreToolUse"]).toHaveLength(2)
    expect(hooks["SessionStart"]).toHaveLength(2)
    expect(hooks["Stop"]).toHaveLength(2)
    // PostToolUse is deliberately not registered, so it is untouched.
    expect(hooks["PostToolUse"]).toHaveLength(1)
  })

  it("is idempotent", () => {
    expect(enableClaudeHooks()).toBe(true)
    const first = readFileSync(join(dir, "settings.json"), "utf8")
    expect(enableClaudeHooks()).toBe(true)
    expect(readFileSync(join(dir, "settings.json"), "utf8")).toBe(first)
    expect(isClaudeHookEnabled()).toBe(true)
  })

  it("backs the file up before the first edit", () => {
    enableClaudeHooks()
    const backup = readFileSync(
      join(dir, "settings.json.sirenodeck.bak"),
      "utf8",
    )
    expect(JSON.parse(backup)).toEqual(EXISTING)
  })

  it("refuses to touch settings that are not valid JSON", () => {
    writeFileSync(join(dir, "settings.json"), "{ this is not json")
    expect(enableClaudeHooks()).toBe(false)
    expect(readFileSync(join(dir, "settings.json"), "utf8")).toBe(
      "{ this is not json",
    )
  })

  it("removes only its own entries on uninstall", () => {
    enableClaudeHooks()
    expect(removeClaudeHook()).toBe(true)
    const hooks = settings()["hooks"] as Record<string, unknown[]>
    for (const [event, original] of Object.entries(EXISTING.hooks)) {
      expect(hooks[event]).toEqual(original)
    }
    expect(isClaudeHookEnabled()).toBe(false)
  })

  it("starts from scratch when there is no settings file", () => {
    unlinkSync(join(dir, "settings.json"))
    expect(enableClaudeHooks()).toBe(true)
    expect(isClaudeHookEnabled()).toBe(true)
  })
})
