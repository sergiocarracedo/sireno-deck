import { describe, expect, it, vi } from "vitest"
import { createWindowsNotificationProvider } from "../windows"

describe("Windows notifications", () => {
  it("does not embed event title or body as PowerShell code", async () => {
    const run = vi.fn(async (_command: string, _args: string[]) => ({
      stdout: "",
      stderr: "",
      exitCode: 0,
    }))
    const provider = await createWindowsNotificationProvider({
      executor: { run } as never,
      logger: { warn: vi.fn() } as never,
    })
    const title = '"; Start-Process calc; #'
    const body = '$(Start-Process calc) `" secret'
    await provider.notify({ title, body })
    const args = run.mock.calls[0]?.[1] as string[]
    const script = args[2]!
    expect(script).not.toContain(title)
    expect(script).not.toContain(body)
    expect(script).toContain(Buffer.from(title, "utf8").toString("base64"))
    expect(script).toContain(Buffer.from(body, "utf8").toString("base64"))
  })
})
