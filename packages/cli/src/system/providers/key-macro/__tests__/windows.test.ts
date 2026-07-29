import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import type pino from "pino"

import { ProviderError } from "@/system/providers/error"

import { createWindowsKeyMacroProvider } from "../windows"
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

const CACHE_DIR = join(tmpdir(), "sireno-deck", "key-macro-windows")
const HELPER_DLL = join(CACHE_DIR, "sirenokey-input.dll")

const ensureHelperDll = (): void => {
  mkdirSync(CACHE_DIR, { recursive: true })
  writeFileSync(HELPER_DLL, "// stub for tests\n")
}

const decodePSPayload = (args: ReadonlyArray<string>): string => {
  const i = args.indexOf("-EncodedCommand")
  if (i === -1) return ""
  const b64 = args[i + 1] ?? ""
  return Buffer.from(b64, "base64").toString("utf16le")
}

const makeExecutor = (
  handler: (
    cmd: string,
    args: ReadonlyArray<string>,
  ) => { exitCode: number; stdout: string; stderr: string },
): {
  executor: CommandExecutor
  calls: Array<{ cmd: string; args: string[] }>
} => {
  const calls: Array<{ cmd: string; args: string[] }> = []
  const executor: CommandExecutor = {
    async run(cmd: string, args: ReadonlyArray<string>) {
      const snap = [...args]
      calls.push({ cmd, args: snap })
      return handler(cmd, snap)
    },
  }
  return { executor, calls }
}

describe("createWindowsKeyMacroProvider", () => {
  const HELPER_SRC_HASH = join(CACHE_DIR, "sirenokey-input.dll.src.sha256")

  beforeEach(() => {
    vi.clearAllMocks()
    ensureHelperDll()
  })
  afterEach(() => {
    if (existsSync(HELPER_DLL)) rmSync(HELPER_DLL)
    if (existsSync(HELPER_SRC_HASH)) rmSync(HELPER_SRC_HASH)
  })

  it("sendKey('ctrl+t') emits KeyDown(17)+TapKey(84)+KeyUp(17) via -EncodedCommand", async () => {
    const psCalls: string[] = []
    const { executor, calls } = makeExecutor((cmd, args) => {
      if (cmd === "powershell") psCalls.push(decodePSPayload(args))
      return { exitCode: 0, stdout: "ok:0:", stderr: "" }
    })
    const provider = await createWindowsKeyMacroProvider({
      executor,
      logger: silentLogger(),
    })
    await provider.sendKey("ctrl+t")
    expect(calls.length).toBeGreaterThanOrEqual(2)
    expect(calls[0]!.cmd).toBe("powershell")
    expect(calls[0]!.args).toContain("-NoProfile")
    expect(calls[0]!.args).toContain("-EncodedCommand")
    expect(calls[1]!.args).toContain("-NoProfile")
    expect(calls[1]!.args).toContain("-EncodedCommand")
    expect(psCalls[1]!).toContain("[SirenoKey]::KeyDown(17)")
    expect(psCalls[1]!).toContain("[SirenoKey]::TapKey(84)")
    expect(psCalls[1]!).toContain("[SirenoKey]::KeyUp(17)")
    await provider.stop()
  })

  it("sendKey('alt+shift+F4') emits ordered mod sequence", async () => {
    const psCalls: string[] = []
    const { executor } = makeExecutor((cmd, args) => {
      if (cmd === "powershell") psCalls.push(decodePSPayload(args))
      return { exitCode: 0, stdout: "ok:0:", stderr: "" }
    })
    const provider = await createWindowsKeyMacroProvider({
      executor,
      logger: silentLogger(),
    })
    await provider.sendKey("alt+shift+F4")
    expect(psCalls[1]!).toContain("KeyDown(18)")
    expect(psCalls[1]!).toContain("KeyDown(16)")
    expect(psCalls[1]!).toContain("TapKey(115)")
    expect(psCalls[1]!).toContain("KeyUp(18)")
    expect(psCalls[1]!).toContain("KeyUp(16)")
    await provider.stop()
  })

  it("sendKey('Return') sends VK_RETURN (0x0D)", async () => {
    const psCalls: string[] = []
    const { executor } = makeExecutor((cmd, args) => {
      if (cmd === "powershell") psCalls.push(decodePSPayload(args))
      return { exitCode: 0, stdout: "ok:0:", stderr: "" }
    })
    const provider = await createWindowsKeyMacroProvider({
      executor,
      logger: silentLogger(),
    })
    await provider.sendKey("Return")
    expect(psCalls[1]!).toContain("TapKey(13)")
    await provider.stop()
  })

  it("sendKey('hello') invokes TypeText", async () => {
    const psCalls: string[] = []
    const { executor } = makeExecutor((cmd, args) => {
      if (cmd === "powershell") psCalls.push(decodePSPayload(args))
      return { exitCode: 0, stdout: "ok:0:", stderr: "" }
    })
    const provider = await createWindowsKeyMacroProvider({
      executor,
      logger: silentLogger(),
    })
    await provider.sendKey("hello")
    expect(psCalls[1]!).toContain("[SirenoKey]::TypeText(")
    expect(psCalls[1]!).toContain("hello")
    await provider.stop()
  })

  it("sendKey with emoji invokes TypeText (Unicode path)", async () => {
    const psCalls: string[] = []
    const { executor } = makeExecutor((cmd, args) => {
      if (cmd === "powershell") psCalls.push(decodePSPayload(args))
      return { exitCode: 0, stdout: "ok:0:", stderr: "" }
    })
    const provider = await createWindowsKeyMacroProvider({
      executor,
      logger: silentLogger(),
    })
    await provider.sendKey("🔥")
    expect(psCalls[1]!).toContain("[SirenoKey]::TypeText(")
    expect(psCalls[1]!).toContain("🔥")
    await provider.stop()
  })

  it("SendInput runtime failure (Win32 code) is mapped to ProviderError", async () => {
    const { executor } = makeExecutor(() => ({
      exitCode: 0,
      stdout: "fail:87:SendInput returned 0 of 2",
      stderr: "",
    }))
    const provider = await createWindowsKeyMacroProvider({
      executor,
      logger: silentLogger(),
    })
    await expect(provider.sendKey("ctrl+t")).rejects.toBeInstanceOf(
      ProviderError,
    )
    let captured: unknown
    try {
      await provider.sendKey("ctrl+t")
    } catch (err) {
      captured = err
    }
    expect((captured as Error).message).toContain(
      "SendInput failed (Win32 #87)",
    )
    await provider.stop()
  })

  it("powershell non-zero exit throws ProviderError with stderr", async () => {
    const { executor } = makeExecutor(() => ({
      exitCode: 1,
      stdout: "",
      stderr: "Add-Type failed",
    }))
    const provider = await createWindowsKeyMacroProvider({
      executor,
      logger: silentLogger(),
    })
    await expect(provider.sendKey("ctrl+t")).rejects.toBeInstanceOf(
      ProviderError,
    )
    let captured: unknown
    try {
      await provider.sendKey("ctrl+t")
    } catch (err) {
      captured = err
    }
    expect((captured as Error).message).toContain("Add-Type failed")
    await provider.stop()
  })

  it("compile failure → null provider (NOT_AVAILABLE)", async () => {
    rmSync(HELPER_DLL)
    const { executor } = makeExecutor(() => ({
      exitCode: 1,
      stdout: "",
      stderr: "Add-Type compile error",
    }))
    const provider = await createWindowsKeyMacroProvider({
      executor,
      logger: silentLogger(),
    })
    await expect(provider.sendKey("ctrl+t")).rejects.toMatchObject({
      code: "NOT_AVAILABLE",
      message: expect.stringContaining("PowerShell Add-Type failed"),
    })
  })

  it("compile returns exit 0 but DLL missing → null provider", async () => {
    rmSync(HELPER_DLL)
    const { executor } = makeExecutor(() => ({
      exitCode: 0,
      stdout: "",
      stderr: "",
    }))
    const provider = await createWindowsKeyMacroProvider({
      executor,
      logger: silentLogger(),
    })
    await expect(provider.sendKey("ctrl+t")).rejects.toMatchObject({
      code: "NOT_AVAILABLE",
    })
  })
})
