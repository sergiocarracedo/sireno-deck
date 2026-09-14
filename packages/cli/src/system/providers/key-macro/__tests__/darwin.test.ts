import { describe, expect, it, vi } from "vitest"

import type pino from "pino"

import { ProviderError } from "@/system/providers/error"

import { createDarwinKeyMacroProvider } from "../darwin"
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
    cmd: string,
    args: ReadonlyArray<string>,
  ) => {
    exitCode: number
    stdout: string
    stderr: string
  },
): CommandExecutor => ({
  async run(cmd: string, args: ReadonlyArray<string>) {
    return handler(cmd, [...args])
  },
})

describe("createDarwinKeyMacroProvider", () => {
  it("sendKey('ctrl+t') invokes osascript with control down", async () => {
    let captured: string[] = []
    const executor = makeExecutor((cmd, args) => {
      if (cmd === "osascript") captured = [...args]
      return { exitCode: 0, stdout: "", stderr: "" }
    })
    const provider = await createDarwinKeyMacroProvider({
      executor,
      logger: silentLogger(),
    })
    await provider.sendKey("ctrl+t")
    expect(captured[0]).toBe("-e")
    expect(captured[1]).toContain('keystroke "t"')
    expect(captured[1]).toContain("control down")
    // ctrl must NOT be aliased to command — that made ^C indistinguishable
    // from Cmd+C and left no way to send a real Control.
    expect(captured[1]).not.toContain("command down")
    await provider.stop()
  })

  it("sendKey('alt+shift+F4') invokes osascript with multiple mods", async () => {
    let captured: string[] = []
    const executor = makeExecutor((cmd, args) => {
      if (cmd === "osascript") captured = [...args]
      return { exitCode: 0, stdout: "", stderr: "" }
    })
    const provider = await createDarwinKeyMacroProvider({
      executor,
      logger: silentLogger(),
    })
    await provider.sendKey("alt+shift+F4")
    expect(captured[1]).toContain("option down")
    expect(captured[1]).toContain("shift down")
    // F4 is a virtual key code — `keystroke "F4"` would type the letters.
    expect(captured[1]).toContain("key code 118")
    expect(captured[1]).not.toContain('keystroke "F4"')
    await provider.stop()
  })

  it("sendKey('hello') invokes osascript as literal keystroke", async () => {
    let captured: string[] = []
    const executor = makeExecutor((cmd, args) => {
      if (cmd === "osascript") captured = [...args]
      return { exitCode: 0, stdout: "", stderr: "" }
    })
    const provider = await createDarwinKeyMacroProvider({
      executor,
      logger: silentLogger(),
    })
    await provider.sendKey("hello")
    expect(captured[1]).toContain('keystroke "hello"')
    await provider.stop()
  })

  it("sendKey('😀') invokes osascript with emoji", async () => {
    let captured: string[] = []
    const executor = makeExecutor((cmd, args) => {
      if (cmd === "osascript") captured = [...args]
      return { exitCode: 0, stdout: "", stderr: "" }
    })
    const provider = await createDarwinKeyMacroProvider({
      executor,
      logger: silentLogger(),
    })
    await provider.sendKey("😀")
    expect(captured[1]).toContain('keystroke "😀"')
    await provider.stop()
  })

  it("osascript non-zero throws ProviderError", async () => {
    const executor = makeExecutor(() => ({
      exitCode: 1,
      stdout: "",
      stderr: "fail",
    }))
    const provider = await createDarwinKeyMacroProvider({
      executor,
      logger: silentLogger(),
    })
    await expect(provider.sendKey("ctrl+t")).rejects.toBeInstanceOf(
      ProviderError,
    )
    await expect(provider.sendKey("ctrl+t")).rejects.toMatchObject({
      code: "EXEC_FAILED",
    })
    await provider.stop()
  })

  it("plus maps to '+' literal and auto-injects shift", async () => {
    let captured: string[] = []
    const executor = makeExecutor((cmd, args) => {
      if (cmd === "osascript") captured = [...args]
      return { exitCode: 0, stdout: "", stderr: "" }
    })
    const provider = await createDarwinKeyMacroProvider({
      executor,
      logger: silentLogger(),
    })
    await provider.sendKey("cmd+plus")
    expect(captured[1]).toContain('keystroke "+"')
    expect(captured[1]).toContain("command down")
    expect(captured[1]).toContain("shift down")
    await provider.stop()
  })

  it("minus maps to '-' literal and auto-injects shift", async () => {
    let captured: string[] = []
    const executor = makeExecutor((cmd, args) => {
      if (cmd === "osascript") captured = [...args]
      return { exitCode: 0, stdout: "", stderr: "" }
    })
    const provider = await createDarwinKeyMacroProvider({
      executor,
      logger: silentLogger(),
    })
    await provider.sendKey("cmd+minus")
    expect(captured[1]).toContain('keystroke "-"')
    expect(captured[1]).toContain("command down")
    expect(captured[1]).toContain("shift down")
    await provider.stop()
  })

  it("named keys become key codes instead of literal text", async () => {
    const cases: ReadonlyArray<[string, number]> = [
      ["Escape", 53],
      ["Return", 36],
      ["Tab", 48],
      ["Up", 126],
      ["Page_Down", 121],
    ]
    for (const [key, code] of cases) {
      let captured: string[] = []
      const executor = makeExecutor((cmd, args) => {
        if (cmd === "osascript") captured = [...args]
        return { exitCode: 0, stdout: "", stderr: "" }
      })
      const provider = await createDarwinKeyMacroProvider({
        executor,
        logger: silentLogger(),
      })
      await provider.sendKey(key)
      expect(captured[1]).toContain(`key code ${code}`)
      expect(captured[1]).not.toContain(`keystroke "${key}"`)
      await provider.stop()
    }
  })

  it("a bare named key emits no empty `using {}` clause", async () => {
    let captured: string[] = []
    const executor = makeExecutor((cmd, args) => {
      if (cmd === "osascript") captured = [...args]
      return { exitCode: 0, stdout: "", stderr: "" }
    })
    const provider = await createDarwinKeyMacroProvider({
      executor,
      logger: silentLogger(),
    })
    await provider.sendKey("Escape")
    expect(captured[1]).not.toContain("using")
    await provider.stop()
  })

  it("super maps to command rather than leaking a bare word into the script", async () => {
    let captured: string[] = []
    const executor = makeExecutor((cmd, args) => {
      if (cmd === "osascript") captured = [...args]
      return { exitCode: 0, stdout: "", stderr: "" }
    })
    const provider = await createDarwinKeyMacroProvider({
      executor,
      logger: silentLogger(),
    })
    await provider.sendKey("super+l")
    expect(captured[1]).toContain("command down")
    expect(captured[1]).not.toContain("super")
    await provider.stop()
  })
})
