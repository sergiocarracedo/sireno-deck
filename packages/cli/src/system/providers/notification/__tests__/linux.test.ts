import { describe, expect, it, vi } from "vitest"

import type pino from "pino"

import type { CommandExecutor } from "@/system/providers/shared"

import { createLinuxNotificationProvider } from "../linux"

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
  responses:
    | Record<string, { exitCode: number; stdout?: string; stderr?: string }>
    | ((
        tool: string,
        args: ReadonlyArray<string>,
      ) => { exitCode: number; stdout?: string; stderr?: string }),
): {
  executor: CommandExecutor
  calls: Array<{ tool: string; args: string[] }>
} => {
  const calls: Array<{ tool: string; args: string[] }> = []
  const resolve = (
    tool: string,
    args: ReadonlyArray<string>,
  ): { exitCode: number; stdout: string; stderr: string } => {
    const resp =
      typeof responses === "function"
        ? responses(tool, args)
        : (responses[tool] ?? { exitCode: 1, stdout: "" })
    return {
      exitCode: resp.exitCode,
      stdout: resp.stdout ?? "",
      stderr: resp.stderr ?? "",
    }
  }
  const executor: CommandExecutor = {
    async run(tool: string, args: ReadonlyArray<string>) {
      calls.push({ tool, args: [...args] })
      return resolve(tool, args)
    },
  }
  return { executor, calls }
}

describe("createLinuxNotificationProvider", () => {
  it("calls notify-send with title and body", async () => {
    const { executor, calls } = makeExecutor({
      which: { exitCode: 0, stdout: "/usr/bin/notify-send" },
      "notify-send": { exitCode: 0, stdout: "" },
    })
    const provider = await createLinuxNotificationProvider({
      executor,
      logger: silentLogger(),
    })
    await provider.notify({ title: "Pomodoro", body: "Done" })
    const send = calls.find((c) => c.tool === "notify-send")
    expect(send).toBeDefined()
    expect(send?.args.some((a) => a.includes("Pomodoro"))).toBe(true)
    expect(send?.args.some((a) => a.includes("Done"))).toBe(true)
  })

  it("is a no-op when notify-send is missing", async () => {
    const { executor, calls } = makeExecutor({
      which: { exitCode: 1, stdout: "" },
    })
    const provider = await createLinuxNotificationProvider({
      executor,
      logger: silentLogger(),
    })
    await provider.notify({ title: "x", body: "y" })
    expect(calls.find((c) => c.tool === "notify-send")).toBeUndefined()
  })

  it("plays sound via ffplay when soundPath is provided", async () => {
    const { executor, calls } = makeExecutor({
      which: { exitCode: 0, stdout: "/usr/bin/tool" },
      "notify-send": { exitCode: 0 },
      ffplay: { exitCode: 0 },
    })
    const provider = await createLinuxNotificationProvider({
      executor,
      logger: silentLogger(),
      soundPath: "/tmp/bell.ogg",
    })
    await provider.notify({ title: "x", body: "y", sound: true })
    const play = calls.find((c) => c.tool === "ffplay")
    expect(play).toBeDefined()
    expect(play?.args).toContain("/tmp/bell.ogg")
  })

  it("does not play sound when sound flag is missing", async () => {
    const { executor, calls } = makeExecutor({
      which: { exitCode: 0, stdout: "/usr/bin/tool" },
      "notify-send": { exitCode: 0 },
      ffplay: { exitCode: 0 },
    })
    const provider = await createLinuxNotificationProvider({
      executor,
      logger: silentLogger(),
      soundPath: "/tmp/bell.ogg",
    })
    await provider.notify({ title: "x", body: "y" })
    expect(calls.find((c) => c.tool === "ffplay")).toBeUndefined()
  })
})
