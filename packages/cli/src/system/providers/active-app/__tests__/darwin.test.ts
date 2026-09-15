import { describe, expect, it, vi } from "vitest"

import type pino from "pino"

import type { CommandExecutor } from "@/system/providers/shared"

import * as darwin from "../darwin"

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

const import_ = darwin

describe("createDarwinActiveAppProvider", () => {
  it("parses newline-delimited osascript output into ActiveAppSnapshot", async () => {
    const executor = makeExecutor((cmd) => {
      if (cmd === "osascript")
        return {
          exitCode: 0,
          stdout: "Google Chrome\n12345\nGitHub",
          stderr: "",
        }
      return { exitCode: 1, stdout: "", stderr: "" }
    })
    const provider = await import_.createDarwinActiveAppProvider({
      executor,
      logger: silentLogger(),
    })
    const snap = await provider.getActive()
    expect(snap).toEqual({
      name: "Google Chrome",
      windowTitle: "GitHub",
      processId: 12345,
    })
    await provider.stop()
  })

  // Regression: the old parser split on "," so a comma in the window title
  // shifted every field and corrupted the app name and pid.
  it("keeps a window title that contains commas intact", async () => {
    const executor = makeExecutor(() => ({
      exitCode: 0,
      stdout: "Slack\n42\nfoo, bar, baz",
      stderr: "",
    }))
    const provider = await import_.createDarwinActiveAppProvider({
      executor,
      logger: silentLogger(),
    })
    expect(await provider.getActive()).toEqual({
      name: "Slack",
      windowTitle: "foo, bar, baz",
      processId: 42,
    })
    await provider.stop()
  })

  // Without an Accessibility grant the script's inner `try` yields an empty
  // title; name and pid must still come through.
  it("degrades to a null window title when the title is unavailable", async () => {
    const executor = makeExecutor(() => ({
      exitCode: 0,
      stdout: "Terminal\n999\n",
      stderr: "",
    }))
    const provider = await import_.createDarwinActiveAppProvider({
      executor,
      logger: silentLogger(),
    })
    expect(await provider.getActive()).toEqual({
      name: "Terminal",
      windowTitle: null,
      processId: 999,
    })
    await provider.stop()
  })

  it("returns last snapshot on osascript failure", async () => {
    const executor = makeExecutor((cmd) => {
      if (cmd === "osascript")
        return { exitCode: 0, stdout: "Google Chrome\n1\nGitHub", stderr: "" }
      return { exitCode: 1, stdout: "", stderr: "fail" }
    })
    const provider = await import_.createDarwinActiveAppProvider({
      executor,
      logger: silentLogger(),
    })
    const snap1 = await provider.getActive()
    expect(snap1?.name).toBe("Google Chrome")
    const snap2 = await provider.getActive()
    expect(snap2?.name).toBe("Google Chrome")
    await provider.stop()
  })

  it("returns null when osascript returns empty", async () => {
    const executor = makeExecutor(() => ({
      exitCode: 0,
      stdout: "",
      stderr: "",
    }))
    const provider = await import_.createDarwinActiveAppProvider({
      executor,
      logger: silentLogger(),
    })
    const snap = await provider.getActive()
    expect(snap).toBeNull()
    await provider.stop()
  })

  it("stop() clears interval", async () => {
    const executor = makeExecutor(() => ({
      exitCode: 0,
      stdout: "",
      stderr: "",
    }))
    const provider = await import_.createDarwinActiveAppProvider({
      executor,
      logger: silentLogger(),
    })
    await provider.stop()
  })
})
