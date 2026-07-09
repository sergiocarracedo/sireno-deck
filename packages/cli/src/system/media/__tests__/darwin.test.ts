import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type pino from "pino"

import { createDarwinMediaProvider, type CommandExecutor } from "../darwin"

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

describe("createDarwinMediaProvider", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("play() invokes osascript 'tell application Spotify to play'", async () => {
    let captured: string[] = []
    const executor = makeExecutor((cmd, args) => {
      if (cmd === "osascript") captured = [...args]
      return { exitCode: 0, stdout: "", stderr: "" }
    })
    const provider = await createDarwinMediaProvider({
      executor,
      logger: silentLogger(),
    })
    await provider.play()
    expect(captured[1]).toContain("play")
    await provider.stop()
  })

  it("pause() invokes osascript 'pause'", async () => {
    let captured: string[] = []
    const executor = makeExecutor((cmd, args) => {
      if (cmd === "osascript") captured = [...args]
      return { exitCode: 0, stdout: "", stderr: "" }
    })
    const provider = await createDarwinMediaProvider({
      executor,
      logger: silentLogger(),
    })
    await provider.pause()
    expect(captured[1]).toContain("pause")
    await provider.stop()
  })

  it("getCurrent() parses Spotify record output", async () => {
    const executor = makeExecutor((cmd) => {
      if (cmd === "osascript") {
        return {
          exitCode: 0,
          stdout: "Time, Pink Floyd, Dark Side of the Moon",
          stderr: "",
        }
      }
      return { exitCode: 0, stdout: "", stderr: "" }
    })
    const provider = await createDarwinMediaProvider({
      executor,
      logger: silentLogger(),
    })
    const meta = await provider.getCurrent()
    expect(meta).toEqual({
      title: "Time",
      artist: "Pink Floyd",
      album: "Dark Side of the Moon",
      artUrl: null,
    })
    await provider.stop()
  })

  it("getCurrent() returns null on empty output", async () => {
    const executor = makeExecutor(() => ({
      exitCode: 1,
      stdout: "",
      stderr: "no player",
    }))
    const provider = await createDarwinMediaProvider({
      executor,
      logger: silentLogger(),
    })
    const meta = await provider.getCurrent()
    expect(meta).toBeNull()
    await provider.stop()
  })

  it("onChange handler fires when track changes", async () => {
    let callCount = 0
    const executor = makeExecutor(() => {
      callCount += 1
      if (callCount === 1)
        return { exitCode: 0, stdout: "T1, A1, Al1", stderr: "" }
      return { exitCode: 0, stdout: "T2, A2, Al2", stderr: "" }
    })
    const provider = await createDarwinMediaProvider({
      executor,
      logger: silentLogger(),
      pollIntervalMs: 100,
    })
    const handler = vi.fn()
    provider.onChange(handler)
    await vi.advanceTimersByTimeAsync(300)
    expect(handler).toHaveBeenCalled()
    await provider.stop()
  })
})
