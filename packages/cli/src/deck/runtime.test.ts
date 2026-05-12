import { describe, expect, it, vi } from "vitest"

import { createDeckRuntime } from "./runtime.js"

import type { StreamDeckKeyEvent } from "../device/stream-deck.js"

describe("createDeckRuntime", () => {
  it("executes an action button on a same-key tap", async () => {
    let listener: ((event: StreamDeckKeyEvent) => void) | undefined
    const executeAction = vi.fn(async () => ({
      code: 0,
      failed: false,
      stderr: "",
      stdout: "ok",
      timedOut: false,
    }))
    const runtime = createDeckRuntime({
      deck: {
        id: "main",
        buttons: [{ type: "action", position: 1, command: "printf ok", label: "Run" }],
      },
      executeAction,
      subscribeKeyEvents: (nextListener) => {
        listener = nextListener
        return () => {
          listener = undefined
        }
      },
    })

    runtime.start()
    listener?.({ keyIndex: 1, type: "down" })
    listener?.({ keyIndex: 1, type: "up" })

    await vi.waitFor(() => {
      expect(executeAction).toHaveBeenCalledWith("printf ok")
    })
  })

  it("ignores display buttons and mismatched tap pairs", async () => {
    let listener: ((event: StreamDeckKeyEvent) => void) | undefined
    const executeAction = vi.fn()
    const runtime = createDeckRuntime({
      deck: {
        id: "main",
        buttons: [
          { type: "display", position: 0, label: "Clock" },
          { type: "action", position: 2, command: "printf ok", label: "Run" },
        ],
      },
      executeAction,
      subscribeKeyEvents: (nextListener) => {
        listener = nextListener
        return () => {
          listener = undefined
        }
      },
    })

    runtime.start()
    listener?.({ keyIndex: 0, type: "down" })
    listener?.({ keyIndex: 0, type: "up" })
    listener?.({ keyIndex: 2, type: "down" })
    listener?.({ keyIndex: 1, type: "up" })

    await Promise.resolve()
    expect(executeAction).not.toHaveBeenCalled()
  })

  it("cleans up listeners on stop", async () => {
    let listener: ((event: StreamDeckKeyEvent) => void) | undefined
    const unsubscribe = vi.fn(() => {
      listener = undefined
    })
    const executeAction = vi.fn()
    const runtime = createDeckRuntime({
      deck: {
        id: "main",
        buttons: [{ type: "action", position: 3, command: "printf ok", label: "Run" }],
      },
      executeAction,
      subscribeKeyEvents: (nextListener) => {
        listener = nextListener
        return unsubscribe
      },
    })

    runtime.start()
    runtime.stop()
    listener?.({ keyIndex: 3, type: "down" })
    listener?.({ keyIndex: 3, type: "up" })

    await Promise.resolve()
    expect(unsubscribe).toHaveBeenCalledTimes(1)
    expect(executeAction).not.toHaveBeenCalled()
  })

  it("renders busy and success feedback for action buttons", async () => {
    vi.useFakeTimers()
    let listener: ((event: StreamDeckKeyEvent) => void) | undefined
    const executeAction = vi.fn(async () => ({
      code: 0,
      failed: false,
      stderr: "",
      stdout: "ok",
      timedOut: false,
    }))
    const onRenderButton = vi.fn()
    const runtime = createDeckRuntime({
      deck: {
        id: "main",
        buttons: [{ type: "action", position: 1, command: "printf ok", label: "Run" }],
      },
      executeAction,
      onRenderButton,
      subscribeKeyEvents: (nextListener) => {
        listener = nextListener
        return () => {
          listener = undefined
        }
      },
    })

    runtime.start()
    onRenderButton.mockClear()
    listener?.({ keyIndex: 1, type: "down" })
    listener?.({ keyIndex: 1, type: "up" })

    await vi.waitFor(() => {
      expect(onRenderButton).toHaveBeenNthCalledWith(1, { keyIndex: 1, label: "...", icon: undefined })
      expect(onRenderButton).toHaveBeenNthCalledWith(2, { keyIndex: 1, label: "OK", icon: undefined })
    })

    await vi.advanceTimersByTimeAsync(1_500)

    expect(onRenderButton).toHaveBeenNthCalledWith(3, { keyIndex: 1, label: "Run", variant: "default" })
    vi.useRealTimers()
  })

  it("stops per-button polling on shutdown", async () => {
    const schedulerStop = vi.fn()
    const runtime = createDeckRuntime({
      createScheduler: () => ({
        intervalMs: 500,
        jitterMs: 75,
        scheduleDelay: () => 500,
        start: vi.fn(),
        stop: schedulerStop,
      }),
      deck: {
        id: "main",
        buttons: [{ type: "display", position: 0, label: "Clock", display_command: "printf now" }],
      },
      subscribeKeyEvents: () => () => {},
    })

    runtime.start()
    runtime.stop()

    expect(schedulerStop).toHaveBeenCalledTimes(1)
  })

  it("injects a generated back button on the last key for sub-decks", async () => {
    const runtime = createDeckRuntime({
      deck: {
        id: "main",
        buttons: [{ type: "change-deck", position: 0, target_deck: "apps", label: "Apps" }],
      },
      decks: {
        apps: { id: "apps", buttons: [{ type: "display", position: 2, label: "Terminal" }] },
        main: { id: "main", buttons: [{ type: "change-deck", position: 0, target_deck: "apps", label: "Apps" }] },
      },
      keyCount: 15,
      subscribeKeyEvents: (listener) => {
        listener({ keyIndex: 0, type: "down" })
        listener({ keyIndex: 0, type: "up" })
        return () => {}
      },
    })

    runtime.start()

    await Promise.resolve()
    expect(runtime.getReservedBackKeyIndex()).toBe(14)
    expect(runtime.getRenderButtons()).toContainEqual({ keyIndex: 14, label: "Back" })
  })

  it("cycles internal toggles and runs the next state's command", async () => {
    vi.useFakeTimers()
    let listener: ((event: StreamDeckKeyEvent) => void) | undefined
    const executeAction = vi.fn(async () => ({
      code: 0,
      failed: false,
      stderr: "",
      stdout: "ok",
      timedOut: false,
    }))
    const onRenderButton = vi.fn()
    const runtime = createDeckRuntime({
      deck: {
        id: "main",
        buttons: [
          {
            type: "toggle",
            position: 1,
            states: [
              { key: "off", label: "Off", command: "printf off" },
              { key: "on", label: "On", command: "printf on" },
            ],
          },
        ],
      },
      executeAction,
      onRenderButton,
      subscribeKeyEvents: (nextListener) => {
        listener = nextListener
        return () => {
          listener = undefined
        }
      },
    })

    runtime.start()
    onRenderButton.mockClear()
    listener?.({ keyIndex: 1, type: "down" })
    listener?.({ keyIndex: 1, type: "up" })

    await vi.waitFor(() => {
      expect(executeAction).toHaveBeenCalledWith("printf on")
      expect(onRenderButton).toHaveBeenCalledWith({ keyIndex: 1, label: "..." })
      expect(onRenderButton).toHaveBeenCalledWith({ keyIndex: 1, label: "OK" })
    })

    await vi.advanceTimersByTimeAsync(1_500)

    expect(runtime.getRenderButtons()).toContainEqual({ keyIndex: 1, label: "On", subtitle: "ON", variant: "toggle" })
    vi.useRealTimers()
  })

  it("keeps external toggles authoritative from status polling", async () => {
    vi.useFakeTimers()
    const executeDisplayCommand = vi.fn(async () => ({
      code: 0,
      failed: false,
      stderr: "",
      stdout: "on\nignored",
      timedOut: false,
    }))
    const executeAction = vi.fn(async () => ({
      code: 0,
      failed: false,
      stderr: "",
      stdout: "ok",
      timedOut: false,
    }))
    const onRenderButton = vi.fn()
    let listener: ((event: StreamDeckKeyEvent) => void) | undefined
    let scheduledTask: { run: () => Promise<void> | void } | undefined
    const runtime = createDeckRuntime({
      createScheduler: () => ({
        intervalMs: 500,
        jitterMs: 75,
        scheduleDelay: () => 500,
        start: vi.fn((tasks) => {
          scheduledTask = tasks[0]
        }),
        stop: vi.fn(),
      }),
      deck: {
        id: "main",
        buttons: [
          {
            type: "toggle",
            position: 1,
            status_command: "printf on",
            interval_ms: 500,
            states: [
              { key: "off", label: "Pause", command: "printf pause" },
              { key: "on", label: "Play", command: "printf play" },
            ],
          },
        ],
      },
      executeAction,
      executeDisplayCommand,
      onRenderButton,
      subscribeKeyEvents: (nextListener) => {
        listener = nextListener
        return () => {
          listener = undefined
        }
      },
    })

    runtime.start()

    await vi.waitFor(() => {
      expect(executeDisplayCommand).toHaveBeenCalledWith("printf on")
    })

    expect(runtime.getRenderButtons()).toContainEqual({ keyIndex: 1, label: "Play", subtitle: "ON", variant: "toggle" })

    onRenderButton.mockClear()
    listener?.({ keyIndex: 1, type: "down" })
    listener?.({ keyIndex: 1, type: "up" })

    await vi.waitFor(() => {
      expect(executeAction).toHaveBeenCalledWith("printf pause")
      expect(onRenderButton).toHaveBeenCalledWith({ keyIndex: 1, label: "..." })
      expect(onRenderButton).toHaveBeenCalledWith({ keyIndex: 1, label: "OK" })
    })

    onRenderButton.mockClear()
    await scheduledTask?.run()

    await vi.advanceTimersByTimeAsync(1_500)
    expect(runtime.getRenderButtons()).toContainEqual({ keyIndex: 1, label: "Play", subtitle: "ON", variant: "toggle" })
    vi.useRealTimers()
  })

  it("restarts polling for the newly active deck only", async () => {
    let listener: ((event: StreamDeckKeyEvent) => void) | undefined
    const schedulerStart = vi.fn()
    const schedulerStop = vi.fn()
    const runtime = createDeckRuntime({
      createScheduler: () => ({
        intervalMs: 500,
        jitterMs: 75,
        scheduleDelay: () => 500,
        start: schedulerStart,
        stop: schedulerStop,
      }),
      deck: {
        id: "main",
        buttons: [
          { type: "change-deck", position: 0, target_deck: "apps", label: "Apps" },
          {
            type: "toggle",
            position: 1,
            status_command: "printf on",
            interval_ms: 500,
            states: [
              { key: "off", label: "Off", command: "printf off" },
              { key: "on", label: "On", command: "printf on" },
            ],
          },
        ],
      },
      decks: {
        main: {
          id: "main",
          buttons: [
            { type: "change-deck", position: 0, target_deck: "apps", label: "Apps" },
            {
              type: "toggle",
              position: 1,
              status_command: "printf on",
              interval_ms: 500,
              states: [
                { key: "off", label: "Off", command: "printf off" },
                { key: "on", label: "On", command: "printf on" },
              ],
            },
          ],
        },
        apps: {
          id: "apps",
          buttons: [
            {
              type: "toggle",
              position: 2,
              status_command: "printf on",
              interval_ms: 500,
              states: [
                { key: "off", label: "Sleep", command: "printf sleep" },
                { key: "on", label: "Wake", command: "printf wake" },
              ],
            },
          ],
        },
      },
      subscribeKeyEvents: (nextListener) => {
        listener = nextListener
        return () => {
          listener = undefined
        }
      },
    })

    runtime.start()
    expect(schedulerStart).toHaveBeenCalledTimes(1)

    listener?.({ keyIndex: 0, type: "down" })
    listener?.({ keyIndex: 0, type: "up" })

    await Promise.resolve()
    expect(schedulerStop).toHaveBeenCalledTimes(1)
    expect(schedulerStart).toHaveBeenCalledTimes(2)
  })
})
