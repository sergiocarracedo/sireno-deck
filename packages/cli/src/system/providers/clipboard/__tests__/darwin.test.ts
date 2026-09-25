import { describe, expect, it, vi } from "vitest"

import { createDarwinClipboardProvider } from "../darwin"

const silentLogger = () =>
  ({ warn: vi.fn(), info: vi.fn(), debug: vi.fn(), error: vi.fn() }) as never

const makeExecutor = () => {
  const calls: Array<{ command: string; args: ReadonlyArray<string> }> = []
  return {
    calls,
    executor: {
      run: async (command: string, args: ReadonlyArray<string>) => {
        calls.push({ command, args })
        return { exitCode: 0, stdout: "", stderr: "" }
      },
    },
  }
}

/**
 * `pbcopy` and `pbpaste` pick their encoding from the locale, and the daemon
 * usually runs under launchd, which passes almost nothing — the generated unit
 * sets PATH and no locale at all. Without LC_CTYPE they fall back to Mac OS
 * Roman, so an emoji's UTF-8 bytes come back out as the Mac OS Roman
 * characters that share them: 🏉 pasted as "üèâ". Nothing errors; pbcopy exits
 * 0 having copied the wrong text, which is why this went unnoticed.
 */
describe("darwin clipboard provider", () => {
  it("states UTF-8 when writing, so emoji survive a launchd environment", async () => {
    const { calls, executor } = makeExecutor()
    const clipboard = createDarwinClipboardProvider({
      executor,
      logger: silentLogger(),
    })

    await clipboard.writeText("🏉")

    const command = calls[0]?.args.join(" ") ?? ""
    expect(command).toContain("pbcopy")
    expect(command).toContain("LC_CTYPE=UTF-8")
  })

  it("states UTF-8 when reading too", async () => {
    const { calls, executor } = makeExecutor()
    const clipboard = createDarwinClipboardProvider({
      executor,
      logger: silentLogger(),
    })

    await clipboard.readText()

    const command = calls[0]?.args.join(" ") ?? ""
    expect(command).toContain("pbpaste")
    expect(command).toContain("LC_CTYPE=UTF-8")
  })

  it("still escapes single quotes in the text it copies", async () => {
    const { calls, executor } = makeExecutor()
    const clipboard = createDarwinClipboardProvider({
      executor,
      logger: silentLogger(),
    })

    await clipboard.writeText("it's")

    expect(calls[0]?.args.join(" ")).toContain("it'\\''s")
  })
})
