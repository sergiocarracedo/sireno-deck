import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type pino from "pino"

import { ProviderError } from "@/system/providers/error"

import { createLinuxKeyMacroProvider } from "../linux"
import { type CommandExecutor } from "@/system/providers/shared"

const silentLogger = (): pino.Logger => {
  const noop = (): void => undefined
  return {
    info: vi.fn(noop),
    warn: vi.fn(noop),
    error: vi.fn(noop),
    debug: vi.fn(noop),
    trace: vi.fn(noop),
    fatal: vi.fn(noop),
    child: vi.fn(),
    level: "silent",
  } as unknown as pino.Logger
}

const YDOTOOL_CTRL_V = ["key", "29:1", "47:1", "47:0", "29:0"]

const makeExecutor = (
  responses:
    | Record<string, { exitCode: number; stdout?: string; stderr?: string }>
    | ((
        tool: string,
        args: ReadonlyArray<string>,
      ) => { exitCode: number; stdout?: string; stderr?: string }),
): {
  executor: CommandExecutor
  calls: Array<{ tool: string; args: string[] }>
} => {
  const calls: Array<{ tool: string; args: string[] }> = []
  const resolve = (
    tool: string,
    args: ReadonlyArray<string>,
  ): { exitCode: number; stdout: string; stderr: string } => {
    const resp =
      typeof responses === "function"
        ? responses(tool, args)
        : (responses[tool] ?? { exitCode: 0, stdout: "" })
    return {
      exitCode: resp.exitCode,
      stdout: resp.stdout ?? "",
      stderr: resp.stderr ?? "",
    }
  }
  const executor: CommandExecutor = {
    async run(tool: string, args: ReadonlyArray<string>) {
      calls.push({ tool, args: [...args] })
      return resolve(tool, args)
    },
  }
  return { executor, calls }
}

const makeExecutorWithTools = (
  availableTools: ReadonlyArray<string>,
  toolStderr: Record<string, string> = {},
): {
  executor: CommandExecutor
  calls: Array<{ tool: string; args: string[] }>
} => {
  const calls: Array<{ tool: string; args: string[] }> = []
  const executor: CommandExecutor = {
    async run(tool, args) {
      const snap = [...args]
      calls.push({ tool, args: snap })
      if (tool === "which") {
        const target = args[0] ?? ""
        if (availableTools.includes(target)) {
          return {
            exitCode: 0,
            stdout: `/usr/bin/${target}`,
            stderr: "",
          }
        }
        return { exitCode: 1, stdout: "", stderr: "not found" }
      }
      const stderr = toolStderr[tool] ?? ""
      return { exitCode: 0, stdout: "", stderr }
    },
  }
  return { executor, calls }
}

const baseEnv = (): Readonly<Record<string, string>> => ({})

describe("createLinuxKeyMacroProvider", () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.restoreAllMocks())

  it("probes ydotool first", async () => {
    const { executor, calls } = makeExecutorWithTools(["ydotool", "wl-copy"])
    const provider = await createLinuxKeyMacroProvider({
      executor,
      env: baseEnv(),
      logger: silentLogger(),
    })
    await provider.sendKey("ctrl+t")
    expect(calls[0]).toEqual({ tool: "which", args: ["ydotool"] })
    const ydotoolCall = calls.find(
      (c) => c.tool === "ydotool" && c.args[0] === "key",
    )
    expect(ydotoolCall).toBeDefined()
    expect(ydotoolCall!.args).toEqual(["key", "29:1", "20:1", "20:0", "29:0"])
    await provider.stop()
  })

  it("combo argv uses scancode syntax with LIFO release", async () => {
    const { executor, calls } = makeExecutorWithTools(["ydotool", "wl-copy"])
    const provider = await createLinuxKeyMacroProvider({
      executor,
      env: baseEnv(),
      logger: silentLogger(),
    })
    await provider.sendKey("ctrl+alt+t")
    const ydotoolCall = calls.find(
      (c) => c.tool === "ydotool" && c.args[0] === "key",
    )
    expect(ydotoolCall).toBeDefined()
    expect(ydotoolCall!.args).toEqual([
      "key",
      "29:1", // ctrl down
      "56:1", // alt down
      "20:1", // t down
      "20:0", // t up
      "56:0", // alt up
      "29:0", // ctrl up
    ])
    await provider.stop()
  })

  it("meta maps to LEFTMETA scancode (125)", async () => {
    const { executor, calls } = makeExecutorWithTools(["ydotool", "wl-copy"])
    const provider = await createLinuxKeyMacroProvider({
      executor,
      env: baseEnv(),
      logger: silentLogger(),
    })
    await provider.sendKey("super+t")
    const ydotoolCall = calls.find(
      (c) => c.tool === "ydotool" && c.args[0] === "key",
    )
    expect(ydotoolCall).toBeDefined()
    expect(ydotoolCall!.args).toEqual(["key", "125:1", "20:1", "20:0", "125:0"])
    await provider.stop()
  })

  it("named keys (F4, Return, Tab) use their scancodes", async () => {
    const { executor, calls } = makeExecutorWithTools(["ydotool", "wl-copy"])
    const provider = await createLinuxKeyMacroProvider({
      executor,
      env: baseEnv(),
      logger: silentLogger(),
    })
    await provider.sendKey("alt+F4")
    const f4Call = calls.find(
      (c) =>
        c.tool === "ydotool" &&
        c.args[0] === "key" &&
        c.args.includes("62:1"),
    )
    expect(f4Call!.args).toEqual(["key", "56:1", "62:1", "62:0", "56:0"]) // 56=LeftAlt, 62=F4

    await provider.sendKey("Tab")
    const tabCall = calls.find(
      (c) => c.tool === "ydotool" && c.args.includes("15:1"),
    )
    expect(tabCall!.args).toEqual(["key", "15:1", "15:0"]) // 15=Tab

    await provider.sendKey("ctrl+Return")
    const returnCall = calls.find(
      (c) => c.tool === "ydotool" && c.args.includes("28:1"),
    )
    expect(returnCall!.args).toEqual(["key", "29:1", "28:1", "28:0", "29:0"]) // 28=Return/Enter
    await provider.stop()
  })

  it("ASCII literal text goes through ydotool type", async () => {
    const { executor, calls } = makeExecutorWithTools(["ydotool", "wl-copy"])
    const provider = await createLinuxKeyMacroProvider({
      executor,
      env: baseEnv(),
      logger: silentLogger(),
    })
    await provider.sendKey("hello")
    const typeCall = calls.find(
      (c) => c.tool === "ydotool" && c.args[0] === "type",
    )
    expect(typeCall).toBeDefined()
    expect(typeCall!.args).toEqual(["type", "--", "hello"])
    await provider.stop()
  })

  it("non-ASCII text routes through wl-copy + ctrl+v scancodes", async () => {
    const { executor, calls } = makeExecutorWithTools(["ydotool", "wl-copy"])
    const provider = await createLinuxKeyMacroProvider({
      executor,
      env: baseEnv(),
      logger: silentLogger(),
    })
    await provider.sendKey("🔥")

    const wlCopyCall = calls.find(
      (c) =>
        c.tool === "sh" && c.args[0] === "-c" && c.args[1].includes("wl-copy"),
    )
    expect(wlCopyCall).toBeDefined()
    expect(wlCopyCall!.args[1]).toContain("printf '%s'")
    expect(wlCopyCall!.args[1]).toContain("'🔥'")

    const ctrlVCall = calls.find(
      (c) => c.tool === "ydotool" && c.args[0] === "key",
    )
    expect(ctrlVCall).toBeDefined()
    expect(ctrlVCall!.args).toEqual(YDOTOOL_CTRL_V)
    await provider.stop()
  })

  it("non-ASCII text throws NOT_AVAILABLE when wl-copy is missing", async () => {
    const { executor } = makeExecutorWithTools(["ydotool"])
    const provider = await createLinuxKeyMacroProvider({
      executor,
      env: baseEnv(),
      logger: silentLogger(),
    })
    await expect(provider.sendKey("🔥")).rejects.toMatchObject({
      code: "NOT_AVAILABLE",
      message: expect.stringContaining("wl-copy"),
    })
    await provider.stop()
  })

  it("falls back to wtype when ydotool is missing", async () => {
    const { executor, calls } = makeExecutorWithTools(["wtype"])
    const provider = await createLinuxKeyMacroProvider({
      executor,
      env: baseEnv(),
      logger: silentLogger(),
    })
    await provider.sendKey("ctrl+t")
    expect(calls.some((c) => c.tool === "wtype")).toBe(true)
    await provider.stop()
  })

  it("returns null provider when neither ydotool nor wtype is present", async () => {
    const { executor } = makeExecutorWithTools([])
    const provider = await createLinuxKeyMacroProvider({
      executor,
      env: baseEnv(),
      logger: silentLogger(),
    })
    await expect(provider.sendKey("ctrl+t")).rejects.toMatchObject({
      code: "NOT_AVAILABLE",
    })
    await provider.stop()
  })

  it("unknown combo key (e.g. 'at') throws ProviderError", async () => {
    const { executor } = makeExecutorWithTools(["ydotool"])
    const provider = await createLinuxKeyMacroProvider({
      executor,
      env: baseEnv(),
      logger: silentLogger(),
    })
    await expect(provider.sendKey("ctrl+at")).rejects.toMatchObject({
      code: "EXEC_FAILED",
      message: expect.stringContaining("ydotool: cannot map key 'at'"),
    })
    await provider.stop()
  })

  it("throws ProviderError with EXEC_FAILED when ydotool exits non-zero", async () => {
    const { executor } = makeExecutorWithTools(["ydotool"], {
      ydotool: "ydotoold not running",
    })
    // Force exit code 1 for ydotool
    const wrapped: CommandExecutor = {
      async run(tool, args) {
        const r = await executor.run(tool, args)
        if (tool === "ydotool") return { exitCode: 1, stdout: "", stderr: r.stderr }
        return r
      },
    }
    const provider = await createLinuxKeyMacroProvider({
      executor: wrapped,
      env: baseEnv(),
      logger: silentLogger(),
    })
    await expect(provider.sendKey("ctrl+t")).rejects.toMatchObject({
      code: "EXEC_FAILED",
    })
    await provider.stop()
  })

  it("throws on TIMEOUT when ydotool takes too long", async () => {
    const slow: CommandExecutor = {
      async run(_tool, _args) {
        await new Promise((r) => setTimeout(r, 600))
        return { exitCode: 0, stdout: "", stderr: "" }
      },
    }
    const provider = await createLinuxKeyMacroProvider({
      executor: slow,
      env: baseEnv(),
      logger: silentLogger(),
    })
    await expect(provider.sendKey("ctrl+t")).rejects.toBeInstanceOf(
      ProviderError,
    )
    await provider.stop()
  })
})