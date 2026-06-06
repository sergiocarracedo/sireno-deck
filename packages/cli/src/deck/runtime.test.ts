import { readFileSync } from 'node:fs'
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { createElement, useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ButtonSurface, defineMountedButton, setAddonButtonOwnerName } from "../addon/api.js"
import { loadConfiguredAddons } from "../addon/loader.js"

import { createBundledAddonRegistry, loadConfig } from "../config/loader.js"
import { createAddonRegistry } from "../addon/registry.js"
import { validateConfig } from "../core/schemas.js"
import { renderReactNodeToHtml } from "../render/dom-host.js"
import { Text } from "../ui/index.js"
import { createDeckRuntime } from "./runtime.js"

import type { StreamDeckKeyEvent } from "../device/stream-deck.js"
import type { AddonRegistry } from "../addon/registry.js"
import type { PollingScheduler } from "../render/scheduler.js"
import type { SessionMonitor, SessionSnapshot } from "../system/session-monitor.js"

const FIXTURES_DIRECTORY = fileURLToPath(new URL("../../fixtures", import.meta.url))

function createTextSurface(keyIndex: number, label: string) {
  return createElement(Text, { fit: "wrap" }, label)
}

function getRenderedButton(runtime: ReturnType<typeof createDeckRuntime>, keyIndex: number) {
  const renderedButton = runtime.getRenderButtons().find((button) => button.keyIndex === keyIndex)
  expect(renderedButton).toBeDefined()
  return renderedButton!
}

function getRenderedButtonHtml(renderedButton: { content?: unknown }) {
  if (typeof (renderedButton as { html?: unknown }).html === "string") {
    return (renderedButton as { html: string }).html
  }

  expect(renderedButton.content).toBeTruthy()
  return renderReactNodeToHtml(renderedButton.content as never)
}

function getMountedCounterParts(html: string, label: string) {
  const match = html.match(new RegExp(`${label}:(\\d+):(\\d+)`))
  expect(match).toBeTruthy()

  return {
    count: Number(match?.[2]),
    mountId: Number(match?.[1]),
  }
}

function getFixtureMountedLocalParts(html: string, label: string) {
  const match = html.match(new RegExp(`${label}:mount=(\\d+):count=(\\d+)`))
  expect(match).toBeTruthy()

  return {
    count: Number(match?.[2]),
    mountId: Number(match?.[1]),
  }
}

const createDisplayDefinition = () => ({
  configSchema: {
    parse: (value: unknown) => value,
    safeParse: (value: unknown) => ({ data: value, success: true as const }),
  },
  render: ({ button, config }: { button: { position: number }; config: { icon?: string; label: string } }) => createTextSurface(button.position, config.label),
  type: "display-text",
})

function createNavigationDefinition(label: string, targetDeckId: string, type: string) {
  return defineMountedButton({
    configSchema: { parse: (value: unknown) => value, safeParse: (value: unknown) => ({ data: value, success: true as const }) },
    onTap: async ({ methods }) => {
      await methods.navigateToDeck(targetDeckId)
    },
    render: ({ button }) => createTextSurface(button.position, label),
    type,
  })
}

function createTestTheme() {
  return {
    accent: "#f59e0b",
    background: "#10161f",
    danger: "#fb7185",
    foreground: "#eef2f7",
    name: "dark",
    primary: "#7dd3fc",
    success: "#34d399",
  } as const
}

function createEmptyAddonRegistry(): AddonRegistry {
  return createAddonRegistry()
}

function createSessionMonitorDouble(initialSnapshot: SessionSnapshot): SessionMonitor & { emit: (snapshot: SessionSnapshot) => void } {
  let currentSnapshot = initialSnapshot
  const listeners = new Set<(snapshot: SessionSnapshot) => void>()

  return {
    emit(snapshot) {
      currentSnapshot = snapshot

      for (const listener of listeners) {
        listener(snapshot)
      }
    },
    getSnapshot() {
      return currentSnapshot
    },
    stop() {},
    subscribe(listener) {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
  }
}

describe("createDeckRuntime", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

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
          type: "display-text",
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
      const renderedButton = onRenderDeck.mock.calls.at(-1)?.[0]?.[0]
      expect(renderedButton).toMatchObject({ background: "#10161f", keyIndex: 0, label: "Clock" })
      expect(getRenderedButtonHtml(renderedButton)).toContain("Clock")

      const runtimeButton = getRenderedButton(runtime, 0)
      expect(runtimeButton).toMatchObject({ background: "#10161f", keyIndex: 0, label: "Clock" })
      expect(getRenderedButtonHtml(runtimeButton)).toContain("Clock")
    })
  })

  it("preserves ordinary React DOM renders as browser-hosted content", async () => {
    const onRenderDeck = vi.fn()
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
            render: () => createElement("div", null, "Clock"),
            type: "dom-button",
          },
          label: "Clock",
          position: 0,
          type: "dom-button",
        }],
      },
      onRenderDeck,
      subscribeKeyEvents: () => () => {},
      theme: createTestTheme(),
    })

    runtime.start()

    await vi.waitFor(() => {
      expect(onRenderDeck).toHaveBeenCalled()
    })

    const renderedDeck = onRenderDeck.mock.calls.at(-1)?.[0]
    expect(renderedDeck).toHaveLength(1)
    expect(renderedDeck?.[0]).toMatchObject({ background: "#10161f", keyIndex: 0 })
    expect(renderedDeck?.[0]?.content).toBeTruthy()
    expect(getRenderedButton(runtime, 0)).toMatchObject({ background: "#10161f", keyIndex: 0, label: "Clock" })
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
            onTap: async ({ methods }) => {
              currentLabel = "Updated"
              methods.invalidate()
            },
            render: ({ button }: { button: { position: number } }) => createTextSurface(button.position, currentLabel),
            type: "display-text",
          },
          label: "Clock",
          position: 1,
          type: "display-text",
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
      const renderedButton = onRenderButton.mock.calls.at(-1)?.[0]
      expect(renderedButton).toMatchObject({ background: "#10161f", keyIndex: 1, label: "Clock" })
      expect(getRenderedButtonHtml(renderedButton)).toContain("Updated")
    })
  })

  it("shows a compact button runtime helper and structured diagnostics when a tap handler fails", async () => {
    let emitEvent: ((event: StreamDeckKeyEvent) => void) | undefined
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const runtime = createDeckRuntime({
      deck: {
        id: "main",
        buttons: [{
          config: { label: "Broken Tap" },
          definition: {
            configSchema: {
              parse: (value: unknown) => value,
              safeParse: (value: unknown) => ({ data: value, success: true as const }),
            },
            onTap: async () => {
              throw new Error("tap exploded")
            },
            render: ({ button }: { button: { position: number } }) => createTextSurface(button.position, "Broken Tap"),
            type: "broken-tap",
          },
          label: "Broken Tap",
          position: 0,
          type: "broken-tap",
        }],
      },
      subscribeKeyEvents: (listener) => {
        emitEvent = listener
        return () => {}
      },
      theme: createTestTheme(),
    })

    runtime.start()

    emitEvent?.({ keyIndex: 0, type: "down" })
    emitEvent?.({ keyIndex: 0, type: "up" })

    await vi.waitFor(() => {
      const renderedButton = getRenderedButton(runtime, 0)
      const html = getRenderedButtonHtml(renderedButton)
      expect(html).toContain('data-sireno-icon-source="generic"')
      expect(html).toContain('data-sireno-ui-icon="true"')
      expect(html).toContain('lucide lucide-circle-alert')
      expect(html).not.toContain("▲")
      expect(html).toContain("4105")
      expect(html).not.toContain("Config Error")
      expect(runtime.getActiveDeck().id).toBe("main")
      expect(consoleError).toHaveBeenCalledWith(
        "button runtime error",
        expect.objectContaining({
          buttonPosition: 0,
          buttonType: "broken-tap",
          deckId: "main",
          errorCode: "4105",
          operation: "tap",
          scope: "button-runtime",
          error: expect.any(Error),
        }),
      )
    })
  })

  it("passes the configured canonical host context through to addon instances", async () => {
    const hostContext = {
      os: {
        type: "linux",
        variant: "ubuntu",
        version: "24.04",
      },
      session: {
        capability: "unknown" as const,
        state: "unknown" as const,
      },
    }
    const observedHostContext = vi.fn()
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
            render: ({ button, hostContext: receivedHostContext }: { button: { position: number }; hostContext: typeof hostContext }) => {
              observedHostContext(receivedHostContext)
              return createTextSurface(button.position, "Clock")
            },
            type: "display-text",
          },
          label: "Clock",
          position: 0,
          type: "display-text",
        }],
      },
      hostContext,
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
      expect(observedHostContext).toHaveBeenCalledWith(hostContext)
      expect(observedHostContext.mock.calls[0]?.[0]).toStrictEqual(hostContext)
    })
  })

  it("resolves button background precedence before runtime render output", async () => {
    const onRenderDeck = vi.fn()
    const runtime = createDeckRuntime({
      deck: {
        background: "#112233",
        id: "main",
        buttons: [
          {
            config: { label: "Deck" },
            definition: createDisplayDefinition(),
            label: "Deck",
            position: 0,
            type: "display-text",
          },
          {
            background: "#445566",
            config: { label: "Button" },
            definition: createDisplayDefinition(),
            label: "Button",
            position: 1,
            type: "display-text",
          },
        ],
      },
      onRenderDeck,
      subscribeKeyEvents: () => () => {},
      theme: createTestTheme(),
    })

    runtime.start()

    await vi.waitFor(() => {
      const renderedButtons = onRenderDeck.mock.calls.at(-1)?.[0]
      expect(renderedButtons).toHaveLength(2)
      expect(renderedButtons?.[0]).toMatchObject({ background: "#112233", keyIndex: 0, label: "Deck" })
      expect(renderedButtons?.[1]).toMatchObject({ background: "#445566", keyIndex: 1, label: "Button" })
      expect(getRenderedButton(runtime, 0)).toMatchObject({ background: "#112233", keyIndex: 0, label: "Deck" })
      expect(getRenderedButton(runtime, 1)).toMatchObject({ background: "#445566", keyIndex: 1, label: "Button" })
    })
  })

  it("falls back to the theme background when neither button nor deck config overrides it", async () => {
    const onRenderDeck = vi.fn()
    const runtime = createDeckRuntime({
      deck: {
        id: "main",
        buttons: [{
          config: { label: "Clock" },
          definition: createDisplayDefinition(),
          label: "Clock",
          position: 0,
          type: "display-text",
        }],
      },
      onRenderDeck,
      subscribeKeyEvents: () => () => {},
      theme: createTestTheme(),
    })

    runtime.start()

    await vi.waitFor(() => {
      const renderedButton = onRenderDeck.mock.calls.at(-1)?.[0]?.[0]
      expect(renderedButton).toMatchObject({ background: "#10161f", keyIndex: 0, label: "Clock" })
      expect(getRenderedButtonHtml(renderedButton)).toContain("Clock")
    })
  })

  it("resolves host-context placeholders for action commands", async () => {
    const executeAction = vi.fn(async () => ({
      code: 0,
      failed: false,
      signal: undefined,
      stderr: "",
      stdout: "",
      timedOut: false,
    }))
    const runtime = createDeckRuntime({
      deck: {
        id: "main",
        buttons: [{
          config: { emoji: "😀", label: "Smileys", select_command: "printf '%s' '{{emoji}} @ {{host.os.type}}'" },
          definition: {
            configSchema: {
              parse: (value: unknown) => value,
              safeParse: (value: unknown) => ({ data: value, success: true as const }),
            },
            onTap: async ({ config, methods }: {
              config: { emoji: string; label: string; select_command: string }
              methods: { runCommand: (command: string) => Promise<unknown> }
            }) => {
              await methods.runCommand(config.select_command.replaceAll("{{emoji}}", config.emoji))
            },
            render: ({ button, config }: { button: { position: number }; config: { label: string } }) => createTextSurface(button.position, config.label),
            type: "emoji-entry-button",
          },
          position: 0,
          type: "emoji-entry-button",
        }],
      },
      executeAction,
      hostContext: {
        os: {
          type: "linux",
          variant: "ubuntu",
          version: "24.04",
        },
        session: {
          capability: "unknown",
          state: "unknown",
        },
      },
      subscribeKeyEvents: (listener) => {
        queueMicrotask(() => {
          listener({ keyIndex: 0, type: "down" })
          listener({ keyIndex: 0, type: "up" })
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
      expect(executeAction).toHaveBeenCalledWith("printf '%s' '😀 @ {{host.os.type}}'")
    })
  })

  it("resolves host-context placeholders for status-bearing refresh command flows", async () => {
    const executeAction = vi.fn(async () => ({
      code: 0,
      failed: false,
      signal: undefined,
      stderr: "",
      stdout: "linux|unknown",
      timedOut: false,
    }))
    const createScheduler = vi.fn(() => ({
      intervalMs: 1000,
      jitterMs: 0,
      scheduleDelay: () => 0,
      start: (tasks: Array<{ id: string; run: () => Promise<void> }>) => {
        void tasks[0]?.run()
      },
      stop: vi.fn(),
    }))
    const runtime = createDeckRuntime({
      createScheduler,
      deck: {
        id: "main",
        buttons: [{
          config: { label: "Status" },
          definition: {
            configSchema: {
              parse: (value: unknown) => value,
              safeParse: (value: unknown) => ({ data: value, success: true as const }),
            },
            refresh: async ({ methods }: { methods: { runCommand: (command: string) => Promise<unknown> } }) => {
              await methods.runCommand("printf '%s|%s' '{{host.os.type}}' '{{host.session.state}}'")
            },
            render: ({ button }: { button: { position: number } }) => createTextSurface(button.position, "Status"),
            defaultIntervalMs: 1000,
            type: "status-display",
          },
          label: "Status",
          position: 0,
          type: "status-display",
        }],
      },
      executeAction,
      hostContext: {
        os: {
          type: "linux",
          variant: "ubuntu",
          version: "24.04",
        },
        session: {
          capability: "unknown",
          state: "unknown",
        },
      },
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
      expect(createScheduler).toHaveBeenCalledWith(1000)
      expect(executeAction).toHaveBeenCalledWith("printf '%s|%s' '{{host.os.type}}' '{{host.session.state}}'")
    })
  })

  it("keeps the committed Phase 11 host-context fixture live across render and action execution", async () => {
    const config = loadConfig(
      join(FIXTURES_DIRECTORY, "phase-11/config.host-context.yml"),
      createBundledAddonRegistry(),
      {
        os: {
          type: "linux",
          variant: "ubuntu",
          version: "24.04",
        },
        session: {
          capability: "unknown",
          state: "unknown",
        },
      },
    )
    const executeAction = vi.fn(async () => ({
      code: 0,
      failed: false,
      signal: undefined,
      stderr: "",
      stdout: "",
      timedOut: false,
    }))
    let emitEvent: ((event: StreamDeckKeyEvent) => void) | undefined
    const runtime = createDeckRuntime({
      deck: config.decks[config.main_deck]!,
      decks: config.decks,
      executeAction,
      hostContext: {
        os: {
          type: "linux",
          variant: "ubuntu",
          version: "24.04",
        },
        session: {
          capability: "unknown",
          state: "unknown",
        },
      },
      subscribeKeyEvents: (listener) => {
        emitEvent = listener

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
      const renderedButton = getRenderedButton(runtime, 0)
      expect(renderedButton).toMatchObject({ background: "#10161f", keyIndex: 0, label: "linux / ubuntu / unknown" })
      expect(getRenderedButtonHtml(renderedButton)).toContain("linux / ubuntu / unknown")
    })

    emitEvent?.({ keyIndex: 1, type: "down" })
    emitEvent?.({ keyIndex: 1, type: "up" })

    await vi.waitFor(() => {
      expect(runtime.getActiveDeck().id).toBe("emoji")
    })

    emitEvent?.({ keyIndex: 0, type: "down" })
    emitEvent?.({ keyIndex: 0, type: "up" })

    await vi.waitFor(() => {
      expect(runtime.getActiveDeck().id).toBe("emoji-favorites")
    })

    emitEvent?.({ keyIndex: 0, type: "down" })
    emitEvent?.({ keyIndex: 0, type: "up" })

    await vi.waitFor(() => {
      expect(executeAction).toHaveBeenCalledWith("printf '%s' '😀 @ {{host.os.type}} @ {{host.session.state}}'")
    })
  })

  it("navigates generated emoji decks and runs the favorites selection command", async () => {
    const registry = createBundledAddonRegistry()
    const config = validateConfig({
      addons: [],
      decks: {
        emoji: {
          favorites: ["😀", "🔥"],
          id: "emoji",
          select_command: "printf '%s' '{{emoji}}'",
          type: "emoji-selector",
        },
      },
      logging: { level: "info" },
      main_deck: "emoji",
      theme: "dark",
    }, registry)
    let emitEvent: ((event: StreamDeckKeyEvent) => void) | undefined
    const onRenderDeck = vi.fn()
    const executeAction = vi.fn(async () => ({
      exitCode: 0,
      signal: null,
      stderr: "",
      stdout: "",
    }))
    const runtime = createDeckRuntime({
      deck: config.decks[config.main_deck]!,
      decks: config.decks,
      executeAction,
      onRenderDeck,
      subscribeKeyEvents: (listener) => {
        emitEvent = listener
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
      expect(runtime.getActiveDeck().id).toBe("emoji")
      expect(getRenderedButton(runtime, 0)).toMatchObject({ keyIndex: 0, label: "Favorites" })
    })

    emitEvent?.({ keyIndex: 0, type: "down" })
    emitEvent?.({ keyIndex: 0, type: "up" })

    await vi.waitFor(() => {
      expect(runtime.getActiveDeck().id).toBe("emoji-favorites")
      expect(getRenderedButton(runtime, 0)).toMatchObject({ keyIndex: 0, label: "Favorites" })
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 0))).toContain("GRIN")
    })

    emitEvent?.({ keyIndex: 0, type: "down" })
    emitEvent?.({ keyIndex: 0, type: "up" })

    await vi.waitFor(() => {
      expect(executeAction).toHaveBeenCalledWith("printf '%s' '😀'")
    })
  })

  it("prefers button interval_ms over definition defaults for polling", async () => {
    const createScheduler = vi.fn((_intervalMs: number): PollingScheduler => ({
      intervalMs: 0,
      jitterMs: 0,
      scheduleDelay: () => 0,
      start: vi.fn(),
      stop: vi.fn(),
    }))

    const runtime = createDeckRuntime({
      createScheduler,
      deck: {
        id: "main",
        buttons: [{
          config: { interval_ms: 1000, label: "Clock" },
          definition: { ...createDisplayDefinition(), defaultIntervalMs: 2000 },
          interval_ms: 1000,
          label: "Clock",
          position: 0,
          type: "display-text",
        }],
      },
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
      expect(createScheduler).toHaveBeenCalledWith(1000)
    })
  })

  it("uses definition defaults when no interval override is configured", async () => {
    const createScheduler = vi.fn((_intervalMs: number): PollingScheduler => ({
      intervalMs: 0,
      jitterMs: 0,
      scheduleDelay: () => 0,
      start: vi.fn(),
      stop: vi.fn(),
    }))

    const runtime = createDeckRuntime({
      createScheduler,
      deck: {
        id: "main",
        buttons: [{
          config: { label: "Clock" },
          definition: { ...createDisplayDefinition(), defaultIntervalMs: 1500 },
          label: "Clock",
          position: 0,
          type: "display-text",
        }],
      },
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
      expect(createScheduler).toHaveBeenCalledWith(1500)
    })
  })

  it("re-renders the active deck when a polled live button refreshes", async () => {
    let schedulerTask: (() => Promise<void>) | undefined
    let currentLabel = "10:48:07"
    const onRenderDeck = vi.fn()
    const createScheduler = vi.fn((_intervalMs: number): PollingScheduler => ({
      intervalMs: 0,
      jitterMs: 0,
      scheduleDelay: () => 0,
      start: (tasks) => {
        schedulerTask = tasks[0]?.run
      },
      stop: vi.fn(),
    }))

    const runtime = createDeckRuntime({
      createScheduler,
      deck: {
        id: "main",
        buttons: [{
          config: { label: "Clock" },
          definition: {
            ...createDisplayDefinition(),
            defaultIntervalMs: 1000,
            refresh: async () => {
              currentLabel = "10:48:08"
            },
            render: ({ button }: { button: { position: number } }) => createTextSurface(button.position, currentLabel),
          },
          label: "Clock",
          position: 0,
          type: "display-text",
        }],
      },
      onRenderDeck,
      subscribeKeyEvents: () => () => {},
      theme: createTestTheme(),
    })

    runtime.start()

    await vi.waitFor(() => {
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 0))).toContain("10:48:07")
    })

    await schedulerTask?.()

    await vi.waitFor(() => {
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 0))).toContain("10:48:08")
      const renderedButton = onRenderDeck.mock.calls.at(-1)?.[0]?.[0]
      expect(renderedButton).toMatchObject({ background: "#10161f", keyIndex: 0, label: "Clock" })
      expect(getRenderedButtonHtml(renderedButton)).toContain("10:48:08")
    })
  })

  it("shows the button runtime helper and structured diagnostics when a polled refresh fails", async () => {
    let schedulerTask: (() => Promise<void>) | undefined
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const createScheduler = vi.fn((_intervalMs: number): PollingScheduler => ({
      intervalMs: 0,
      jitterMs: 0,
      scheduleDelay: () => 0,
      start: (tasks) => {
        schedulerTask = tasks[0]?.run
      },
      stop: vi.fn(),
    }))
    const runtime = createDeckRuntime({
      createScheduler,
      deck: {
        id: "main",
        buttons: [{
          config: { label: "Status" },
          definition: {
            ...createDisplayDefinition(),
            defaultIntervalMs: 1000,
            refresh: async () => {
              throw new Error("refresh exploded")
            },
            type: "broken-refresh",
          },
          label: "Status",
          position: 0,
          type: "broken-refresh",
        }],
      },
      subscribeKeyEvents: () => () => {},
      theme: createTestTheme(),
    })

    runtime.start()

    await vi.waitFor(() => {
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 0))).toContain("Status")
    })

    await schedulerTask?.()

    await vi.waitFor(() => {
      const renderedButton = getRenderedButton(runtime, 0)
      const html = getRenderedButtonHtml(renderedButton)
      expect(html).toContain('data-sireno-icon-source="generic"')
      expect(html).toContain('data-sireno-ui-icon="true"')
      expect(html).toContain('lucide lucide-circle-alert')
      expect(html).not.toContain("▲")
      expect(html).toContain("4106")
      expect(consoleError).toHaveBeenCalledWith(
        "button runtime error",
        expect.objectContaining({
          buttonPosition: 0,
          buttonType: "broken-refresh",
          deckId: "main",
          errorCode: "4106",
          operation: "refresh",
          scope: "button-runtime",
          error: expect.any(Error),
        }),
      )
    })
  })

  it('backs shared generic and brand icons with lucide-react instead of handwritten svg registries', () => {
    const source = readFileSync(
      fileURLToPath(new URL('../ui/Icon.tsx', import.meta.url)),
      'utf8',
    )

    expect(source).toContain("from 'lucide-react'")
    expect(source).not.toContain('createElement("circle"')
    expect(source).not.toContain('createElement("path"')
  })

  it("forwards the latest polled payload into mounted render props", async () => {
    let schedulerTask: (() => Promise<void>) | undefined
    let nextLabel = "fresh"
    const createScheduler = vi.fn((_intervalMs: number): PollingScheduler => ({
      intervalMs: 0,
      jitterMs: 0,
      scheduleDelay: () => 0,
      start: (tasks) => {
        schedulerTask = tasks[0]?.run
      },
      stop: vi.fn(),
    }))

    const runtime = createDeckRuntime({
      createScheduler,
      deck: {
        id: "main",
        buttons: [{
          config: { label: "Payload" },
          definition: {
            configSchema: {
              parse: (value: unknown) => value,
              safeParse: (value: unknown) => ({ data: value, success: true as const }),
            },
            defaultPollIntervalMs: 1000,
            poll: async () => ({ label: nextLabel }),
            render: ({ button, payload }: { button: { position: number }; payload?: { label: string } }) => (
              createTextSurface(button.position, payload?.label ?? "empty")
            ),
            type: "payload-button",
          },
          label: "Payload",
          position: 0,
          type: "payload-button",
        }],
      },
      subscribeKeyEvents: () => () => {},
      theme: createTestTheme(),
    })

    runtime.start()

    await vi.waitFor(() => {
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 0))).toContain("empty")
      expect(createScheduler).toHaveBeenCalledWith(1000)
    })

    await schedulerTask?.()

    await vi.waitFor(() => {
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 0))).toContain("fresh")
    })
  })

  it("keeps poll and render cadence loops independent when both are configured", async () => {
    const scheduledTasks = new Map<string, () => Promise<void>>()
    const createScheduler = vi.fn((intervalMs: number): PollingScheduler => ({
      intervalMs,
      jitterMs: 0,
      scheduleDelay: () => 0,
      start: (tasks) => {
        for (const task of tasks) {
          scheduledTasks.set(task.id, task.run)
        }
      },
      stop: vi.fn(),
    }))
    let pollTick = 0

    const runtime = createDeckRuntime({
      createScheduler,
      deck: {
        id: "main",
        buttons: [{
          config: { label: "Split" },
          definition: {
            configSchema: {
              parse: (value: unknown) => value,
              safeParse: (value: unknown) => ({ data: value, success: true as const }),
            },
            defaultPollIntervalMs: 2000,
            defaultRenderIntervalMs: 1000,
            poll: async () => {
              pollTick += 1
              return { label: `tick-${pollTick}` }
            },
            render: ({ button, payload }: { button: { position: number }; payload?: { label: string } }) => (
              createTextSurface(button.position, payload?.label ?? "none")
            ),
            type: "split-cadence-button",
          },
          label: "Split",
          position: 0,
          type: "split-cadence-button",
        }],
      },
      subscribeKeyEvents: () => () => {},
      theme: createTestTheme(),
    })

    runtime.start()

    await vi.waitFor(() => {
      expect(createScheduler).toHaveBeenCalledWith(2000)
      expect(createScheduler).toHaveBeenCalledWith(1000)
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 0))).toContain("none")
    })

    const pollTask = [...scheduledTasks.entries()].find(([id]) => id.endsWith("-poll"))?.[1]
    const renderTask = [...scheduledTasks.entries()].find(([id]) => id.endsWith("-render"))?.[1]
    expect(pollTask).toBeTypeOf("function")
    expect(renderTask).toBeTypeOf("function")

    await renderTask?.()
    await vi.waitFor(() => {
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 0))).toContain("none")
    })

    await pollTask?.()
    await vi.waitFor(() => {
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 0))).toContain("none")
    })

    await renderTask?.()
    await vi.waitFor(() => {
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 0))).toContain("tick-1")
    })
  })

  it("surfaces poll callback failures through runtime refresh diagnostics", async () => {
    let schedulerTask: (() => Promise<void>) | undefined
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const createScheduler = vi.fn((_intervalMs: number): PollingScheduler => ({
      intervalMs: 0,
      jitterMs: 0,
      scheduleDelay: () => 0,
      start: (tasks) => {
        schedulerTask = tasks[0]?.run
      },
      stop: vi.fn(),
    }))
    const runtime = createDeckRuntime({
      createScheduler,
      deck: {
        id: "main",
        buttons: [{
          config: { label: "Status" },
          definition: {
            configSchema: {
              parse: (value: unknown) => value,
              safeParse: (value: unknown) => ({ data: value, success: true as const }),
            },
            defaultPollIntervalMs: 1000,
            poll: async () => {
              throw new Error("poll exploded")
            },
            render: ({ button }: { button: { position: number } }) => createTextSurface(button.position, "Status"),
            type: "broken-poll",
          },
          label: "Status",
          position: 0,
          type: "broken-poll",
        }],
      },
      subscribeKeyEvents: () => () => {},
      theme: createTestTheme(),
    })

    runtime.start()

    await vi.waitFor(() => {
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 0))).toContain("Status")
    })

    await schedulerTask?.()

    await vi.waitFor(() => {
      const renderedButton = getRenderedButton(runtime, 0)
      const html = getRenderedButtonHtml(renderedButton)
      expect(html).toContain("4106")
      expect(consoleError).toHaveBeenCalledWith(
        "button runtime error",
        expect.objectContaining({
          buttonPosition: 0,
          buttonType: "broken-poll",
          deckId: "main",
          errorCode: "4106",
          operation: "refresh",
          scope: "button-runtime",
          error: expect.any(Error),
        }),
      )
    })
  })

  it("uses command-driven toggle instance defaults when no interval override is configured", async () => {
    const registry = createBundledAddonRegistry()
    const createScheduler = vi.fn((_intervalMs: number): PollingScheduler => ({
      intervalMs: 0,
      jitterMs: 0,
      scheduleDelay: () => 0,
      start: vi.fn(),
      stop: vi.fn(),
    }))

    const runtime = createDeckRuntime({
      createScheduler,
      deck: {
        id: "main",
        buttons: [{
          config: {
            get_state_command: "read-lamp",
            label: "Lamp",
            mode: "get-set",
            set_off_command: "turn-off-lamp",
            set_on_command: "turn-on-lamp",
          },
          definition: registry.getButton("toggle")!,
          label: "Lamp",
          position: 0,
          type: "toggle",
        }],
      },
      executeAction: async () => ({ code: 0, failed: false, signal: undefined, stderr: "", stdout: "off", timedOut: false }),
      subscribeKeyEvents: () => () => {},
      theme: createTestTheme(),
    })

    runtime.start()

    await vi.waitFor(() => {
      expect(createScheduler).toHaveBeenCalledWith(1000)
    })
  })

  it("skips polling when neither interval override nor default cadence exists", async () => {
    const createScheduler = vi.fn((_intervalMs: number): PollingScheduler => ({
      intervalMs: 0,
      jitterMs: 0,
      scheduleDelay: () => 0,
      start: vi.fn(),
      stop: vi.fn(),
    }))

    const runtime = createDeckRuntime({
      createScheduler,
      deck: {
        id: "main",
        buttons: [{
          config: { label: "Clock" },
          definition: createDisplayDefinition(),
          label: "Clock",
          position: 0,
          type: "display-text",
        }],
      },
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
      const renderedButton = getRenderedButton(runtime, 0)
      expect(renderedButton).toMatchObject({ background: "#10161f", keyIndex: 0, label: "Clock" })
      expect(getRenderedButtonHtml(renderedButton)).toContain("Clock")
    })

    expect(createScheduler).not.toHaveBeenCalled()
  })

  it("does not start default polling for internal toggles", async () => {
    const registry = createBundledAddonRegistry()
    const createScheduler = vi.fn((_intervalMs: number): PollingScheduler => ({
      intervalMs: 0,
      jitterMs: 0,
      scheduleDelay: () => 0,
      start: vi.fn(),
      stop: vi.fn(),
    }))

    const runtime = createDeckRuntime({
      createScheduler,
      deck: {
        id: "main",
        buttons: [{
          config: { label: "Lamp", mode: "internal", off: { subtitle: "OFF" }, on: { subtitle: "ON" } },
          definition: registry.getButton("toggle")!,
          label: "Lamp",
          position: 0,
          type: "toggle",
        }],
      },
      subscribeKeyEvents: () => () => {},
      theme: createTestTheme(),
    })

    runtime.start()

    await vi.waitFor(() => {
      const renderedButton = getRenderedButton(runtime, 0)
      expect(renderedButton).toMatchObject({ background: "#10161f", keyIndex: 0, label: "Lamp" })
      expect(getRenderedButtonHtml(renderedButton)).toContain("OFF")
    })

    expect(createScheduler).not.toHaveBeenCalled()
  })

  it("switches to a configured locked deck and restores the exact pre-lock navigation stack on unlock", async () => {
    let emitEvent: ((event: StreamDeckKeyEvent) => void) | undefined
    const sessionMonitor = createSessionMonitorDouble({ capability: "supported", state: "unlocked" })
    const runtime = createDeckRuntime({
      deck: {
        id: "main",
        buttons: [{
          config: { label: "Go to Apps" },
          definition: createNavigationDefinition("Go to Apps", "apps", "nav-main-apps"),
          label: "Go to Apps",
          position: 0,
          type: "nav-main-apps",
        }],
      },
      decks: {
        main: {
          id: "main",
          buttons: [{
            config: { label: "Go to Apps" },
            definition: createNavigationDefinition("Go to Apps", "apps", "nav-main-apps"),
            label: "Go to Apps",
            position: 0,
            type: "nav-main-apps",
          }],
        },
        apps: {
          id: "apps",
          buttons: [{
            config: { label: "Open Settings" },
            definition: createNavigationDefinition("Open Settings", "settings", "nav-apps-settings"),
            label: "Open Settings",
            position: 0,
            type: "nav-apps-settings",
          }],
        },
        settings: {
          id: "settings",
          buttons: [{
            config: { label: "Settings" },
            definition: createDisplayDefinition(),
            label: "Settings",
            position: 0,
            type: "display-text",
          }],
        },
        locked: {
          id: "locked",
          buttons: [{
            config: { label: "Locked Deck" },
            definition: createDisplayDefinition(),
            label: "Locked Deck",
            position: 0,
            type: "display-text",
          }],
        },
      },
      hostContext: {
        os: { type: "linux", variant: "ubuntu", version: "24.04" },
        session: { capability: "supported", state: "unlocked" },
      },
      lockedDeckId: "locked",
      sessionMonitor,
      subscribeKeyEvents: (listener) => {
        emitEvent = listener
        return () => {}
      },
      theme: createTestTheme(),
    })

    runtime.start()

    await vi.waitFor(() => {
      expect(runtime.getActiveDeck().id).toBe("main")
    })

    emitEvent?.({ keyIndex: 0, type: "down" })
    emitEvent?.({ keyIndex: 0, type: "up" })

    await vi.waitFor(() => {
      expect(runtime.getActiveDeck().id).toBe("apps")
    })

    emitEvent?.({ keyIndex: 0, type: "down" })
    emitEvent?.({ keyIndex: 0, type: "up" })

    await vi.waitFor(() => {
      expect(runtime.getActiveDeck().id).toBe("settings")
      const renderedButton = getRenderedButton(runtime, 0)
      expect(renderedButton).toMatchObject({ background: "#10161f", keyIndex: 0, label: "Settings" })
      expect(getRenderedButtonHtml(renderedButton)).toContain("Settings")
    })

    sessionMonitor.emit({ capability: "supported", state: "locked" })

    await vi.waitFor(() => {
      expect(runtime.getActiveDeck().id).toBe("locked")
      const renderedButton = getRenderedButton(runtime, 0)
      expect(renderedButton).toMatchObject({ background: "#10161f", keyIndex: 0, label: "Locked Deck" })
      expect(getRenderedButtonHtml(renderedButton)).toContain("Locked Deck")
    })

    sessionMonitor.emit({ capability: "supported", state: "unlocked" })

    await vi.waitFor(() => {
      expect(runtime.getActiveDeck().id).toBe("settings")
      const renderedButton = getRenderedButton(runtime, 0)
      expect(renderedButton).toMatchObject({ background: "#10161f", keyIndex: 0, label: "Settings" })
      expect(getRenderedButtonHtml(renderedButton)).toContain("Settings")
    })
  })

  it("restores a saved navigation stack onto a rebuilt runtime", async () => {
    let emitEvent: ((event: StreamDeckKeyEvent) => void) | undefined
    const decks = {
      main: {
        id: "main",
        buttons: [{
          config: { label: "Apps" },
          definition: createNavigationDefinition("Apps", "apps", "nav-main-apps"),
          label: "Apps",
          position: 0,
          type: "nav-main-apps",
        }],
      },
      apps: {
        id: "apps",
        buttons: [{
          config: { label: "Settings" },
          definition: createNavigationDefinition("Settings", "settings", "nav-apps-settings"),
          label: "Settings",
          position: 0,
          type: "nav-apps-settings",
        }],
      },
      settings: {
        id: "settings",
        buttons: [{
          config: { label: "Settings Deck" },
          definition: createDisplayDefinition(),
          label: "Settings Deck",
          position: 0,
          type: "display-text",
        }],
      },
    } as const
    const runtime = createDeckRuntime({
      deck: decks.main,
      decks,
      subscribeKeyEvents: (listener) => {
        emitEvent = listener
        return () => {}
      },
      theme: createTestTheme(),
    })

    runtime.start()

    emitEvent?.({ keyIndex: 0, type: "down" })
    emitEvent?.({ keyIndex: 0, type: "up" })

    await vi.waitFor(() => {
      expect(runtime.getActiveDeck().id).toBe("apps")
    })

    emitEvent?.({ keyIndex: 0, type: "down" })
    emitEvent?.({ keyIndex: 0, type: "up" })

    await vi.waitFor(() => {
      expect(runtime.getActiveDeck().id).toBe("settings")
    })

    const snapshot = runtime.getStackSnapshot()

    runtime.stop()

    const rebuiltRuntime = createDeckRuntime({
      deck: decks.main,
      decks,
      subscribeKeyEvents: () => () => {},
      theme: createTestTheme(),
    })

    rebuiltRuntime.start()
    await rebuiltRuntime.restoreStack(snapshot)

    await vi.waitFor(() => {
      expect(rebuiltRuntime.getActiveDeck().id).toBe("settings")
      const renderedButton = getRenderedButton(rebuiltRuntime, 0)
      expect(renderedButton).toMatchObject({ background: "#10161f", keyIndex: 0, label: "Settings Deck" })
      expect(getRenderedButtonHtml(renderedButton)).toContain("Settings Deck")
    })
  })

  it("shows a temporary reload error deck without overwriting the underlying navigation stack", async () => {
    let emitEvent: ((event: StreamDeckKeyEvent) => void) | undefined
    const decks = {
      main: {
        id: "main",
        buttons: [{
          config: { label: "Apps" },
          definition: createNavigationDefinition("Apps", "apps", "nav-main-apps"),
          label: "Apps",
          position: 0,
          type: "nav-main-apps",
        }],
      },
      apps: {
        id: "apps",
        buttons: [{
          config: { label: "Settings" },
          definition: createNavigationDefinition("Settings", "settings", "nav-apps-settings"),
          label: "Settings",
          position: 0,
          type: "nav-apps-settings",
        }],
      },
      settings: {
        id: "settings",
        buttons: [{
          config: { label: "Settings Deck" },
          definition: createDisplayDefinition(),
          label: "Settings Deck",
          position: 0,
          type: "display-text",
        }],
      },
    } as const
    const runtime = createDeckRuntime({
      deck: decks.main,
      decks,
      subscribeKeyEvents: (listener) => {
        emitEvent = listener
        return () => {}
      },
      theme: createTestTheme(),
    })

    runtime.start()

    emitEvent?.({ keyIndex: 0, type: "down" })
    emitEvent?.({ keyIndex: 0, type: "up" })

    await vi.waitFor(() => {
      expect(runtime.getActiveDeck().id).toBe("apps")
    })

    emitEvent?.({ keyIndex: 0, type: "down" })
    emitEvent?.({ keyIndex: 0, type: "up" })

    await vi.waitFor(() => {
      expect(runtime.getActiveDeck().id).toBe("settings")
    })

    const snapshotBeforeError = runtime.getStackSnapshot()

    await runtime.showTemporaryErrorDeck([
      "config.yml:10",
      "Unknown button type 'broken'",
      "Fix the config and save again.",
    ])

    await vi.waitFor(() => {
      const renderedButton = getRenderedButton(runtime, 0)
      expect(renderedButton).toMatchObject({ background: "#10161f", full: true, keyIndex: 0 })
      const html = getRenderedButtonHtml(renderedButton)
      expect(html).toContain("Config Error")
      expect(html).toContain("RELOAD")
      expect(html).toContain("config.yml:10")
      expect(html).toContain("Unknown button type &#x27;broken&#x27;")
      expect(html).toContain("Fix the config and save again.")
    })

    expect(runtime.getActiveDeck().id).toBe("settings")
    expect(runtime.getStackSnapshot()).toEqual(snapshotBeforeError)
  })

  it("lets a later rebuilt runtime recover from the saved valid stack after an error deck was shown", async () => {
    const decks = {
      main: {
        id: "main",
        buttons: [{
          config: { label: "Apps" },
          definition: {
            configSchema: { parse: (value: unknown) => value, safeParse: (value: unknown) => ({ data: value, success: true as const }) },
            onTap: async ({ methods }: { methods: { navigateToDeck: (deckId: string) => Promise<void> } }) => { await methods.navigateToDeck("settings") },
            render: ({ button }: { button: { position: number } }) => createTextSurface(button.position, "Apps"),
            type: "nav-main-settings",
          },
          label: "Apps",
          position: 0,
          type: "nav-main-settings",
        }],
      },
      settings: {
        id: "settings",
        buttons: [{
          config: { label: "Recovered Settings" },
          definition: createDisplayDefinition(),
          label: "Recovered Settings",
          position: 0,
          type: "display-text",
        }],
      },
    } as const
    const runtime = createDeckRuntime({
      deck: decks.main,
      decks,
      subscribeKeyEvents: () => () => {},
      theme: createTestTheme(),
    })

    runtime.start()
    await runtime.restoreStack(["main", "settings"])
    await runtime.showTemporaryErrorDeck([
      "config.yml:10",
      "Unknown button type 'broken'",
      "Fix the config and save again.",
    ])

    const preservedSnapshot = runtime.getStackSnapshot()
    const preservedActiveDeckId = runtime.getActiveDeck().id

    runtime.stop()

    const rebuiltRuntime = createDeckRuntime({
      deck: decks.main,
      decks,
      subscribeKeyEvents: () => () => {},
      theme: createTestTheme(),
    })

    rebuiltRuntime.start()
    await rebuiltRuntime.restoreStack(preservedSnapshot)

    await vi.waitFor(() => {
      expect(preservedActiveDeckId).toBe("settings")
      expect(rebuiltRuntime.getActiveDeck().id).toBe("settings")
      const renderedButton = getRenderedButton(rebuiltRuntime, 0)
      expect(renderedButton).toMatchObject({ background: "#10161f", keyIndex: 0, label: "Recovered Settings" })
      expect(getRenderedButtonHtml(renderedButton)).toContain("Recovered Settings")
    })
  })

  it("uses the implicit centered five-button time fallback when no locked deck is configured", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 14, 9, 8, 7))

    const sessionMonitor = createSessionMonitorDouble({ capability: "supported", state: "unlocked" })
    const runtime = createDeckRuntime({
      deck: {
        id: "main",
        buttons: [{
          config: { label: "Clock" },
          definition: createDisplayDefinition(),
          label: "Clock",
          position: 0,
          type: "display-text",
        }],
      },
      hostContext: {
        os: { type: "linux", variant: "ubuntu", version: "24.04" },
        session: { capability: "supported", state: "unlocked" },
      },
      sessionMonitor,
      subscribeKeyEvents: () => () => {},
      theme: createTestTheme(),
    })

    runtime.start()

    sessionMonitor.emit({ capability: "supported", state: "locked" })

    await vi.waitFor(() => {
      expect(runtime.getActiveDeck().id).toBe("__sireno_locked_session__")
      expect(runtime.getButton(5)).toMatchObject({
        config: { slot: "hour-tens" },
        type: "locked-time-tile",
      })
      expect(runtime.getButton(6)).toMatchObject({
        config: { slot: "hour-ones" },
        type: "locked-time-tile",
      })
      expect(runtime.getButton(7)).toMatchObject({
        config: { slot: "separator" },
        type: "locked-time-tile",
      })
      expect(runtime.getButton(8)).toMatchObject({
        config: { slot: "minute-tens" },
        type: "locked-time-tile",
      })
      expect(runtime.getButton(9)).toMatchObject({
        config: { slot: "minute-ones" },
        type: "locked-time-tile",
      })
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 5))).toContain('0')
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 6))).toContain('9')
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 7))).toContain(':')
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 8))).toContain('0')
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 9))).toContain('8')
    })

    vi.setSystemTime(new Date(2026, 4, 14, 9, 9, 1))
    await vi.advanceTimersByTimeAsync(1000)

    await vi.waitFor(() => {
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 8))).toContain('0')
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 9))).toContain('9')
    })
  })

  it("keeps locked-mode navigation isolated from the saved pre-lock stack", async () => {
    let emitEvent: ((event: StreamDeckKeyEvent) => void) | undefined
    const sessionMonitor = createSessionMonitorDouble({ capability: "supported", state: "unlocked" })
    const runtime = createDeckRuntime({
      deck: {
        id: "main",
        buttons: [{
          config: { label: "Settings" },
          definition: {
            configSchema: { parse: (value: unknown) => value, safeParse: (value: unknown) => ({ data: value, success: true as const }) },
            onTap: async ({ methods }: { methods: { navigateToDeck: (deckId: string) => Promise<void> } }) => { await methods.navigateToDeck("settings") },
            render: ({ button }: { button: { position: number } }) => createTextSurface(button.position, "Settings"),
            type: "nav-settings",
          },
          label: "Settings",
          position: 0,
          type: "nav-settings",
        }],
      },
      decks: {
        main: {
          id: "main",
          buttons: [{
            config: { label: "Settings" },
            definition: {
              configSchema: { parse: (value: unknown) => value, safeParse: (value: unknown) => ({ data: value, success: true as const }) },
              onTap: async ({ methods }: { methods: { navigateToDeck: (deckId: string) => Promise<void> } }) => { await methods.navigateToDeck("settings") },
              render: ({ button }: { button: { position: number } }) => createTextSurface(button.position, "Settings"),
              type: "nav-settings",
            },
            label: "Settings",
            position: 0,
            type: "nav-settings",
          }],
        },
        settings: {
          id: "settings",
          buttons: [{
            config: { label: "Settings Deck" },
            definition: createDisplayDefinition(),
            label: "Settings Deck",
            position: 0,
            type: "display-text",
          }],
        },
        locked: {
          id: "locked",
          buttons: [{
            config: { label: "Locked Tools" },
            definition: {
              configSchema: { parse: (value: unknown) => value, safeParse: (value: unknown) => ({ data: value, success: true as const }) },
              onTap: async ({ methods }: { methods: { navigateToDeck: (deckId: string) => Promise<void> } }) => { await methods.navigateToDeck("locked-tools") },
              render: ({ button }: { button: { position: number } }) => createTextSurface(button.position, "Locked Tools"),
              type: "nav-locked-tools",
            },
            label: "Locked Tools",
            position: 0,
            type: "nav-locked-tools",
          }],
        },
        "locked-tools": {
          id: "locked-tools",
          buttons: [{
            config: { label: "Locked Detail" },
            definition: createDisplayDefinition(),
            label: "Locked Detail",
            position: 0,
            type: "display-text",
          }],
        },
      },
      hostContext: {
        os: { type: "linux", variant: "ubuntu", version: "24.04" },
        session: { capability: "supported", state: "unlocked" },
      },
      lockedDeckId: "locked",
      sessionMonitor,
      subscribeKeyEvents: (listener) => {
        emitEvent = listener
        return () => {}
      },
      theme: createTestTheme(),
    })

    runtime.start()

    emitEvent?.({ keyIndex: 0, type: "down" })
    emitEvent?.({ keyIndex: 0, type: "up" })

    await vi.waitFor(() => {
      expect(runtime.getActiveDeck().id).toBe("settings")
    })

    sessionMonitor.emit({ capability: "supported", state: "locked" })

    await vi.waitFor(() => {
      expect(runtime.getActiveDeck().id).toBe("locked")
    })

    emitEvent?.({ keyIndex: 0, type: "down" })
    emitEvent?.({ keyIndex: 0, type: "up" })

    await vi.waitFor(() => {
      expect(runtime.getActiveDeck().id).toBe("locked-tools")
    })

    sessionMonitor.emit({ capability: "supported", state: "unlocked" })

    await vi.waitFor(() => {
      expect(runtime.getActiveDeck().id).toBe("settings")
      const renderedButton = getRenderedButton(runtime, 0)
      expect(renderedButton).toMatchObject({ background: "#10161f", keyIndex: 0, label: "Settings Deck" })
      expect(getRenderedButtonHtml(renderedButton)).toContain("Settings Deck")
    })
  })

  it("keeps the committed Phase 11 locked-session fixture restorable across lock and unlock transitions", async () => {
    const config = loadConfig(
      join(FIXTURES_DIRECTORY, "phase-11/config.locked-session.yml"),
      createBundledAddonRegistry(),
      {
        os: { type: "linux", variant: "ubuntu", version: "24.04" },
        session: { capability: "supported", state: "unlocked" },
      },
    )
    let emitEvent: ((event: StreamDeckKeyEvent) => void) | undefined
    const sessionMonitor = createSessionMonitorDouble({ capability: "supported", state: "unlocked" })
    const runtime = createDeckRuntime({
      deck: config.decks[config.main_deck]!,
      decks: config.decks,
      hostContext: {
        os: { type: "linux", variant: "ubuntu", version: "24.04" },
        session: { capability: "supported", state: "unlocked" },
      },
      lockedDeckId: config.session?.locked_deck,
      sessionMonitor,
      subscribeKeyEvents: (listener) => {
        emitEvent = listener
        return () => {}
      },
      theme: createTestTheme(),
    })

    runtime.start()

    emitEvent?.({ keyIndex: 0, type: "down" })
    emitEvent?.({ keyIndex: 0, type: "up" })

    await vi.waitFor(() => {
      expect(runtime.getActiveDeck().id).toBe("apps")
    })

    emitEvent?.({ keyIndex: 0, type: "down" })
    emitEvent?.({ keyIndex: 0, type: "up" })

    await vi.waitFor(() => {
      expect(runtime.getActiveDeck().id).toBe("settings")
      const renderedButton = getRenderedButton(runtime, 0)
      expect(renderedButton).toMatchObject({ background: "#10161f", keyIndex: 0, label: "Session unlocked" })
      expect(getRenderedButtonHtml(renderedButton)).toContain("Session unlocked")
    })

    sessionMonitor.emit({ capability: "supported", state: "locked" })

    await vi.waitFor(() => {
      expect(runtime.getActiveDeck().id).toBe("locked")
      const renderedButton = getRenderedButton(runtime, 0)
      expect(renderedButton).toMatchObject({ background: "#10161f", keyIndex: 0, label: "Locked on linux" })
      expect(getRenderedButtonHtml(renderedButton)).toContain("Locked on linux")
    })

    sessionMonitor.emit({ capability: "supported", state: "unlocked" })

    await vi.waitFor(() => {
      expect(runtime.getActiveDeck().id).toBe("settings")
      const renderedButton = getRenderedButton(runtime, 0)
      expect(renderedButton).toMatchObject({ background: "#10161f", keyIndex: 0, label: "Session unlocked" })
      expect(getRenderedButtonHtml(renderedButton)).toContain("Session unlocked")
    })
  })

  it("keeps the committed Phase 24 mounted-button fixture live across loader and runtime execution", async () => {
    const registry = createBundledAddonRegistry()
    await loadConfiguredAddons({
      addons: [{ enabled: true, name: "phase-24-local-mounted-addon", path: join(FIXTURES_DIRECTORY, "phase-24/local-mounted-addon"), source: "local" }],
      cwd: FIXTURES_DIRECTORY,
      registry,
    })

    const config = loadConfig(
      join(FIXTURES_DIRECTORY, "phase-24/config.local-mounted-addon.yml"),
      registry,
      {
        os: { type: "linux", variant: "ubuntu", version: "24.04" },
        session: { capability: "unknown", state: "unknown" },
      },
    )
    let emitEvent: ((event: StreamDeckKeyEvent) => void) | undefined
    const runtime = createDeckRuntime({
      deck: config.decks[config.main_deck]!,
      decks: config.decks,
      subscribeKeyEvents: (listener) => {
        emitEvent = listener
        return () => {}
      },
      theme: createTestTheme(),
    })

    runtime.start()

    await vi.waitFor(() => {
      const renderedButton = getRenderedButton(runtime, 0)
      expect(renderedButton).toMatchObject({ background: "#10161f", keyIndex: 0, label: "Shared" })
      expect(getRenderedButtonHtml(renderedButton)).toContain("Shared:button=0:addon=0")
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 1))).toContain("Observer:button=0:addon=0")
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 3))).toContain("Local Main:mount=")
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 3))).toContain(":count=0")
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 4))).toContain("Press Probe:frame=idle:pressed=up:count=0")
    })

    emitEvent?.({ keyIndex: 0, type: "down" })
    emitEvent?.({ keyIndex: 0, type: "up" })

    await vi.waitFor(() => {
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 0))).toContain("Shared:button=1:addon=1")
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 1))).toContain("Observer:button=0:addon=1")
    })

    emitEvent?.({ keyIndex: 2, type: "down" })
    emitEvent?.({ keyIndex: 2, type: "up" })

    await vi.waitFor(() => {
      expect(runtime.getActiveDeck().id).toBe("apps")
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 0))).toContain("Apps Observer:button=0:addon=2")
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 1))).toContain("Back Main:button=0:addon=2")
    })

    emitEvent?.({ keyIndex: 1, type: "down" })
    emitEvent?.({ keyIndex: 1, type: "up" })

    await vi.waitFor(() => {
      expect(runtime.getActiveDeck().id).toBe("main")
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 0))).toContain("Shared:button=1:addon=3")
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 1))).toContain("Observer:button=0:addon=3")
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 2))).toContain("Go Apps:button=1:addon=3")
    })
  })

  it("keeps committed Phase 24 addon-store state across deck changes but resets on rebuilt runtime", async () => {
    const registry = createBundledAddonRegistry()
    await loadConfiguredAddons({
      addons: [{ enabled: true, name: "phase-24-local-mounted-addon", path: join(FIXTURES_DIRECTORY, "phase-24/local-mounted-addon"), source: "local" }],
      cwd: FIXTURES_DIRECTORY,
      registry,
    })

    const config = loadConfig(
      join(FIXTURES_DIRECTORY, "phase-24/config.local-mounted-addon.yml"),
      registry,
      {
        os: { type: "linux", variant: "ubuntu", version: "24.04" },
        session: { capability: "unknown", state: "unknown" },
      },
    )

    const createFixtureRuntime = () => {
      let emitEvent: ((event: StreamDeckKeyEvent) => void) | undefined
      const runtime = createDeckRuntime({
        deck: config.decks[config.main_deck]!,
        decks: config.decks,
        subscribeKeyEvents: (listener) => {
          emitEvent = listener
          return () => {}
        },
        theme: createTestTheme(),
      })

      runtime.start()

      return {
        emitEvent: (event: StreamDeckKeyEvent) => {
          emitEvent?.(event)
        },
        runtime,
      }
    }

    const firstRun = createFixtureRuntime()

    await vi.waitFor(() => {
      expect(getRenderedButtonHtml(getRenderedButton(firstRun.runtime, 0))).toContain("Shared:button=0:addon=0")
    })

    firstRun.emitEvent({ keyIndex: 0, type: "down" })
    firstRun.emitEvent({ keyIndex: 0, type: "up" })
    firstRun.emitEvent({ keyIndex: 2, type: "down" })
    firstRun.emitEvent({ keyIndex: 2, type: "up" })

    await vi.waitFor(() => {
      expect(firstRun.runtime.getActiveDeck().id).toBe("apps")
      expect(getRenderedButtonHtml(getRenderedButton(firstRun.runtime, 0))).toContain("Apps Observer:button=0:addon=2")
      expect(getRenderedButtonHtml(getRenderedButton(firstRun.runtime, 1))).toContain("Back Main:button=0:addon=2")
    })

    firstRun.runtime.stop()

    const rebuiltRun = createFixtureRuntime()

    await vi.waitFor(() => {
      expect(rebuiltRun.runtime.getActiveDeck().id).toBe("main")
      expect(getRenderedButtonHtml(getRenderedButton(rebuiltRun.runtime, 0))).toContain("Shared:button=0:addon=0")
      expect(getRenderedButtonHtml(getRenderedButton(rebuiltRun.runtime, 1))).toContain("Observer:button=0:addon=0")
      expect(getRenderedButtonHtml(getRenderedButton(rebuiltRun.runtime, 2))).toContain("Go Apps:button=0:addon=0")
      expect(getRenderedButtonHtml(getRenderedButton(rebuiltRun.runtime, 3))).toContain(":count=0")
    })
  })

  it("proves committed Phase 24 mounted local state persists while active and resets after deck unmount", async () => {
    const registry = createBundledAddonRegistry()
    await loadConfiguredAddons({
      addons: [{ enabled: true, name: "phase-24-local-mounted-addon", path: join(FIXTURES_DIRECTORY, "phase-24/local-mounted-addon"), source: "local" }],
      cwd: FIXTURES_DIRECTORY,
      registry,
    })

    const config = loadConfig(
      join(FIXTURES_DIRECTORY, "phase-24/config.local-mounted-addon.yml"),
      registry,
      {
        os: { type: "linux", variant: "ubuntu", version: "24.04" },
        session: { capability: "unknown", state: "unknown" },
      },
    )

    let emitEvent: ((event: StreamDeckKeyEvent) => void) | undefined
    const runtime = createDeckRuntime({
      deck: config.decks[config.main_deck]!,
      decks: config.decks,
      subscribeKeyEvents: (listener) => {
        emitEvent = listener
        return () => {}
      },
      theme: createTestTheme(),
    })

    runtime.start()

    let initialMainMountId = -1

    await vi.waitFor(() => {
      const parts = getFixtureMountedLocalParts(getRenderedButtonHtml(getRenderedButton(runtime, 3)), "Local Main")
      expect(parts.count).toBe(0)
      initialMainMountId = parts.mountId
    })

    emitEvent?.({ keyIndex: 3, type: "down" })
    emitEvent?.({ keyIndex: 3, type: "up" })

    await vi.waitFor(() => {
      const parts = getFixtureMountedLocalParts(getRenderedButtonHtml(getRenderedButton(runtime, 3)), "Local Main")
      expect(parts.mountId).toBe(initialMainMountId)
      expect(parts.count).toBe(1)
    })

    emitEvent?.({ keyIndex: 2, type: "down" })
    emitEvent?.({ keyIndex: 2, type: "up" })

    let appsMountId = -1

    await vi.waitFor(() => {
      expect(runtime.getActiveDeck().id).toBe("apps")
      const parts = getFixtureMountedLocalParts(getRenderedButtonHtml(getRenderedButton(runtime, 2)), "Local Apps")
      expect(parts.count).toBe(0)
      appsMountId = parts.mountId
    })

    emitEvent?.({ keyIndex: 1, type: "down" })
    emitEvent?.({ keyIndex: 1, type: "up" })

    await vi.waitFor(() => {
      expect(runtime.getActiveDeck().id).toBe("main")
      const parts = getFixtureMountedLocalParts(getRenderedButtonHtml(getRenderedButton(runtime, 3)), "Local Main")
      expect(parts.count).toBe(1)
      expect(parts.mountId).not.toBe(initialMainMountId)
      expect(parts.mountId).not.toBe(appsMountId)
    })
  })

  it("proves committed Phase 24 fixture carries runtime-driven transient props through the mounted deck path", async () => {
    const registry = createBundledAddonRegistry()
    await loadConfiguredAddons({
      addons: [{ enabled: true, name: "phase-24-local-mounted-addon", path: join(FIXTURES_DIRECTORY, "phase-24/local-mounted-addon"), source: "local" }],
      cwd: FIXTURES_DIRECTORY,
      registry,
    })

    const config = loadConfig(
      join(FIXTURES_DIRECTORY, "phase-24/config.local-mounted-addon.yml"),
      registry,
      {
        os: { type: "linux", variant: "ubuntu", version: "24.04" },
        session: { capability: "unknown", state: "unknown" },
      },
    )

    let emitEvent: ((event: StreamDeckKeyEvent) => void) | undefined
    const runtime = createDeckRuntime({
      deck: config.decks[config.main_deck]!,
      decks: config.decks,
      subscribeKeyEvents: (listener) => {
        emitEvent = listener
        return () => {}
      },
      theme: createTestTheme(),
    })

    runtime.start()

    await vi.waitFor(() => {
      expect(getRenderedButton(runtime, 4)).toMatchObject({ frame_state: "idle", keyIndex: 4, label: "Press Probe" })
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 4))).toContain("Press Probe:frame=idle:pressed=up:count=0")
    })

    emitEvent?.({ keyIndex: 4, type: "down" })

    await vi.waitFor(() => {
      expect(getRenderedButton(runtime, 4)).toMatchObject({ frame_state: "hold", keyIndex: 4, label: "Press Probe" })
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 4))).toContain("Press Probe:frame=hold:pressed=down:count=0")
    })

    emitEvent?.({ keyIndex: 4, type: "up" })

    await vi.waitFor(() => {
      expect(getRenderedButton(runtime, 4)).toMatchObject({ frame_state: "idle", keyIndex: 4, label: "Press Probe" })
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 4))).toContain("Press Probe:frame=idle:pressed=up:count=1")
    })
  }, 10_000)

  it("keeps explicit full-surface addon-authored render output on runtime render output", async () => {
    const onRenderDeck = vi.fn()
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
            render: ({ button }: { button: { position: number } }) => createElement(ButtonSurface, { full: true }, createTextSurface(button.position, "Clock")),
            type: "runtime-full-surface",
          },
          label: "Clock",
          position: 0,
          type: "runtime-full-surface",
        }],
      },
      onRenderDeck,
      subscribeKeyEvents: () => () => {},
      theme: createTestTheme(),
    })

    runtime.start()

    await vi.waitFor(() => {
      const renderedButton = onRenderDeck.mock.calls.at(-1)?.[0]?.[0]
      expect(renderedButton).toMatchObject({ background: "#10161f", full: true, keyIndex: 0, label: "Clock" })
      expect(getRenderedButtonHtml(renderedButton)).toContain("Clock")
    })
  })

  it("executes mounted button definitions through runtime-owned press, release, and tap semantics", async () => {
    const onRenderDeck = vi.fn()
    const onPress = vi.fn()
    const onRelease = vi.fn()
    const onTap = vi.fn()
    let emitEvent: ((event: StreamDeckKeyEvent) => void) | undefined
    const runtime = createDeckRuntime({
      deck: {
        id: "main",
        buttons: [{
          config: { label: "Mounted" },
          definition: defineMountedButton({
            configSchema: {
              parse: (value: unknown) => value,
              safeParse: (value: unknown) => ({ data: value, success: true as const }),
            },
            onPress: async (props) => {
              onPress(props)
            },
            onRelease: async (props) => {
              onRelease(props)
            },
            onTap: async (props) => {
              onTap(props)
            },
            render: (props) => createTextSurface(props.button.position, `${props.config.label}:${props.frameState}:${props.pressed ? "down" : "up"}`),
            type: "mounted-text",
          }),
          label: "Mounted",
          position: 0,
          type: "mounted-text",
        }],
      },
      onRenderDeck,
      subscribeKeyEvents: (listener) => {
        emitEvent = listener
        return () => {}
      },
      theme: createTestTheme(),
    })

    runtime.start()

    await vi.waitFor(() => {
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 0))).toContain("Mounted:idle:up")
    })

    emitEvent?.({ keyIndex: 0, type: "down" })

    await vi.waitFor(() => {
      expect(onPress).toHaveBeenCalledWith(expect.objectContaining({ frameState: "hold", pressed: true }))
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 0))).toContain("Mounted:hold:down")
    })

    emitEvent?.({ keyIndex: 0, type: "up" })

    await vi.waitFor(() => {
      expect(onRelease).toHaveBeenCalledWith(expect.objectContaining({ frameState: "idle", pressed: false }))
      expect(onTap).toHaveBeenCalledWith(expect.objectContaining({ frameState: "tap", pressed: false }))
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 0))).toContain("Mounted:idle:up")
      const renderedButton = onRenderDeck.mock.calls.at(-1)?.[0]?.[0]
      expect(renderedButton).toMatchObject({ background: "#10161f", keyIndex: 0, label: "Mounted" })
    })
  })

  it("exposes runtime-owned mounted store scopes for button-local and addon-wide coordination", async () => {
    let emitEvent: ((event: StreamDeckKeyEvent) => void) | undefined
    const sharedDefinition = setAddonButtonOwnerName(defineMountedButton({
      configSchema: {
        parse: (value: unknown) => value,
        safeParse: (value: unknown) => ({ data: value, success: true as const }),
      },
      onTap: ({ store }) => {
        store.button.update((snapshot) => ({ taps: ((snapshot as { taps?: number } | undefined)?.taps ?? 0) + 1 }))
        store.addon.update((snapshot) => ({ total: ((snapshot as { total?: number } | undefined)?.total ?? 0) + 1 }))
      },
      render: ({ button, config, store }) => createTextSurface(
        button.position,
        `${config.label}:button=${(store.button.snapshot as { taps?: number } | undefined)?.taps ?? 0}:addon=${(store.addon.snapshot as { total?: number } | undefined)?.total ?? 0}`,
      ),
      type: "mounted-store-shared",
    }), "runtime-mounted-store-test")
    const observerDefinition = setAddonButtonOwnerName(defineMountedButton({
      configSchema: {
        parse: (value: unknown) => value,
        safeParse: (value: unknown) => ({ data: value, success: true as const }),
      },
      render: ({ button, config, store }) => createTextSurface(
        button.position,
        `${config.label}:button=${(store.button.snapshot as { taps?: number } | undefined)?.taps ?? 0}:addon=${(store.addon.snapshot as { total?: number } | undefined)?.total ?? 0}`,
      ),
      type: "mounted-store-observer",
    }), "runtime-mounted-store-test")

    const runtime = createDeckRuntime({
      deck: {
        id: "main",
        buttons: [
          {
            config: { label: "Shared" },
            definition: sharedDefinition,
            label: "Shared",
            position: 0,
            type: "mounted-store-shared",
          },
          {
            config: { label: "Observer" },
            definition: observerDefinition,
            label: "Observer",
            position: 1,
            type: "mounted-store-observer",
          },
        ],
      },
      subscribeKeyEvents: (listener) => {
        emitEvent = listener
        return () => {}
      },
      theme: createTestTheme(),
    })

    runtime.start()

    await vi.waitFor(() => {
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 0))).toContain("Shared:button=0:addon=0")
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 1))).toContain("Observer:button=0:addon=0")
    })

    emitEvent?.({ keyIndex: 0, type: "down" })
    emitEvent?.({ keyIndex: 0, type: "up" })

    await vi.waitFor(() => {
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 0))).toContain("Shared:button=1:addon=1")
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 1))).toContain("Observer:button=0:addon=1")
    })
  })

  it("preserves mounted local component state while a deck stays active but resets it after deck navigation unmounts the host", async () => {
    let emitEvent: ((event: StreamDeckKeyEvent) => void) | undefined
    let mountSerial = 0

    function MountedCounterView(props: { count: number; label: string }) {
      const [mountId] = useState(() => {
        mountSerial += 1
        return mountSerial
      })

      return createElement("span", null, `${props.label}:${mountId}:${props.count}`)
    }

    function createMountedCounterDefinition(label: string, targetDeckId?: string) {
      return defineMountedButton({
        configSchema: {
          parse: (value: unknown) => value,
          safeParse: (value: unknown) => ({ data: value, success: true as const }),
        },
        onTap: async ({ methods, store }) => {
          store.button.update((snapshot) => ({
            count: ((snapshot as { count?: number } | undefined)?.count ?? 0) + 1,
          }))

          if (targetDeckId) {
            await methods.navigateToDeck(targetDeckId)
          }
        },
        render: ({ button, config, store }) => {
          const count = (store.button.snapshot as { count?: number } | undefined)?.count ?? 0

          return createElement(MountedCounterView, {
            count,
            label: `${config.label}:${button.position}`,
          })
        },
        type: `${label.toLowerCase()}-mounted-counter`,
      })
    }

    const runtime = createDeckRuntime({
      deck: {
        id: "main",
        buttons: [
          {
            config: { label: "Main Counter" },
            definition: createMountedCounterDefinition("main"),
            label: "Main Counter",
            position: 0,
            type: "main-mounted-counter",
          },
          {
            config: { label: "Go Apps" },
            definition: createMountedCounterDefinition("main-nav", "apps"),
            label: "Go Apps",
            position: 1,
            type: "main-nav-mounted-counter",
          },
        ],
      },
      decks: {
        apps: {
          id: "apps",
          buttons: [{
            config: { label: "Back Main" },
            definition: createMountedCounterDefinition("apps-nav", "main"),
            label: "Back Main",
            position: 0,
            type: "apps-nav-mounted-counter",
          }],
        },
        main: {
          id: "main",
          buttons: [
            {
              config: { label: "Main Counter" },
              definition: createMountedCounterDefinition("main"),
              label: "Main Counter",
              position: 0,
              type: "main-mounted-counter",
            },
            {
              config: { label: "Go Apps" },
              definition: createMountedCounterDefinition("main-nav", "apps"),
              label: "Go Apps",
              position: 1,
              type: "main-nav-mounted-counter",
            },
          ],
        },
      },
      subscribeKeyEvents: (listener) => {
        emitEvent = listener
        return () => {}
      },
      theme: createTestTheme(),
    })

    runtime.start()

    let initialMainMountId = -1
    let appsMountId = -1

    await vi.waitFor(() => {
      const parts = getMountedCounterParts(getRenderedButtonHtml(getRenderedButton(runtime, 0)), "Main Counter:0")
      expect(parts.count).toBe(0)
      initialMainMountId = parts.mountId
    })

    emitEvent?.({ keyIndex: 0, type: "down" })
    emitEvent?.({ keyIndex: 0, type: "up" })

    await vi.waitFor(() => {
      const parts = getMountedCounterParts(getRenderedButtonHtml(getRenderedButton(runtime, 0)), "Main Counter:0")
      expect(parts.mountId).toBe(initialMainMountId)
      expect(parts.count).toBe(1)
    })

    emitEvent?.({ keyIndex: 1, type: "down" })
    emitEvent?.({ keyIndex: 1, type: "up" })

    await vi.waitFor(() => {
      expect(runtime.getActiveDeck().id).toBe("apps")
      const parts = getMountedCounterParts(getRenderedButtonHtml(getRenderedButton(runtime, 0)), "Back Main:0")
      expect(parts.count).toBe(0)
      appsMountId = parts.mountId
    })

    emitEvent?.({ keyIndex: 0, type: "down" })
    emitEvent?.({ keyIndex: 0, type: "up" })

    await vi.waitFor(() => {
      expect(runtime.getActiveDeck().id).toBe("main")
      const parts = getMountedCounterParts(getRenderedButtonHtml(getRenderedButton(runtime, 0)), "Main Counter:0")
      expect(parts.mountId).not.toBe(initialMainMountId)
      expect(parts.mountId).not.toBe(appsMountId)
      expect(parts.count).toBe(1)
    })
  })

  it("keeps bundled internal toggle state across deck re-activation in the same runtime", async () => {
    const registry = createBundledAddonRegistry()
    let emitEvent: ((event: StreamDeckKeyEvent) => void) | undefined
    const runtime = createDeckRuntime({
      deck: {
        id: "main",
        buttons: [
          {
            config: { label: "Lamp", mode: "internal", off: { subtitle: "OFF" }, on: { subtitle: "ON" } },
            definition: registry.getButton("toggle")!,
            label: "Lamp",
            position: 0,
            type: "toggle",
          },
          {
            config: { label: "Apps", target_deck: "apps" },
            definition: registry.getButton("change-deck")!,
            label: "Apps",
            position: 1,
            target_deck: "apps",
            type: "change-deck",
          },
        ],
      },
      decks: {
        main: {
          id: "main",
          buttons: [
            {
              config: { label: "Lamp", mode: "internal", off: { subtitle: "OFF" }, on: { subtitle: "ON" } },
              definition: registry.getButton("toggle")!,
              label: "Lamp",
              position: 0,
              type: "toggle",
            },
            {
              config: { label: "Apps", target_deck: "apps" },
              definition: registry.getButton("change-deck")!,
              label: "Apps",
              position: 1,
              target_deck: "apps",
              type: "change-deck",
            },
          ],
        },
        apps: {
          id: "apps",
          buttons: [{
            config: { label: "Main", target_deck: "main" },
            definition: registry.getButton("change-deck")!,
            label: "Main",
            position: 0,
            target_deck: "main",
            type: "change-deck",
          }],
        },
      },
      subscribeKeyEvents: (listener) => {
        emitEvent = listener
        return () => {}
      },
      theme: createTestTheme(),
    })

    runtime.start()

    await vi.waitFor(() => {
      const renderedButton = getRenderedButton(runtime, 0)
      expect(renderedButton).toMatchObject({ background: "#10161f", keyIndex: 0, label: "Lamp" })
      expect(getRenderedButtonHtml(renderedButton)).toContain("OFF")
    })

    emitEvent?.({ keyIndex: 0, type: "down" })
    emitEvent?.({ keyIndex: 0, type: "up" })

    await vi.waitFor(() => {
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 0))).toContain("ON")
    })

    emitEvent?.({ keyIndex: 1, type: "down" })
    emitEvent?.({ keyIndex: 1, type: "up" })

    await vi.waitFor(() => {
      expect(runtime.getActiveDeck().id).toBe("apps")
    })

    emitEvent?.({ keyIndex: 0, type: "down" })
    emitEvent?.({ keyIndex: 0, type: "up" })

    await vi.waitFor(() => {
      expect(runtime.getActiveDeck().id).toBe("main")
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 0))).toContain("ON")
    })
  })

  it("keeps bundled internal toggle state across reconnect-style deck re-activation in the same runtime", async () => {
    const registry = createBundledAddonRegistry()
    let emitEvent: ((event: StreamDeckKeyEvent) => void) | undefined
    const runtime = createDeckRuntime({
      deck: {
        id: "main",
        buttons: [{
          config: { label: "Lamp", mode: "internal", off: { subtitle: "OFF" }, on: { subtitle: "ON" } },
          definition: registry.getButton("toggle")!,
          label: "Lamp",
          position: 0,
          type: "toggle",
        }],
      },
      subscribeKeyEvents: (listener) => {
        emitEvent = listener
        return () => {}
      },
      theme: createTestTheme(),
    })

    runtime.start()

    await vi.waitFor(() => {
      const renderedButton = getRenderedButton(runtime, 0)
      expect(renderedButton).toMatchObject({ background: "#10161f", keyIndex: 0, label: "Lamp" })
      expect(getRenderedButtonHtml(renderedButton)).toContain("OFF")
    })

    emitEvent?.({ keyIndex: 0, type: "down" })
    emitEvent?.({ keyIndex: 0, type: "up" })

    await vi.waitFor(() => {
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 0))).toContain("ON")
    })

    await runtime.activateCurrentDeck()

    await vi.waitFor(() => {
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 0))).toContain("ON")
    })
  })

  it("keeps get-set toggles pending until the first read and ignores taps until truth is known", async () => {
    const registry = createBundledAddonRegistry()
    let emitEvent: ((event: StreamDeckKeyEvent) => void) | undefined
    let schedulerTask: (() => Promise<void>) | undefined
    let statusOutput = "off"
    let releaseFirstRead: (() => void) | undefined
    const firstReadPromise = new Promise<void>((resolve) => {
      releaseFirstRead = resolve
    })
    const executeAction = vi.fn(async (command: string) => {
      if (command === "read-lamp") {
        await firstReadPromise
        return { code: 0, failed: false, signal: undefined, stderr: "", stdout: statusOutput, timedOut: false }
      }

      if (command === "turn-on-lamp") {
        statusOutput = "on"
      }

      return { code: 0, failed: false, signal: undefined, stderr: "", stdout: "", timedOut: false }
    })
    const createScheduler = vi.fn(() => ({
      intervalMs: 500,
      jitterMs: 0,
      scheduleDelay: () => 0,
      start: (tasks: Array<{ id: string; run: () => Promise<void> }>) => {
        schedulerTask = tasks[0]?.run
      },
      stop: vi.fn(),
    }))
    const runtime = createDeckRuntime({
      createScheduler,
      deck: {
        id: "main",
        buttons: [{
          config: {
            get_state_command: "read-lamp",
            label: "Lamp",
            mode: "get-set",
            off: { subtitle: "OFF" },
            on: { subtitle: "ON" },
            set_off_command: "turn-off-lamp",
            set_on_command: "turn-on-lamp",
          },
          definition: registry.getButton("toggle")!,
          interval_ms: 500,
          label: "Lamp",
          position: 0,
          type: "toggle",
        }],
      },
      executeAction,
      subscribeKeyEvents: (listener) => {
        emitEvent = listener
        return () => {}
      },
      theme: createTestTheme(),
    })

    runtime.start()

    await vi.waitFor(() => {
      const renderedButton = getRenderedButton(runtime, 0)
      expect(renderedButton).toMatchObject({ background: "#10161f", keyIndex: 0, label: "Lamp" })
      expect(getRenderedButtonHtml(renderedButton)).toContain("PENDING")
    })

    emitEvent?.({ keyIndex: 0, type: "down" })
    emitEvent?.({ keyIndex: 0, type: "up" })

    expect(executeAction).toHaveBeenCalledTimes(1)
    expect(executeAction).toHaveBeenCalledWith("read-lamp")

    releaseFirstRead?.()

    await schedulerTask?.()

    await vi.waitFor(() => {
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 0))).toContain("OFF")
    })

    emitEvent?.({ keyIndex: 0, type: "down" })
    emitEvent?.({ keyIndex: 0, type: "up" })

    await vi.waitFor(() => {
      expect(executeAction).toHaveBeenCalledWith("turn-on-lamp")
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 0))).toContain("ON")
    })
  })

  it("reconciles toggle-status taps through status_command instead of local inversion", async () => {
    const registry = createBundledAddonRegistry()
    let emitEvent: ((event: StreamDeckKeyEvent) => void) | undefined
    let statusOutput = "off"
    const executeAction = vi.fn(async (command: string) => {
      if (command === "read-lamp") {
        return { code: 0, failed: false, signal: undefined, stderr: "", stdout: statusOutput, timedOut: false }
      }

      if (command === "toggle-lamp") {
        statusOutput = "on"
      }

      return { code: 0, failed: false, signal: undefined, stderr: "", stdout: "", timedOut: false }
    })
    const runtime = createDeckRuntime({
      deck: {
        id: "main",
        buttons: [{
          config: {
            label: "Lamp",
            mode: "toggle-status",
            off: { subtitle: "OFF" },
            on: { subtitle: "ON" },
            status_command: "read-lamp",
            toggle_command: "toggle-lamp",
          },
          definition: registry.getButton("toggle")!,
          label: "Lamp",
          position: 0,
          type: "toggle",
        }],
      },
      executeAction,
      subscribeKeyEvents: (listener) => {
        emitEvent = listener
        return () => {}
      },
      theme: createTestTheme(),
    })

    runtime.start()

    await vi.waitFor(() => {
      const renderedButton = getRenderedButton(runtime, 0)
      expect(renderedButton).toMatchObject({ background: "#10161f", keyIndex: 0, label: "Lamp" })
      expect(getRenderedButtonHtml(renderedButton)).toContain("OFF")
    })

    emitEvent?.({ keyIndex: 0, type: "down" })
    emitEvent?.({ keyIndex: 0, type: "up" })

    await vi.waitFor(() => {
      expect(executeAction.mock.calls.map((call) => call[0])).toEqual(["read-lamp", "toggle-lamp", "read-lamp"])
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 0))).toContain("ON")
    })
  })

  it("allows toggle-status taps before the first status read has resolved", async () => {
    const registry = createBundledAddonRegistry()
    let emitEvent: ((event: StreamDeckKeyEvent) => void) | undefined
    let releaseFirstRead: (() => void) | undefined
    const firstReadPromise = new Promise<void>((resolve) => {
      releaseFirstRead = resolve
    })
    let statusOutput = "on"
    const executeAction = vi.fn(async (command: string) => {
      if (command === "read-lamp") {
        await firstReadPromise
        return { code: 0, failed: false, signal: undefined, stderr: "", stdout: statusOutput, timedOut: false }
      }

      if (command === "toggle-lamp") {
        statusOutput = "off"
      }

      return { code: 0, failed: false, signal: undefined, stderr: "", stdout: "", timedOut: false }
    })
    const runtime = createDeckRuntime({
      deck: {
        id: "main",
        buttons: [{
          config: {
            label: "Lamp",
            mode: "toggle-status",
            off: { subtitle: "OFF" },
            on: { subtitle: "ON" },
            status_command: "read-lamp",
            toggle_command: "toggle-lamp",
          },
          definition: registry.getButton("toggle")!,
          label: "Lamp",
          position: 0,
          type: "toggle",
        }],
      },
      executeAction,
      subscribeKeyEvents: (listener) => {
        emitEvent = listener
        return () => {}
      },
      theme: createTestTheme(),
    })

    runtime.start()

    await vi.waitFor(() => {
      const renderedButton = getRenderedButton(runtime, 0)
      expect(renderedButton).toMatchObject({ background: "#10161f", keyIndex: 0, label: "Lamp" })
      expect(getRenderedButtonHtml(renderedButton)).toContain("PENDING")
    })

    emitEvent?.({ keyIndex: 0, type: "down" })
    emitEvent?.({ keyIndex: 0, type: "up" })
    releaseFirstRead?.()

    await vi.waitFor(() => {
      expect(executeAction.mock.calls.map((call) => call[0])).toContain("toggle-lamp")
      expect(getRenderedButtonHtml(getRenderedButton(runtime, 0))).toContain("OFF")
    })
  })

  it("keeps the settled get-set startup render from being overwritten by the stale deck-wide pending write", async () => {
    const registry = createBundledAddonRegistry()
    const onRenderDeck = vi.fn()
    const onRenderButton = vi.fn()
    const executeAction = vi.fn(async (command: string) => {
      if (command === "read-lamp") {
        return { code: 0, failed: false, signal: undefined, stderr: "", stdout: "off", timedOut: false }
      }

      return { code: 0, failed: false, signal: undefined, stderr: "", stdout: "", timedOut: false }
    })
    const runtime = createDeckRuntime({
      deck: {
        id: "main",
        buttons: [{
          config: {
            get_state_command: "read-lamp",
            label: "Lamp",
            mode: "get-set",
            off: { subtitle: "OFF" },
            on: { subtitle: "ON" },
            set_off_command: "turn-off-lamp",
            set_on_command: "turn-on-lamp",
          },
          definition: registry.getButton("toggle")!,
          label: "Lamp",
          position: 0,
          type: "toggle",
        }],
      },
      executeAction,
      onRenderButton,
      onRenderDeck,
      subscribeKeyEvents: () => () => {},
      theme: createTestTheme(),
    })

    runtime.start()

    await vi.waitFor(() => {
      const renderedButton = getRenderedButton(runtime, 0)
      expect(renderedButton).toMatchObject({ background: "#10161f", keyIndex: 0, label: "Lamp" })
      expect(getRenderedButtonHtml(renderedButton)).toContain("OFF")
    })

    const renderedButton = onRenderButton.mock.calls.at(-1)?.[0]
    expect(renderedButton).toMatchObject({ background: "#10161f", keyIndex: 0, label: "Lamp" })
    expect(getRenderedButtonHtml(renderedButton)).toContain("OFF")

    const renderedDeckButton = onRenderDeck.mock.calls.at(-1)?.[0]?.[0]
    expect(renderedDeckButton).toMatchObject({ background: "#10161f", keyIndex: 0, label: "Lamp" })
    expect(getRenderedButtonHtml(renderedDeckButton)).toContain("OFF")
  })

  it("re-renders pressed frame state on down and returns to idle on up while preserving tap behavior", async () => {
    let emitEvent: ((event: StreamDeckKeyEvent) => void) | undefined
    let taps = 0
    const onRenderDeck = vi.fn()
    const runtime = createDeckRuntime({
      deck: {
        id: "main",
        buttons: [{
          config: { label: "Press Me" },
          definition: {
            configSchema: { parse: (value: unknown) => value, safeParse: (value: unknown) => ({ data: value, success: true as const }) },
            onTap: async () => {
              taps += 1
            },
            render: ({ button }: { button: { position: number } }) => createTextSurface(button.position, "Press Me"),
            type: "pressable-button",
          },
          label: "Press Me",
          position: 0,
          type: "pressable-button",
        }],
      },
      onRenderDeck,
      subscribeKeyEvents: (listener) => {
        emitEvent = listener
        return () => {}
      },
      theme: createTestTheme(),
    })

    runtime.start()

    await vi.waitFor(() => {
      expect(getRenderedButton(runtime, 0)).toMatchObject({ frame_state: "idle", keyIndex: 0, label: "Press Me" })
    })

    emitEvent?.({ keyIndex: 0, type: "down" })

    await vi.waitFor(() => {
      expect(getRenderedButton(runtime, 0)).toMatchObject({ frame_state: "hold", keyIndex: 0, label: "Press Me" })
    })

    emitEvent?.({ keyIndex: 0, type: "up" })

    await vi.waitFor(() => {
      expect(getRenderedButton(runtime, 0)).toMatchObject({ frame_state: "idle", keyIndex: 0, label: "Press Me" })
      expect(taps).toBe(1)
    })

    expect(onRenderDeck.mock.calls.at(-1)?.[0]?.[0]).toMatchObject({ frame_state: "idle", keyIndex: 0, label: "Press Me" })
  })

  it("injects a system-back button at the reserved slot on a deck that has no button there", () => {
    const sessionMonitor = createSessionMonitorDouble({ capability: "supported", state: "unlocked" })
    const runtime = createDeckRuntime({
      addonRegistry: createEmptyAddonRegistry(),
      deck: { buttons: [], id: "main" },
      hostContext: {
        os: { type: "linux", variant: "ubuntu", version: "24.04" },
        session: { capability: "supported", state: "unlocked" },
      },
      sessionMonitor,
      subscribeKeyEvents: () => () => {},
      theme: createTestTheme(),
    })

    runtime.start()

    const reservedButton = runtime.getButton(14)
    expect(reservedButton).toMatchObject({
      id: "system-back",
      position: 14,
      type: "system-back",
    })
  })

  it("does not inject a system-back button on the locked deck", () => {
    const sessionMonitor = createSessionMonitorDouble({ capability: "supported", state: "unlocked" })
    const runtime = createDeckRuntime({
      addonRegistry: createEmptyAddonRegistry(),
      deck: { buttons: [], id: "main" },
      hostContext: {
        os: { type: "linux", variant: "ubuntu", version: "24.04" },
        session: { capability: "supported", state: "unlocked" },
      },
      lockedDeckId: "main",
      sessionMonitor,
      subscribeKeyEvents: () => () => {},
      theme: createTestTheme(),
    })

    runtime.start()

    const reservedButton = runtime.getButton(14)
    expect(reservedButton).toBeUndefined()
  })

  it("does not inject a system-back button on the implicit locked deck", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 6, 12, 0, 0))

    const sessionMonitor = createSessionMonitorDouble({ capability: "supported", state: "unlocked" })
    const runtime = createDeckRuntime({
      addonRegistry: createEmptyAddonRegistry(),
      deck: { buttons: [], id: "main" },
      hostContext: {
        os: { type: "linux", variant: "ubuntu", version: "24.04" },
        session: { capability: "supported", state: "unlocked" },
      },
      sessionMonitor,
      subscribeKeyEvents: () => () => {},
      theme: createTestTheme(),
    })

    runtime.start()

    sessionMonitor.emit({ capability: "supported", state: "locked" })

    await vi.waitFor(() => {
      expect(runtime.getActiveDeck().id).toBe("__sireno_locked_session__")
      const reservedButton = runtime.getButton(14)
      expect(reservedButton).toBeUndefined()
    })
  })

  it("routes the system-back tap through system_back_tap_command when set on the active deck", async () => {
    const executeAction = vi.fn(async () => ({
      code: 0,
      failed: false,
      signal: undefined,
      stderr: "",
      stdout: "",
      timedOut: false,
    }))
    const sessionMonitor = createSessionMonitorDouble({ capability: "supported", state: "unlocked" })
    const listeners: Array<(event: { keyIndex: number; type: "down" | "up" }) => void> = []
    const runtime = createDeckRuntime({
      addonRegistry: createEmptyAddonRegistry(),
      deck: { buttons: [], id: "main", system_back_tap_command: "sireno-navigate --back" },
      executeAction,
      hostContext: {
        os: { type: "linux", variant: "ubuntu", version: "24.04" },
        session: { capability: "supported", state: "unlocked" },
      },
      sessionMonitor,
      subscribeKeyEvents: (listener) => {
        listeners.push(listener)
        return () => {}
      },
      theme: createTestTheme(),
    })

    runtime.start()
    const reservedButton = runtime.getButton(14)
    expect(reservedButton).toMatchObject({ id: "system-back", position: 14, type: "system-back" })
    for (const listener of listeners) {
      listener({ keyIndex: 14, type: "down" })
      listener({ keyIndex: 14, type: "up" })
    }
    await vi.waitFor(() => {
      expect(executeAction).toHaveBeenCalledWith("sireno-navigate --back")
    })
  })

  it("routes the system-back press through system_back_hold_command when set on the active deck", async () => {
    const executeAction = vi.fn(async () => ({
      code: 0,
      failed: false,
      signal: undefined,
      stderr: "",
      stdout: "",
      timedOut: false,
    }))
    const sessionMonitor = createSessionMonitorDouble({ capability: "supported", state: "unlocked" })
    const listeners: Array<(event: { keyIndex: number; type: "down" | "up" }) => void> = []
    const runtime = createDeckRuntime({
      addonRegistry: createEmptyAddonRegistry(),
      deck: { buttons: [], id: "main", system_back_hold_command: "sireno-navigate --home" },
      executeAction,
      hostContext: {
        os: { type: "linux", variant: "ubuntu", version: "24.04" },
        session: { capability: "supported", state: "unlocked" },
      },
      sessionMonitor,
      subscribeKeyEvents: (listener) => {
        listeners.push(listener)
        return () => {}
      },
      theme: createTestTheme(),
    })

    runtime.start()
    for (const listener of listeners) {
      listener({ keyIndex: 14, type: "down" })
    }
    await vi.waitFor(() => {
      expect(executeAction).toHaveBeenCalledWith("sireno-navigate --home")
    })
  })
})
