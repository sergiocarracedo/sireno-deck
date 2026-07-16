import { describe, expect, it, vi } from "vitest"

import type pino from "pino"

import { createLinuxClipboardProvider } from "../linux"
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

const makeExecutor = (
  responses: Record<string, { exitCode: number; stdout?: string; stderr?: string }>,
): {
  executor: CommandExecutor
  calls: Array<{ tool: string; args: string[] }>
} => {
  const calls: Array<{ tool: string; args: string[] }> = []
  const executor: CommandExecutor = {
    async run(tool: string, args: ReadonlyArray<string>) {
      calls.push({ tool, args: [...args] })
      const resp = responses[tool] ?? { exitCode: 0, stdout: "", stderr: "" }
      return {
        exitCode: resp.exitCode,
        stdout: resp.stdout ?? "",
        stderr: resp.stderr ?? "",
      }
    },
  }
  return { executor, calls }
}

const shellCommand = (calls: Array<{ tool: string; args: string[] }>, idx: number): string | undefined =>
  calls[idx]?.args[1]

describe("createLinuxClipboardProvider", () => {
  it("writes to wl-copy on Wayland and returns early", async () => {
    const { executor, calls } = makeExecutor({
      sh: { exitCode: 0, stdout: "" },
    })
    const provider = createLinuxClipboardProvider({
      executor,
      env: { WAYLAND_DISPLAY: "wayland-1" },
      logger: silentLogger(),
    })
    await provider.writeText("🔥")
    expect(calls).toHaveLength(1)
    expect(shellCommand(calls, 0)).toContain("wl-copy")
  })

  it("writes only to xclip on X11", async () => {
    const { executor, calls } = makeExecutor({
      sh: { exitCode: 0, stdout: "" },
    })
    const provider = createLinuxClipboardProvider({
      executor,
      env: {},
      logger: silentLogger(),
    })
    await provider.writeText("🔥")
    expect(calls).toHaveLength(1)
    expect(shellCommand(calls, 0)).toContain("xclip")
  })

  it("falls back to xsel when xclip fails", async () => {
    const calls: Array<{ tool: string; args: string[] }> = []
    const executor: CommandExecutor = {
      async run(tool: string, args: ReadonlyArray<string>) {
        calls.push({ tool, args: [...args] })
        const command = shellCommand(calls, calls.length - 1)
        const isXclip = command?.includes("xclip") ?? false
        return {
          exitCode: isXclip ? 1 : 0,
          stdout: "",
          stderr: isXclip ? "xclip missing" : "",
        }
      },
    }
    const provider = createLinuxClipboardProvider({
      executor,
      env: {},
      logger: silentLogger(),
    })
    await provider.writeText("🔥")
    expect(calls).toHaveLength(2)
    expect(shellCommand(calls, 0)).toContain("xclip")
    expect(shellCommand(calls, 1)).toContain("xsel")
  })

  it("throws when all write methods fail", async () => {
    const { executor, calls } = makeExecutor({
      sh: { exitCode: 1, stderr: "not found" },
    })
    const provider = createLinuxClipboardProvider({
      executor,
      env: {},
      logger: silentLogger(),
    })
    await expect(provider.writeText("🔥")).rejects.toThrow(/clipboard write failed/)
    expect(calls).toHaveLength(2)
  })

  it("reads from wl-paste on Wayland", async () => {
    const { executor, calls } = makeExecutor({
      sh: { exitCode: 0, stdout: "🔥" },
    })
    const provider = createLinuxClipboardProvider({
      executor,
      env: { WAYLAND_DISPLAY: "wayland-1" },
      logger: silentLogger(),
    })
    const text = await provider.readText()
    expect(text).toBe("🔥")
    expect(calls[0]?.args[1]).toContain("wl-paste")
  })

  it("throws when disposed", async () => {
    const { executor } = makeExecutor({})
    const provider = createLinuxClipboardProvider({
      executor,
      env: {},
      logger: silentLogger(),
    })
    await provider.stop()
    await expect(provider.writeText("🔥")).rejects.toThrow("disposed")
  })
})
