import { describe, expect, it, vi } from "vitest"

import { createLinuxBrightnessProvider } from "../linux"

const silentLogger = () => ({
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
  trace: () => undefined,
  fatal: () => undefined,
  child: () => silentLogger(),
  level: "silent" as const,
})

const makeExecutor = (
  responses: Array<{ exitCode: number; stdout: string; stderr: string }>,
) => {
  const calls: Array<{ command: string; args: ReadonlyArray<string> }> = []
  let i = 0
  const run = vi.fn(async (command: string, args: ReadonlyArray<string>) => {
    calls.push({ command, args })
    const r = responses[i] ?? responses[responses.length - 1]
    i += 1
    if (r === undefined) {
      return { exitCode: -1, stdout: "", stderr: "no more mock responses" }
    }
    return r
  })
  return { run, calls }
}

const x11Env = { ...process.env, WAYLAND_DISPLAY: "" }
const waylandEnv = { ...process.env, WAYLAND_DISPLAY: "wayland-0" }

describe("createLinuxBrightnessProvider", () => {
  it("parses xrandr --query output on X11", async () => {
    const { run, calls } = makeExecutor([
      {
        exitCode: 0,
        stdout:
          "Screen 0: minimum 8, current 8, maximum 255\nBrightness: 0.50/1.00\n",
        stderr: "",
      },
    ])
    const provider = createLinuxBrightnessProvider({
      executor: { run },
      env: x11Env,
      logger: silentLogger(),
    })
    const reading = await provider.getCurrent()
    expect(reading).toEqual({ value: 50, max: 100 })
    expect(calls[0]?.command).toBe("xrandr --query")
  })

  it("falls back to brightnessctl on Wayland", async () => {
    const { run, calls } = makeExecutor([
      { exitCode: 0, stdout: "75\n", stderr: "" },
    ])
    const provider = createLinuxBrightnessProvider({
      executor: { run },
      env: waylandEnv,
      logger: silentLogger(),
    })
    const reading = await provider.getCurrent()
    expect(reading).toEqual({ value: 75, max: 100 })
    expect(calls[0]?.command).toBe("brightnessctl get")
  })

  it("returns null reading when both backends fail on X11", async () => {
    const { run } = makeExecutor([
      { exitCode: 1, stdout: "", stderr: "xrandr not found" },
      { exitCode: 1, stdout: "", stderr: "brightnessctl not found" },
    ])
    const provider = createLinuxBrightnessProvider({
      executor: { run },
      env: x11Env,
      logger: silentLogger(),
    })
    const reading = await provider.getCurrent()
    expect(reading).toEqual({ value: 0, max: 100 })
  })

  it("clamps setBrightness to 0-100 on Wayland", async () => {
    const { run, calls } = makeExecutor([
      { exitCode: 0, stdout: "", stderr: "" },
    ])
    const provider = createLinuxBrightnessProvider({
      executor: { run },
      env: waylandEnv,
      logger: silentLogger(),
    })
    await provider.setBrightness(150)
    expect(calls[0]?.args[0]).toBe("100%")
  })
})
