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
})
