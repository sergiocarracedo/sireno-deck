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

  // ponytail: AppleScript `keystroke` synthesises events against the current
  // keyboard layout, so it cannot produce a character the layout has no key
  // for — emoji typed nothing. Mirror the Linux provider: pasteboard + paste.
  it("sendKey('😀') writes to the pasteboard and sends cmd+v", async () => {
    const calls: Array<{ cmd: string; args: string[] }> = []
    const executor = makeExecutor((cmd, args) => {
      calls.push({ cmd, args: [...args] })
      return { exitCode: 0, stdout: "", stderr: "" }
    })
    const provider = await createDarwinKeyMacroProvider({
      executor,
      logger: silentLogger(),
    })
    await provider.sendKey("😀")

    const pbcopy = calls.find((c) => c.args.join(" ").includes("pbcopy"))
    expect(pbcopy).toBeDefined()
    expect(pbcopy!.args.join(" ")).toContain("😀")

    const paste = calls.find((c) => c.args.join(" ").includes('keystroke "v"'))
    expect(paste).toBeDefined()
    expect(paste!.args.join(" ")).toContain("command down")

    // It must NOT try to type the emoji directly.
    expect(calls.some((c) => c.args.join(" ").includes('keystroke "😀"'))).toBe(
      false,
    )
    await provider.stop()
  })

  it("plain ASCII text still types directly, not via the pasteboard", async () => {
    const calls: Array<{ cmd: string; args: string[] }> = []
    const executor = makeExecutor((cmd, args) => {
      calls.push({ cmd, args: [...args] })
      return { exitCode: 0, stdout: "", stderr: "" }
    })
    const provider = await createDarwinKeyMacroProvider({
      executor,
      logger: silentLogger(),
    })
    await provider.sendKey("hello world")
    expect(calls.some((c) => c.args.join(" ").includes("pbcopy"))).toBe(false)
    expect(
      calls.some((c) => c.args.join(" ").includes('keystroke "hello world"')),
    ).toBe(true)
    await provider.stop()
  })

  it("accented text routes through the pasteboard", async () => {
    const calls: Array<{ cmd: string; args: string[] }> = []
    const executor = makeExecutor((cmd, args) => {
      calls.push({ cmd, args: [...args] })
      return { exitCode: 0, stdout: "", stderr: "" }
    })
    const provider = await createDarwinKeyMacroProvider({
      executor,
      logger: silentLogger(),
    })
    await provider.sendKey("adiós")
    expect(calls.some((c) => c.args.join(" ").includes("pbcopy"))).toBe(true)
    await provider.stop()
  })

  it("a denied Accessibility grant surfaces an actionable error, not raw osascript text", async () => {
    // macOS reports the denial as (1002) for keystrokes / (-1719) for
    // assistive access. The raw text told the user nothing actionable.
    for (const stderr of [
      "System Events got an error: osascript is not allowed to send keystrokes. (1002)",
      "System Events got an error: osascript is not allowed assistive access. (-1719)",
    ]) {
      const executor = makeExecutor(() => ({
        exitCode: 1,
        stdout: "",
        stderr,
      }))
      const provider = await createDarwinKeyMacroProvider({
        executor,
        logger: silentLogger(),
      })
      await expect(provider.sendKey("ctrl+t")).rejects.toMatchObject({
        code: "NOT_AVAILABLE",
        message: expect.stringContaining("Accessibility"),
      })
      await provider.stop()
    }
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
