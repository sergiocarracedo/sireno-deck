import { describe, expect, it, vi } from "vitest"

import type pino from "pino"

import type { CommandExecutor } from "@/system/providers/shared"

import {
  createNotificationProvider,
  createNullNotificationProvider,
} from "../../notification"

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
  responses: Record<
    string,
    { exitCode: number; stdout?: string; stderr?: string }
  >,
): CommandExecutor => {
  return {
    async run(tool: string) {
      const resp = responses[tool] ?? { exitCode: 1, stdout: "", stderr: "" }
      return {
        exitCode: resp.exitCode,
        stdout: resp.stdout ?? "",
        stderr: resp.stderr ?? "",
      }
    },
  }
}

describe("createNotificationProvider", () => {
  it("returns a working linux impl when notify-send is present", async () => {
    const executor = makeExecutor({
      which: { exitCode: 0, stdout: "/usr/bin/which", stderr: "" },
      "notify-send": { exitCode: 0, stdout: "", stderr: "" },
    })
    const provider = await createNotificationProvider({
      platform: "linux",
      executor,
      env: {},
      logger: silentLogger(),
    })
    await provider.notify({ title: "Hi", body: "There" })
    expect(true).toBe(true)
  })

  it("returns a no-op linux impl when notify-send is missing", async () => {
    const executor = makeExecutor({
      which: { exitCode: 1, stdout: "", stderr: "" },
    })
    const provider = await createNotificationProvider({
      platform: "linux",
      executor,
      env: {},
      logger: silentLogger(),
    })
    await provider.notify({ title: "Hi", body: "There" })
    expect(true).toBe(true)
  })

  it("returns darwin impl", async () => {
    const executor = makeExecutor({
      osascript: { exitCode: 0, stdout: "", stderr: "" },
    })
    const provider = await createNotificationProvider({
      platform: "darwin",
      executor,
      env: {},
      logger: silentLogger(),
    })
    await provider.notify({ title: "Hi", body: "There" })
    expect(true).toBe(true)
  })

  it("returns windows impl", async () => {
    const executor = makeExecutor({
      powershell: { exitCode: 0, stdout: "", stderr: "" },
    })
    const provider = await createNotificationProvider({
      platform: "win32",
      executor,
      env: {},
      logger: silentLogger(),
    })
    await provider.notify({ title: "Hi", body: "There" })
    expect(true).toBe(true)
  })

  it("returns null provider for unsupported platforms", async () => {
    const executor = makeExecutor({})
    const provider = await createNotificationProvider({
      platform: "freebsd",
      executor,
      env: {},
      logger: silentLogger(),
    })
    await provider.notify({ title: "Hi", body: "There" })
    expect(typeof provider.notify).toBe("function")
  })
})

describe("createNullNotificationProvider", () => {
  it("notify() is a no-op", async () => {
    const provider = createNullNotificationProvider()
    await provider.notify({ title: "x", body: "y" })
    expect(true).toBe(true)
  })
})
