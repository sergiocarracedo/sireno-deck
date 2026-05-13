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
    const schedulerStart = vi.fn()
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
        buttons: [{ type: "display", position: 0, label: "Clock", display_command: "printf now" }],
      },
      subscribeKeyEvents: () => () => {},
    })

    runtime.start()

    await vi.waitFor(() => {
      expect(schedulerStart).toHaveBeenCalledTimes(1)
    })

    runtime.stop()

    expect(schedulerStop).toHaveBeenCalledTimes(1)
  })

  it("does not start polling after stop when activation render resolves late", async () => {
    let resolveRender: (() => void) | undefined
    const schedulerStop = vi.fn()
    const schedulerStart = vi.fn()
    const onRenderDeck = vi.fn(() => new Promise<void>((resolve) => {
      resolveRender = resolve
    }))
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
        buttons: [{ type: "display", position: 0, label: "Clock", display_command: "printf now" }],
      },
      onRenderDeck,
      subscribeKeyEvents: () => () => {},
    })

    runtime.start()

    await vi.waitFor(() => {
      expect(onRenderDeck).toHaveBeenCalledTimes(1)
    })

    runtime.stop()
    resolveRender?.()
    await Promise.resolve()

    expect(schedulerStart).not.toHaveBeenCalled()
    expect(schedulerStop).not.toHaveBeenCalled()
  })

  it("does not let a late stopped activation replace newer polling after restart", async () => {
    let resolveFirstRender: (() => void) | undefined
    let isFirstRender = true
    const schedulerStop = vi.fn()
    const schedulerStart = vi.fn()
    const onRenderDeck = vi.fn(() => {
      if (!isFirstRender) {
        return undefined
      }

      isFirstRender = false
      return new Promise<void>((resolve) => {
        resolveFirstRender = resolve
      })
    })
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
        buttons: [{ type: "display", position: 0, label: "Clock", display_command: "printf now" }],
      },
      onRenderDeck,
      subscribeKeyEvents: () => () => {},
    })

    runtime.start()

    await vi.waitFor(() => {
      expect(onRenderDeck).toHaveBeenCalledTimes(1)
    })

    runtime.stop()
    runtime.start()

    await vi.waitFor(() => {
      expect(schedulerStart).toHaveBeenCalledTimes(1)
    })

    resolveFirstRender?.()
    await Promise.resolve()

    expect(schedulerStart).toHaveBeenCalledTimes(1)
    expect(schedulerStop).not.toHaveBeenCalled()
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

  it("preserves internal toggle state across deck reactivation", async () => {
    vi.useFakeTimers()
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
        buttons: [
          { type: "change-deck", position: 0, target_deck: "apps", label: "Apps" },
        ],
      },
      decks: {
        main: {
          id: "main",
          buttons: [{ type: "change-deck", position: 0, target_deck: "apps", label: "Apps" }],
        },
        apps: {
          id: "apps",
          buttons: [{
            type: "toggle",
            position: 1,
            states: [
              { key: "off", label: "Apps Off", command: "printf off" },
              { key: "on", label: "Apps On", command: "printf on" },
            ],
          }],
        },
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

    await vi.waitFor(() => {
      expect(runtime.getRenderButtons()).toContainEqual({ keyIndex: 1, label: "Apps Off", subtitle: "OFF", variant: "toggle" })
    })

    listener?.({ keyIndex: 1, type: "down" })
    listener?.({ keyIndex: 1, type: "up" })

    await vi.waitFor(() => {
      expect(executeAction).toHaveBeenCalledWith("printf on")
    })

    await vi.advanceTimersByTimeAsync(1_500)

    expect(runtime.getRenderButtons()).toContainEqual({ keyIndex: 1, label: "Apps On", subtitle: "ON", variant: "toggle" })

    listener?.({ keyIndex: 14, type: "down" })
    listener?.({ keyIndex: 14, type: "up" })

    await vi.waitFor(() => {
      expect(runtime.getRenderButtons()).toContainEqual({ keyIndex: 0, label: "Apps", variant: "default" })
    })

    listener?.({ keyIndex: 0, type: "down" })
    listener?.({ keyIndex: 0, type: "up" })

    await vi.waitFor(() => {
      expect(runtime.getRenderButtons()).toContainEqual({ keyIndex: 1, label: "Apps On", subtitle: "ON", variant: "toggle" })
    })
    vi.useRealTimers()
  })

  it("preserves internal toggle state across reconnect", async () => {
    vi.useFakeTimers()
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
        buttons: [{
          type: "toggle",
          position: 1,
          states: [
            { key: "off", label: "Off", command: "printf off" },
            { key: "on", label: "On", command: "printf on" },
          ],
        }],
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
      expect(executeAction).toHaveBeenCalledWith("printf on")
    })

    await vi.advanceTimersByTimeAsync(1_500)

    expect(runtime.getRenderButtons()).toContainEqual({ keyIndex: 1, label: "On", subtitle: "ON", variant: "toggle" })

    runtime.stop()
    runtime.start()

    await vi.waitFor(() => {
      expect(runtime.getRenderButtons()).toContainEqual({ keyIndex: 1, label: "On", subtitle: "ON", variant: "toggle" })
    })
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

    await vi.waitFor(() => {
      expect(schedulerStart).toHaveBeenCalledTimes(1)
    })

    listener?.({ keyIndex: 0, type: "down" })
    listener?.({ keyIndex: 0, type: "up" })

    await vi.waitFor(() => {
      expect(schedulerStop).toHaveBeenCalledTimes(1)
      expect(schedulerStart).toHaveBeenCalledTimes(2)
    })
  })

  it("renders cpu buttons from live metrics through active-deck polling", async () => {
    const onRenderButton = vi.fn()
    const runtime = createDeckRuntime({
      deck: {
        id: "main",
        buttons: [{ type: "cpu", position: 4, label: "CPU", display_mode: "progress", interval_ms: 1000 }],
      },
      getCpuMetric: async () => ({ label: "48%", percentage: 48 }),
      onRenderButton,
      subscribeKeyEvents: () => () => {},
    })

    runtime.start()

    await vi.waitFor(() => {
      expect(onRenderButton).toHaveBeenCalledWith({
        keyIndex: 4,
        label: "CPU",
        displayValue: "48%",
        progress: 48,
        variant: "metric",
      })
    })
  })

  it("renders text-mode memory buttons without progress metadata", async () => {
    const onRenderButton = vi.fn()
    const runtime = createDeckRuntime({
      deck: {
        id: "main",
        buttons: [{ type: "memory", position: 5, label: "RAM", display_mode: "text", interval_ms: 1500 }],
      },
      getMemoryMetric: async () => ({ label: "62%", percentage: 62 }),
      onRenderButton,
      subscribeKeyEvents: () => () => {},
    })

    runtime.start()

    await vi.waitFor(() => {
      expect(onRenderButton).toHaveBeenCalledWith({
        keyIndex: 5,
        label: "RAM",
        displayValue: "62%",
        variant: "metric",
      })
    })
  })

  it("renders fan buttons with an unavailable fallback when sensors are missing", async () => {
    const onRenderButton = vi.fn()
    const runtime = createDeckRuntime({
      deck: {
        id: "main",
        buttons: [{ type: "fan", position: 6, label: "Fan", unavailable_label: "Unavailable", interval_ms: 2000 }],
      },
      getFanMetric: async () => ({ available: false }),
      onRenderButton,
      subscribeKeyEvents: () => () => {},
    })

    runtime.start()

    await vi.waitFor(() => {
      expect(onRenderButton).toHaveBeenCalledWith({
        keyIndex: 6,
        detailLines: ["Unavailable"],
        label: "Fan",
        variant: "fan",
      })
    })
  })

  it("keeps media buttons authoritative from polled status and metadata", async () => {
    vi.useFakeTimers()
    let listener: ((event: StreamDeckKeyEvent) => void) | undefined
    const executeAction = vi.fn(async () => ({
      code: 0,
      failed: false,
      stderr: "",
      stdout: "ok",
      timedOut: false,
    }))
    const executeDisplayCommand = vi.fn(async (command: string) => ({
      code: 0,
      failed: false,
      stderr: "",
      stdout: command === "playerctl status" ? "playing" : "Track Title\nArtist Name\n01:24 / 03:58",
      timedOut: false,
    }))
    const onRenderButton = vi.fn()
    let scheduledTask: { run: () => Promise<void> | void } | undefined
    const runtime = createDeckRuntime({
      createScheduler: () => ({
        intervalMs: 1000,
        jitterMs: 75,
        scheduleDelay: () => 1000,
        start: vi.fn((tasks) => {
          scheduledTask = tasks[0]
        }),
        stop: vi.fn(),
      }),
      deck: {
        id: "main",
        buttons: [{
          type: "media",
          position: 4,
          label: "Music",
          command: "playerctl play-pause",
          status_command: "playerctl status",
          display_command: "playerctl metadata",
          interval_ms: 1000,
        }],
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
      expect(onRenderButton).toHaveBeenCalledWith({
        keyIndex: 4,
        detailLines: ["Track Title", "Artist Name", "01:24 / 03:58"],
        label: "Music",
        subtitle: "PLAYING",
        variant: "media",
      })
    })

    onRenderButton.mockClear()
    listener?.({ keyIndex: 4, type: "down" })
    listener?.({ keyIndex: 4, type: "up" })

    await vi.waitFor(() => {
      expect(executeAction).toHaveBeenCalledWith("playerctl play-pause")
      expect(onRenderButton).toHaveBeenCalledWith({ keyIndex: 4, label: "..." })
      expect(onRenderButton).toHaveBeenCalledWith({ keyIndex: 4, label: "OK" })
    })

    await vi.advanceTimersByTimeAsync(1_500)

    expect(runtime.getRenderButtons()).toContainEqual({
      keyIndex: 4,
      detailLines: ["Track Title", "Artist Name", "01:24 / 03:58"],
      label: "Music",
      subtitle: "PLAYING",
      variant: "media",
    })

    onRenderButton.mockClear()
    await scheduledTask?.run()

    await vi.advanceTimersByTimeAsync(1_500)
    expect(executeDisplayCommand).toHaveBeenCalledWith("playerctl status")
    expect(executeDisplayCommand).toHaveBeenCalledWith("playerctl metadata")
    vi.useRealTimers()
  })

  it("renders the deck immediately, then updates media buttons when priming completes", async () => {
    const onRenderDeck = vi.fn()
    const onRenderButton = vi.fn()
    const executeDisplayCommand = vi.fn(async (command: string) => ({
      code: 0,
      failed: false,
      stderr: "",
      stdout: command === "playerctl status" ? "playing" : "Track Title\nArtist Name\n01:24 / 03:58",
      timedOut: false,
    }))
    const runtime = createDeckRuntime({
      createScheduler: () => ({
        intervalMs: 1000,
        jitterMs: 75,
        scheduleDelay: () => 1000,
        start: vi.fn(),
        stop: vi.fn(),
      }),
      deck: {
        id: "main",
        buttons: [{
          type: "media",
          position: 4,
          label: "Music",
          command: "playerctl play-pause",
          status_command: "playerctl status",
          display_command: "playerctl metadata",
          interval_ms: 1000,
        }],
      },
      executeDisplayCommand,
      onRenderButton,
      onRenderDeck,
      subscribeKeyEvents: () => () => {},
    })

    runtime.start()

    await vi.waitFor(() => {
      expect(onRenderDeck).toHaveBeenCalledWith([
        {
          keyIndex: 4,
          label: "Music",
          variant: "media",
        },
      ])
    })

    await vi.waitFor(() => {
      expect(onRenderButton).toHaveBeenCalledWith({
        keyIndex: 4,
        detailLines: ["Track Title", "Artist Name", "01:24 / 03:58"],
        label: "Music",
        subtitle: "PLAYING",
        variant: "media",
      })
    })
  })

  it("renders activation immediately before slow priming completes", async () => {
    let resolveStatus: ((value: { code: number; failed: boolean; stderr: string; stdout: string; timedOut: boolean }) => void) | undefined
    const onRenderDeck = vi.fn()
    const onRenderButton = vi.fn()
    const executeDisplayCommand = vi.fn((command: string) => new Promise((resolve) => {
      if (command === "printf on") {
        resolveStatus = resolve
        return
      }

      resolve({
        code: 0,
        failed: false,
        stderr: "",
        stdout: "ignored",
        timedOut: false,
      })
    }))
    const runtime = createDeckRuntime({
      createScheduler: () => ({
        intervalMs: 500,
        jitterMs: 75,
        scheduleDelay: () => 500,
        start: vi.fn(),
        stop: vi.fn(),
      }),
      deck: {
        id: "main",
        buttons: [{
          type: "toggle",
          position: 1,
          status_command: "printf on",
          interval_ms: 500,
          states: [
            { key: "off", label: "Off", command: "printf off" },
            { key: "on", label: "On", command: "printf on" },
          ],
        }],
      },
      executeDisplayCommand,
      onRenderButton,
      onRenderDeck,
      subscribeKeyEvents: () => () => {},
    })

    runtime.start()

    await vi.waitFor(() => {
      expect(onRenderDeck).toHaveBeenCalledWith([{ keyIndex: 1, label: "Off", subtitle: "OFF", variant: "toggle" }])
    })

    await vi.waitFor(() => {
      expect(executeDisplayCommand).toHaveBeenCalledWith("printf on")
    })

    resolveStatus?.({
      code: 0,
      failed: false,
      stderr: "",
      stdout: "on",
      timedOut: false,
    })

    await vi.waitFor(() => {
      expect(onRenderButton).toHaveBeenCalledWith({ keyIndex: 1, label: "On", subtitle: "ON", variant: "toggle" })
      expect(runtime.getRenderButtons()).toContainEqual({ keyIndex: 1, label: "On", subtitle: "ON", variant: "toggle" })
    })
  })

  it("primes polled buttons independently during activation", async () => {
    let resolveSlowStatus: ((value: { code: number; failed: boolean; stderr: string; stdout: string; timedOut: boolean }) => void) | undefined
    const onRenderButton = vi.fn()
    const executeDisplayCommand = vi.fn((command: string) => {
      if (command === "printf slow") {
        return new Promise((resolve) => {
          resolveSlowStatus = resolve
        })
      }

      return Promise.resolve({
        code: 0,
        failed: false,
        stderr: "",
        stdout: "on",
        timedOut: false,
      })
    })
    const runtime = createDeckRuntime({
      createScheduler: () => ({
        intervalMs: 500,
        jitterMs: 75,
        scheduleDelay: () => 500,
        start: vi.fn(),
        stop: vi.fn(),
      }),
      deck: {
        id: "main",
        buttons: [
          {
            type: "toggle",
            position: 1,
            status_command: "printf slow",
            interval_ms: 500,
            states: [
              { key: "off", label: "Slow Off", command: "printf off" },
              { key: "on", label: "Slow On", command: "printf on" },
            ],
          },
          {
            type: "toggle",
            position: 2,
            status_command: "printf fast",
            interval_ms: 500,
            states: [
              { key: "off", label: "Fast Off", command: "printf off" },
              { key: "on", label: "Fast On", command: "printf on" },
            ],
          },
        ],
      },
      executeDisplayCommand,
      onRenderButton,
      subscribeKeyEvents: () => () => {},
    })

    runtime.start()

    await vi.waitFor(() => {
      expect(executeDisplayCommand).toHaveBeenCalledWith("printf slow")
      expect(executeDisplayCommand).toHaveBeenCalledWith("printf fast")
    })

    await vi.waitFor(() => {
      expect(onRenderButton).toHaveBeenCalledWith({ keyIndex: 2, label: "Fast On", subtitle: "ON", variant: "toggle" })
    })

    expect(runtime.getRenderButtons()).toContainEqual({ keyIndex: 2, label: "Fast On", subtitle: "ON", variant: "toggle" })
    expect(runtime.getRenderButtons()).toContainEqual({ keyIndex: 1, label: "Slow Off", subtitle: "OFF", variant: "toggle" })

    resolveSlowStatus?.({
      code: 0,
      failed: false,
      stderr: "",
      stdout: "on",
      timedOut: false,
    })

    await vi.waitFor(() => {
      expect(onRenderButton).toHaveBeenCalledWith({ keyIndex: 1, label: "Slow On", subtitle: "ON", variant: "toggle" })
    })
  })

  it("starts per-button polling before slow priming settles", async () => {
    let resolveSlowStatus: ((value: { code: number; failed: boolean; stderr: string; stdout: string; timedOut: boolean }) => void) | undefined
    const schedulerStart = vi.fn()
    const executeDisplayCommand = vi.fn((command: string) => {
      if (command === "printf slow") {
        return new Promise((resolve) => {
          resolveSlowStatus = resolve
        })
      }

      return Promise.resolve({
        code: 0,
        failed: false,
        stderr: "",
        stdout: "on",
        timedOut: false,
      })
    })
    const runtime = createDeckRuntime({
      createScheduler: () => ({
        intervalMs: 500,
        jitterMs: 75,
        scheduleDelay: () => 500,
        start: schedulerStart,
        stop: vi.fn(),
      }),
      deck: {
        id: "main",
        buttons: [
          {
            type: "toggle",
            position: 1,
            status_command: "printf slow",
            interval_ms: 500,
            states: [
              { key: "off", label: "Slow Off", command: "printf off" },
              { key: "on", label: "Slow On", command: "printf on" },
            ],
          },
          {
            type: "toggle",
            position: 2,
            status_command: "printf fast",
            interval_ms: 500,
            states: [
              { key: "off", label: "Fast Off", command: "printf off" },
              { key: "on", label: "Fast On", command: "printf on" },
            ],
          },
        ],
      },
      executeDisplayCommand,
      subscribeKeyEvents: () => () => {},
    })

    runtime.start()

    await vi.waitFor(() => {
      expect(executeDisplayCommand).toHaveBeenCalledWith("printf slow")
      expect(executeDisplayCommand).toHaveBeenCalledWith("printf fast")
      expect(schedulerStart).toHaveBeenCalledTimes(2)
    })

    resolveSlowStatus?.({
      code: 0,
      failed: false,
      stderr: "",
      stdout: "on",
      timedOut: false,
    })
  })

  it("starts polling even when a priming refresh rejects", async () => {
    let runScheduledTask: (() => Promise<void> | void) | undefined
    const schedulerStart = vi.fn((tasks: Array<{ run: () => Promise<void> | void }>) => {
      runScheduledTask = tasks[0]?.run
    })
    const onRenderButton = vi.fn()
    const executeDisplayCommand = vi.fn()
      .mockRejectedValueOnce(new Error("priming failed"))
      .mockResolvedValue({
        code: 0,
        failed: false,
        stderr: "",
        stdout: "on",
        timedOut: false,
      })
    const runtime = createDeckRuntime({
      createScheduler: () => ({
        intervalMs: 500,
        jitterMs: 75,
        scheduleDelay: () => 500,
        start: schedulerStart,
        stop: vi.fn(),
      }),
      deck: {
        id: "main",
        buttons: [{
          type: "toggle",
          position: 1,
          status_command: "printf on",
          interval_ms: 500,
          states: [
            { key: "off", label: "Off", command: "printf off" },
            { key: "on", label: "On", command: "printf on" },
          ],
        }],
      },
      executeDisplayCommand,
      onRenderButton,
      subscribeKeyEvents: () => () => {},
    })

    runtime.start()

    await vi.waitFor(() => {
      expect(schedulerStart).toHaveBeenCalledTimes(1)
    })

    await runScheduledTask?.()

    await vi.waitFor(() => {
      expect(onRenderButton).toHaveBeenCalledWith({ keyIndex: 1, label: "On", subtitle: "ON", variant: "toggle" })
    })
  })

  it("does not double-poll media commands during initial activation", async () => {
    const executeDisplayCommand = vi.fn(async (command: string) => ({
      code: 0,
      failed: false,
      stderr: "",
      stdout: command === "playerctl status" ? "playing" : "Track Title\nArtist Name\n01:24 / 03:58",
      timedOut: false,
    }))
    const schedulerStart = vi.fn()
    const runtime = createDeckRuntime({
      createScheduler: () => ({
        intervalMs: 1000,
        jitterMs: 75,
        scheduleDelay: () => 1000,
        start: schedulerStart,
        stop: vi.fn(),
      }),
      deck: {
        id: "main",
        buttons: [{
          type: "media",
          position: 4,
          label: "Music",
          command: "playerctl play-pause",
          status_command: "playerctl status",
          display_command: "playerctl metadata",
          interval_ms: 1000,
        }],
      },
      executeDisplayCommand,
      subscribeKeyEvents: () => () => {},
    })

    runtime.start()

    await vi.waitFor(() => {
      expect(executeDisplayCommand).toHaveBeenCalledTimes(2)
    })

    expect(executeDisplayCommand).toHaveBeenNthCalledWith(1, "playerctl status")
    expect(executeDisplayCommand).toHaveBeenNthCalledWith(2, "playerctl metadata")
    expect(schedulerStart).toHaveBeenCalledTimes(1)
  })

  it("clears stale media metadata when a later metadata refresh fails", async () => {
    const onRenderButton = vi.fn()
    const executeDisplayCommand = vi.fn()
      .mockResolvedValueOnce({
        code: 0,
        failed: false,
        stderr: "",
        stdout: "playing",
        timedOut: false,
      })
      .mockResolvedValueOnce({
        code: 0,
        failed: false,
        stderr: "",
        stdout: "Track Title\nArtist Name\n01:24 / 03:58",
        timedOut: false,
      })
      .mockResolvedValueOnce({
        code: 0,
        failed: false,
        stderr: "",
        stdout: "paused",
        timedOut: false,
      })
      .mockResolvedValueOnce({
        code: 1,
        failed: true,
        stderr: "player missing",
        stdout: "",
        timedOut: false,
      })
    let scheduledTask: { run: () => Promise<void> | void } | undefined
    const runtime = createDeckRuntime({
      createScheduler: () => ({
        intervalMs: 1000,
        jitterMs: 75,
        scheduleDelay: () => 1000,
        start: vi.fn((tasks) => {
          scheduledTask = tasks[0]
        }),
        stop: vi.fn(),
      }),
      deck: {
        id: "main",
        buttons: [{
          type: "media",
          position: 4,
          label: "Music",
          command: "playerctl play-pause",
          status_command: "playerctl status",
          display_command: "playerctl metadata",
          interval_ms: 1000,
        }],
      },
      executeDisplayCommand,
      onRenderButton,
      subscribeKeyEvents: () => () => {},
    })

    runtime.start()

    await vi.waitFor(() => {
      expect(runtime.getRenderButtons()).toContainEqual({
        keyIndex: 4,
        detailLines: ["Track Title", "Artist Name", "01:24 / 03:58"],
        label: "Music",
        subtitle: "PLAYING",
        variant: "media",
      })
    })

    onRenderButton.mockClear()
    await scheduledTask?.run()

    await vi.waitFor(() => {
      expect(onRenderButton).toHaveBeenCalledWith({
        keyIndex: 4,
        label: "Music",
        subtitle: "PAUSED",
        variant: "media",
      })
    })

    expect(runtime.getRenderButtons()).toContainEqual({
      keyIndex: 4,
      label: "Music",
      subtitle: "PAUSED",
      variant: "media",
    })
    expect(runtime.getRenderButtons()).not.toContainEqual({
      keyIndex: 4,
      detailLines: ["Track Title", "Artist Name", "01:24 / 03:58"],
      label: "Music",
      subtitle: "PAUSED",
      variant: "media",
    })
  })

  it("renders the next deck immediately, then updates it when navigation priming completes", async () => {
    let listener: ((event: StreamDeckKeyEvent) => void) | undefined
    const onRenderDeck = vi.fn()
    const onRenderButton = vi.fn()
    const executeDisplayCommand = vi.fn(async () => ({
      code: 0,
      failed: false,
      stderr: "",
      stdout: "on",
      timedOut: false,
    }))
    const runtime = createDeckRuntime({
      createScheduler: () => ({
        intervalMs: 500,
        jitterMs: 75,
        scheduleDelay: () => 500,
        start: vi.fn(),
        stop: vi.fn(),
      }),
      deck: {
        id: "main",
        buttons: [{ type: "change-deck", position: 0, target_deck: "apps", label: "Apps" }],
      },
      decks: {
        main: {
          id: "main",
          buttons: [{ type: "change-deck", position: 0, target_deck: "apps", label: "Apps" }],
        },
        apps: {
          id: "apps",
          buttons: [{
            type: "toggle",
            position: 1,
            status_command: "printf on",
            interval_ms: 500,
            states: [
              { key: "off", label: "Off", command: "printf off" },
              { key: "on", label: "On", command: "printf on" },
            ],
          }],
        },
      },
      executeDisplayCommand,
      onRenderButton,
      onRenderDeck,
      subscribeKeyEvents: (nextListener) => {
        listener = nextListener
        return () => {
          listener = undefined
        }
      },
    })

    runtime.start()

    await vi.waitFor(() => {
      expect(onRenderDeck).toHaveBeenCalledWith([{ keyIndex: 0, label: "Apps", variant: "default" }])
    })

    onRenderDeck.mockClear()
    listener?.({ keyIndex: 0, type: "down" })
    listener?.({ keyIndex: 0, type: "up" })

    await vi.waitFor(() => {
      expect(onRenderDeck).toHaveBeenCalledWith([
        { keyIndex: 1, label: "Off", subtitle: "OFF", variant: "toggle" },
        { keyIndex: 14, label: "Back" },
      ])
    })

    await vi.waitFor(() => {
      expect(onRenderButton).toHaveBeenCalledWith({ keyIndex: 1, label: "On", subtitle: "ON", variant: "toggle" })
    })
  })

  it("does not repaint the active deck with stale priming from the previous deck", async () => {
    let listener: ((event: StreamDeckKeyEvent) => void) | undefined
    let resolveMainStatus: (() => void) | undefined
    const onRenderButton = vi.fn()
    const executeDisplayCommand = vi.fn((command: string) => {
      if (command === "printf main") {
        return new Promise((resolve) => {
          resolveMainStatus = () => {
            resolve({
              code: 0,
              failed: false,
              stderr: "",
              stdout: "on",
              timedOut: false,
            })
          }
        })
      }

      return Promise.resolve({
        code: 0,
        failed: false,
        stderr: "",
        stdout: "off",
        timedOut: false,
      })
    })
    const runtime = createDeckRuntime({
      createScheduler: () => ({
        intervalMs: 500,
        jitterMs: 75,
        scheduleDelay: () => 500,
        start: vi.fn(),
        stop: vi.fn(),
      }),
      deck: {
        id: "main",
        buttons: [
          { type: "change-deck", position: 0, target_deck: "apps", label: "Apps" },
          {
            type: "toggle",
            position: 1,
            status_command: "printf main",
            interval_ms: 500,
            states: [
              { key: "off", label: "Main Off", command: "printf off" },
              { key: "on", label: "Main On", command: "printf on" },
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
              status_command: "printf main",
              interval_ms: 500,
              states: [
                { key: "off", label: "Main Off", command: "printf off" },
                { key: "on", label: "Main On", command: "printf on" },
              ],
            },
          ],
        },
        apps: {
          id: "apps",
          buttons: [{
            type: "toggle",
            position: 2,
            status_command: "printf apps",
            interval_ms: 500,
            states: [
              { key: "off", label: "Apps Off", command: "printf apps off" },
              { key: "on", label: "Apps On", command: "printf apps on" },
            ],
          }],
        },
      },
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
      expect(runtime.getRenderButtons()).toContainEqual({ keyIndex: 0, label: "Apps", variant: "default" })
    })

    listener?.({ keyIndex: 0, type: "down" })
    listener?.({ keyIndex: 0, type: "up" })

    await vi.waitFor(() => {
      expect(runtime.getRenderButtons()).toContainEqual({ keyIndex: 2, label: "Apps Off", subtitle: "OFF", variant: "toggle" })
      expect(runtime.getRenderButtons()).toContainEqual({ keyIndex: 14, label: "Back" })
    })

    onRenderButton.mockClear()
    resolveMainStatus?.()
    await Promise.resolve()

    expect(onRenderButton).not.toHaveBeenCalledWith({ keyIndex: 1, label: "Main On", subtitle: "ON", variant: "toggle" })
    expect(runtime.getRenderButtons()).not.toContainEqual({ keyIndex: 1, label: "Main On", subtitle: "ON", variant: "toggle" })
  })
})
