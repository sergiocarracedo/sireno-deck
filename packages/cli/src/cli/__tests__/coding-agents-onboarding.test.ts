import { mkdtempSync, readFileSync, unlinkSync, writeFileSync } from "node:fs"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  codingAgentsPluginSourceV1,
  codingAgentsPluginSourceV2,
  detectOpenCodeMajorVersion,
  enableClaudeHooks,
  enableOpenCodePlugin,
  installOpenCodePlugin,
  isClaudeHookEnabled,
  isOpenCodePluginInstalled,
  isOpenCodePluginEnabled,
  parseOpenCodeMajorVersion,
  opencodePluginPath,
  removeClaudeHook,
} from "../coding-agents-onboarding"
import { execFileSync } from "node:child_process"

vi.mock("node:child_process", () => ({ execFileSync: vi.fn() }))

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
  it.each([
    ["1.18.29", 1],
    ["opencode 1.18.29", 1],
    ["opencode v2.0.0", 2],
    ["2.1.0-beta.1", 2],
    ["OpenCode development", null],
    ["3.0.0", null],
  ] as const)("parses version output %s", (output, expected) => {
    expect(parseOpenCodeMajorVersion(output)).toBe(expected)
  })

  it("detects the installed CLI version and declines unsupported output", () => {
    vi.mocked(execFileSync).mockReturnValueOnce("opencode 2.0.1")
    expect(detectOpenCodeMajorVersion()).toBe(2)
    vi.mocked(execFileSync).mockReturnValueOnce("opencode nightly")
    expect(detectOpenCodeMajorVersion()).toBe(null)
    vi.mocked(execFileSync).mockImplementationOnce(() => {
      throw new Error("not found")
    })
    expect(detectOpenCodeMajorVersion()).toBe(null)
  })

  it("selects the plugin API from the detected CLI version", async () => {
    vi.mocked(execFileSync).mockReturnValueOnce("opencode 2.0.1")

    expect(installOpenCodePlugin()).toBe(opencodePluginPath())
    expect(await readFile(opencodePluginPath(), "utf8")).toContain(
      "SIRENODECK_OPENCODE_PLUGIN_API=2",
    )
  })

  it.each([
    [1, "plugin", "SIRENODECK_OPENCODE_PLUGIN_API=1"],
    [2, "plugins", "SIRENODECK_OPENCODE_PLUGIN_API=2"],
  ] as const)(
    "installs and enables the OpenCode %i plugin",
    async (major, key, marker) => {
      await writeFile(
        configPath,
        JSON.stringify({ [key]: ["existing-plugin"] }),
      )

      expect(installOpenCodePlugin(major)).toBe(opencodePluginPath())
      expect(isOpenCodePluginInstalled(major)).toBe(true)
      expect(enableOpenCodePlugin(major)).toBe(true)

      const source = await readFile(opencodePluginPath(), "utf8")
      expect(source).toContain(marker)
      expect(source).toBe(
        major === 1 ? codingAgentsPluginSourceV1 : codingAgentsPluginSourceV2,
      )
      expect(JSON.parse(await readFile(configPath, "utf8"))).toEqual({
        [key]: ["existing-plugin", "./plugins/sirenodeck-agent-state.js"],
      })
    },
  )

  it("migrates its existing V1 config entry to the V2 field without dropping other plugins", async () => {
    await writeFile(
      configPath,
      JSON.stringify({
        plugin: ["existing-v1-plugin", "./plugins/sirenodeck-agent-state.js"],
      }),
    )

    expect(enableOpenCodePlugin(2)).toBe(true)
    expect(JSON.parse(await readFile(configPath, "utf8"))).toEqual({
      plugin: ["existing-v1-plugin"],
      plugins: ["./plugins/sirenodeck-agent-state.js"],
    })
  })

  it("moves its existing V2 config entry back to the V1 field without dropping other plugins", async () => {
    await writeFile(
      configPath,
      JSON.stringify({
        plugins: ["existing-v2-plugin", "./plugins/sirenodeck-agent-state.js"],
      }),
    )

    expect(enableOpenCodePlugin(1)).toBe(true)
    expect(JSON.parse(await readFile(configPath, "utf8"))).toEqual({
      plugins: ["existing-v2-plugin"],
      plugin: ["./plugins/sirenodeck-agent-state.js"],
    })
  })

  it("uses the V2 plugin definition and event subscription with unload cleanup", () => {
    expect(codingAgentsPluginSourceV2).toContain(
      'import { Plugin } from "@opencode/plugin"',
    )
    expect(codingAgentsPluginSourceV2).toContain('id: "sirenodeck.agent-state"')
    expect(codingAgentsPluginSourceV2).toContain("ctx.event.subscribe")
    expect(codingAgentsPluginSourceV2).toContain("return () => {")
    expect(codingAgentsPluginSourceV2).toContain("controller.abort()")
  })

  it("does not install a plugin when the detected version is unsupported", () => {
    expect(installOpenCodePlugin(null)).toBe(null)
  })

  it("checks the config key appropriate to the detected OpenCode major", async () => {
    await writeFile(
      configPath,
      JSON.stringify({ plugin: ["./plugins/sirenodeck-agent-state.js"] }),
    )

    expect(isOpenCodePluginEnabled(1)).toBe(true)
    expect(isOpenCodePluginEnabled(2)).toBe(false)
  })

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
    expect(enableOpenCodePlugin(1)).toBe(true)
    const updated = await readFile(configPath, "utf8")
    expect(
      JSON.parse(
        updated.replace(/\/\/.*$/gm, "").replace(/,\s*([}\]])/g, "$1"),
      ),
    ).toEqual({
      plugin: ["existing-plugin", "./plugins/sirenodeck-agent-state.js"],
    })
    expect(updated).toContain("Keep user plugins enabled.")
    expect(enableOpenCodePlugin(1)).toBe(true)
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
