import { describe, expect, it, vi } from "vitest"

import type pino from "pino"

import { ProviderError } from "@/system/providers/error"

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
  handler: (
    tool: string,
    args: ReadonlyArray<string>,
  ) => { exitCode: number; stdout?: string; stderr?: string },
): CommandExecutor =>
  ({
    async run(tool: string, args: ReadonlyArray<string>) {
      if (tool === "which") {
        return {
          exitCode: 0,
          stdout: `/usr/bin/${args[0]}`,
          stderr: "",
        }
      }
      return handler(tool, [...args])
    },
  }) as unknown as CommandExecutor

describe("createLinuxClipboardProvider", () => {
  it("writeText pipes to wl-copy via sh -c", async () => {
    const calls: Array<{ tool: string; args: string[] }> = []
    const executor: CommandExecutor = {
      async run(tool, args) {
        calls.push({ tool, args: [...args] })
        if (tool === "which" && args[0] === "wl-copy") {
          return {
            exitCode: 0,
            stdout: "/usr/bin/wl-copy",
            stderr: "",
          }
        }
        if (tool === "sh" && args[0] === "-c") {
          return { exitCode: 0, stdout: "", stderr: "" }
        }
        return { exitCode: 0, stdout: "", stderr: "" }
      },
    }
    const provider = createLinuxClipboardProvider({
      executor,
      logger: silentLogger(),
    })
    await provider.writeText("hello")
    const shCall = calls.find((c) => c.tool === "sh")
    expect(shCall).toBeDefined()
    expect(shCall!.args[1]).toContain("wl-copy")
    expect(shCall!.args[1]).toContain("'hello'")
    await provider.stop()
  })

  it("writeText shell-escapes single quotes inside literal text", async () => {
    const calls: Array<{ tool: string; args: string[] }> = []
    const executor: CommandExecutor = {
      async run(tool, args) {
        if (tool === "which") {
          return { exitCode: 0, stdout: "/usr/bin/wl-copy", stderr: "" }
        }
        calls.push({ tool, args: [...args] })
        return { exitCode: 0, stdout: "", stderr: "" }
      },
    }
    const provider = createLinuxClipboardProvider({
      executor,
      logger: silentLogger(),
    })
    await provider.writeText("it's")
    const shCall = calls.find((c) => c.tool === "sh")
    expect(shCall!.args[1]).toContain("'it'\\''s'")
    await provider.stop()
  })

  it("writeText passes emoji through unchanged", async () => {
    const calls: Array<{ tool: string; args: string[] }> = []
    const executor: CommandExecutor = {
      async run(tool, args) {
        if (tool === "which") {
          return { exitCode: 0, stdout: "/usr/bin/wl-copy", stderr: "" }
        }
        calls.push({ tool, args: [...args] })
        return { exitCode: 0, stdout: "", stderr: "" }
      },
    }
    const provider = createLinuxClipboardProvider({
      executor,
      logger: silentLogger(),
    })
    await provider.writeText("🔥")
    const shCall = calls.find((c) => c.tool === "sh")
    expect(shCall!.args[1]).toContain("🔥")
    await provider.stop()
  })

  it("uses xclip for an X11 session", async () => {
    const calls: Array<{ tool: string; args: string[] }> = []
    const executor: CommandExecutor = {
      async run(tool, args) {
        calls.push({ tool, args: [...args] })
        if (tool === "which" && args[0] === "xclip") {
          return { exitCode: 0, stdout: "/usr/bin/xclip", stderr: "" }
        }
        return { exitCode: 0, stdout: "", stderr: "" }
      },
    }
    const provider = createLinuxClipboardProvider({
      executor,
      env: { DISPLAY: ":0" },
      logger: silentLogger(),
    })
    await provider.writeText("hello")
    expect(calls.find((call) => call.tool === "sh")!.args[1]).toContain(
      "xclip -selection clipboard",
    )
    await provider.stop()
  })

  it("writeText throws ProviderError on non-zero exit", async () => {
    const executor = makeExecutor((tool, args) => {
      if (tool === "which" && args[0] === "wl-copy") {
        return { exitCode: 0, stdout: "/usr/bin/wl-copy", stderr: "" }
      }
      return {
        exitCode: 1,
        stdout: "",
        stderr: "wl-copy: no Wayland clipboard",
      }
    })
    const provider = createLinuxClipboardProvider({
      executor,
      logger: silentLogger(),
    })
    await expect(provider.writeText("hello")).rejects.toMatchObject({
      code: "EXEC_FAILED",
      message: expect.stringContaining("wl-copy"),
    })
    await provider.stop()
  })

  it("writeText throws NOT_AVAILABLE when wl-copy is missing", async () => {
    const executor: CommandExecutor = {
      async run(tool, args) {
        if (tool === "which" && args[0] === "wl-copy") {
          return { exitCode: 1, stdout: "", stderr: "" }
        }
        return { exitCode: 0, stdout: "", stderr: "" }
      },
    }
    const provider = createLinuxClipboardProvider({
      executor,
      logger: silentLogger(),
    })
    await expect(provider.writeText("hello")).rejects.toMatchObject({
      code: "NOT_AVAILABLE",
      message: expect.stringContaining("wl-clipboard"),
    })
    await provider.stop()
  })

  it("writeText uses extraFsProbe fallback when `which` fails (stripped PATH)", async () => {
    const calls: Array<{ tool: string; args: string[] }> = []
    const executor: CommandExecutor = {
      async run(tool, args) {
        calls.push({ tool, args: [...args] })
        if (tool === "which" && args[0] === "wl-copy") {
          return { exitCode: 1, stdout: "", stderr: "" }
        }
        if (tool === "sh" && args[0] === "-c") {
          return { exitCode: 0, stdout: "", stderr: "" }
        }
        return { exitCode: 0, stdout: "", stderr: "" }
      },
    }
    const extraFsProbe = vi.fn((tool: string): boolean => tool === "wl-copy")
    const provider = createLinuxClipboardProvider({
      executor,
      logger: silentLogger(),
      extraFsProbe,
    })
    await provider.writeText("hello")
    const shCall = calls.find((c) => c.tool === "sh")
    expect(shCall).toBeDefined()
    expect(shCall!.args[1]).toContain("wl-copy")
    expect(extraFsProbe).toHaveBeenCalledWith("wl-copy")
    await provider.stop()
  })

  it("writeText still throws NOT_AVAILABLE when extraFsProbe returns false", async () => {
    const executor: CommandExecutor = {
      async run(tool, args) {
        if (tool === "which" && args[0] === "wl-copy") {
          return { exitCode: 1, stdout: "", stderr: "" }
        }
        return { exitCode: 0, stdout: "", stderr: "" }
      },
    }
    const provider = createLinuxClipboardProvider({
      executor,
      logger: silentLogger(),
      extraFsProbe: () => false,
    })
    await expect(provider.writeText("hello")).rejects.toMatchObject({
      code: "NOT_AVAILABLE",
      message: expect.stringContaining("wl-clipboard"),
    })
    await provider.stop()
  })

  it("readText returns wl-paste stdout", async () => {
    const executor = makeExecutor((tool) => {
      if (tool === "wl-paste") {
        return { exitCode: 0, stdout: "pasted text", stderr: "" }
      }
      return { exitCode: 0, stdout: "", stderr: "" }
    })
    const provider = createLinuxClipboardProvider({
      executor,
      logger: silentLogger(),
    })
    const result = await provider.readText()
    expect(result).toBe("pasted text")
    await provider.stop()
  })

  it("readText returns empty on non-zero exit (silent)", async () => {
    const executor = makeExecutor(() => ({
      exitCode: 1,
      stdout: "",
      stderr: "wl-paste failed",
    }))
    const provider = createLinuxClipboardProvider({
      executor,
      logger: silentLogger(),
    })
    const result = await provider.readText()
    expect(result).toBe("")
    await provider.stop()
  })
})
