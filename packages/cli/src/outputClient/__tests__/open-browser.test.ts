import type pino from "pino"
import { describe, expect, it, vi } from "vitest"

const { execFileMock } = vi.hoisted(() => ({
  execFileMock: vi.fn(
    (_cmd: string, _args: string[], cb: (err: Error | null) => void) =>
      cb(null),
  ),
}))

vi.mock("node:child_process", async () => ({
  ...(await vi.importActual<typeof import("node:child_process")>(
    "node:child_process",
  )),
  execFile: execFileMock,
}))

import { openBrowser } from "../open-browser"

const silentLogger = (): pino.Logger =>
  ({
    info: () => undefined,
    warn: () => undefined,
    debug: () => undefined,
    error: () => undefined,
    fatal: () => undefined,
    trace: () => undefined,
    child: () => silentLogger(),
    level: "silent",
    silent: () => undefined,
  }) as unknown as pino.Logger

describe("openBrowser", () => {
  it("calls execFile with the URL when noOpen is not set", () => {
    openBrowser("http://127.0.0.1:52938", silentLogger())
    expect(execFileMock).toHaveBeenCalledTimes(1)
    const [cmd, args] = execFileMock.mock.calls[0] as [string, string[]]
    expect(args[args.length - 1]).toBe("http://127.0.0.1:52938")
  })

  it("skips execFile when noOpen is true", () => {
    execFileMock.mockClear()
    openBrowser("http://127.0.0.1:52938", silentLogger(), true)
    expect(execFileMock).toHaveBeenCalledTimes(0)
  })
})
