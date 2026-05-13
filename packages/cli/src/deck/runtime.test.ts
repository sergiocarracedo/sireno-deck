import { createElement } from "react"
import { describe, expect, it, vi } from "vitest"

import { createDeckRuntime } from "./runtime.js"

import type { StreamDeckKeyEvent } from "../device/stream-deck.js"

const createDisplayDefinition = () => ({
  configSchema: {
    parse: (value: unknown) => value,
    safeParse: (value: unknown) => ({ data: value, success: true as const }),
  },
  createInstance: ({ button, config }: { button: { position: number }; config: { icon?: string; label: string } }) => ({
    render: () => createElement("deck-button", {
      ...(config.icon !== undefined ? { icon: config.icon } : {}),
      keyIndex: button.position,
      label: config.label,
    }),
  }),
  type: "builtin-display-text",
})

describe("createDeckRuntime", () => {
  it("renders a bundled addon-backed button through the generic runtime host", async () => {
    const onRenderDeck = vi.fn()
    const runtime = createDeckRuntime({
      deck: {
        id: "main",
        buttons: [{
          config: { label: "Clock" },
          definition: createDisplayDefinition(),
          label: "Clock",
          position: 0,
          type: "builtin-display-text",
        }],
      },
      onRenderDeck,
      subscribeKeyEvents: () => () => {},
      theme: {
        accent: "#f59e0b",
        background: "#10161f",
        danger: "#fb7185",
        foreground: "#eef2f7",
        name: "dark",
        primary: "#7dd3fc",
        success: "#34d399",
      },
    })

    runtime.start()

    await vi.waitFor(() => {
      expect(onRenderDeck).toHaveBeenCalledWith([{ keyIndex: 0, label: "Clock" }])
      expect(runtime.getRenderButtons()).toEqual([{ keyIndex: 0, label: "Clock" }])
    })
  })

  it("re-renders when an addon instance invalidates itself", async () => {
    const onRenderButton = vi.fn()
    let currentLabel = "Clock"
    const runtime = createDeckRuntime({
      deck: {
        id: "main",
        buttons: [{
          config: { label: "Clock" },
          definition: {
            configSchema: {
              parse: (value: unknown) => value,
              safeParse: (value: unknown) => ({ data: value, success: true as const }),
            },
            createInstance: ({ button, methods }: { button: { position: number }; methods: { invalidate: () => void } }) => ({
              onTap: async () => {
                currentLabel = "Updated"
                methods.invalidate()
              },
              render: () => createElement("deck-button", { keyIndex: button.position, label: currentLabel }),
            }),
            type: "builtin-display-text",
          },
          label: "Clock",
          position: 1,
          type: "builtin-display-text",
        }],
      },
      onRenderButton,
      subscribeKeyEvents: (listener: (event: StreamDeckKeyEvent) => void) => {
        queueMicrotask(() => {
          listener({ keyIndex: 1, type: "down" })
          listener({ keyIndex: 1, type: "up" })
        })
        return () => {}
      },
      theme: {
        accent: "#f59e0b",
        background: "#10161f",
        danger: "#fb7185",
        foreground: "#eef2f7",
        name: "dark",
        primary: "#7dd3fc",
        success: "#34d399",
      },
    })

    runtime.start()

    await vi.waitFor(() => {
      expect(onRenderButton).toHaveBeenCalledWith({ keyIndex: 1, label: "Updated" })
    })
  })
})
