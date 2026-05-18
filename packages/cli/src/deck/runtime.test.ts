import { join } from "node:path"

import { createElement } from "react"
import { describe, expect, it, vi } from "vitest"

import { createBundledAddonRegistry, loadConfig } from "../config/loader.js"
import { validateConfig } from "../core/schemas.js"
import { createDeckRuntime } from "./runtime.js"

import type { StreamDeckKeyEvent } from "../device/stream-deck.js"
import type { PollingScheduler } from "../render/scheduler.js"
import type { SessionMonitor, SessionSnapshot } from "../system/session-monitor.js"

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
  type: "display-text",
})

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
      expect(onRenderDeck).toHaveBeenCalledWith([{ background: "#10161f", keyIndex: 0, label: "Clock" }])
      expect(runtime.getRenderButtons()).toEqual([{ background: "#10161f", keyIndex: 0, label: "Clock" }])
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
      expect(onRenderButton).toHaveBeenCalledWith({ background: "#10161f", keyIndex: 1, label: "Updated" })
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
            createInstance: ({ button, hostContext: receivedHostContext }: {
              button: { position: number }
              hostContext: typeof hostContext
            }) => {
              observedHostContext(receivedHostContext)

              return {
                render: () => createElement("deck-button", { keyIndex: button.position, label: "Clock" }),
              }
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
      expect(onRenderDeck).toHaveBeenCalledWith([
        { background: "#112233", keyIndex: 0, label: "Deck" },
        { background: "#445566", keyIndex: 1, label: "Button" },
      ])
      expect(runtime.getRenderButtons()).toEqual([
        { background: "#112233", keyIndex: 0, label: "Deck" },
        { background: "#445566", keyIndex: 1, label: "Button" },
      ])
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
      expect(onRenderDeck).toHaveBeenCalledWith([{ background: "#10161f", keyIndex: 0, label: "Clock" }])
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
            createInstance: ({ button, config, methods }: {
              button: { position: number }
              config: { emoji: string; label: string; select_command: string }
              methods: { runCommand: (command: string) => Promise<unknown> }
            }) => ({
              onTap: async () => {
                await methods.runCommand(config.select_command.replaceAll("{{emoji}}", config.emoji))
              },
              render: () => createElement("deck-button", { keyIndex: button.position, label: config.label }),
            }),
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
            createInstance: ({ button, methods }: {
              button: { position: number }
              methods: { runCommand: (command: string) => Promise<unknown> }
            }) => ({
              refresh: async () => {
                await methods.runCommand("printf '%s|%s' '{{host.os.type}}' '{{host.session.state}}'")
              },
              render: () => createElement("deck-button", { keyIndex: button.position, label: "Status" }),
            }),
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
      join(process.cwd(), "fixtures/phase-11/config.host-context.yml"),
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
      expect(runtime.getRenderButtons()).toContainEqual({ background: "#10161f", keyIndex: 0, label: "linux / ubuntu / unknown" })
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
    const events: StreamDeckKeyEvent[] = []
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
        queueMicrotask(() => {
          for (const event of events) {
            listener(event)
          }
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
      expect(runtime.getActiveDeck().id).toBe("emoji")
      expect(runtime.getRenderButtons()[0]).toMatchObject({ keyIndex: 0, label: "Favorites" })
    })

    events.push({ keyIndex: 0, type: "down" }, { keyIndex: 0, type: "up" })
    runtime.stop()

    const subscribedEvents: StreamDeckKeyEvent[] = [...events, { keyIndex: 0, type: "down" }, { keyIndex: 0, type: "up" }]
    const navigatedRuntime = createDeckRuntime({
      deck: config.decks[config.main_deck]!,
      decks: config.decks,
      executeAction,
      onRenderDeck,
      subscribeKeyEvents: (listener) => {
        queueMicrotask(() => {
          for (const event of subscribedEvents) {
            listener(event)
          }
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

    navigatedRuntime.start()

    await vi.waitFor(() => {
      expect(navigatedRuntime.getActiveDeck().id).toBe("emoji-favorites")
      expect(navigatedRuntime.getRenderButtons()[0]).toMatchObject({
        icon: expect.stringContaining("emoji-grin.svg"),
        keyIndex: 0,
        label: "GRIN",
        subtitle: "Favorites",
      })
    })

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
      expect(runtime.getRenderButtons()).toEqual([{ background: "#10161f", keyIndex: 0, label: "Clock" }])
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
          definition: {
            configSchema: { parse: (value: unknown) => value, safeParse: (value: unknown) => ({ data: value, success: true as const }) },
            createInstance: ({ button, methods }: { button: { position: number }; methods: { navigateToDeck: (deckId: string) => Promise<void> } }) => ({
              onTap: async () => { await methods.navigateToDeck("apps") },
              render: () => createElement("deck-button", { keyIndex: button.position, label: "Go to Apps" }),
            }),
            type: "nav-main-apps",
          },
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
            definition: {
              configSchema: { parse: (value: unknown) => value, safeParse: (value: unknown) => ({ data: value, success: true as const }) },
              createInstance: ({ button, methods }: { button: { position: number }; methods: { navigateToDeck: (deckId: string) => Promise<void> } }) => ({
                onTap: async () => { await methods.navigateToDeck("apps") },
                render: () => createElement("deck-button", { keyIndex: button.position, label: "Go to Apps" }),
              }),
              type: "nav-main-apps",
            },
            label: "Go to Apps",
            position: 0,
            type: "nav-main-apps",
          }],
        },
        apps: {
          id: "apps",
          buttons: [{
            config: { label: "Open Settings" },
            definition: {
              configSchema: { parse: (value: unknown) => value, safeParse: (value: unknown) => ({ data: value, success: true as const }) },
              createInstance: ({ button, methods }: { button: { position: number }; methods: { navigateToDeck: (deckId: string) => Promise<void> } }) => ({
                onTap: async () => { await methods.navigateToDeck("settings") },
                render: () => createElement("deck-button", { keyIndex: button.position, label: "Open Settings" }),
              }),
              type: "nav-apps-settings",
            },
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
      expect(runtime.getRenderButtons()).toContainEqual({ background: "#10161f", keyIndex: 0, label: "Settings" })
    })

    sessionMonitor.emit({ capability: "supported", state: "locked" })

    await vi.waitFor(() => {
      expect(runtime.getActiveDeck().id).toBe("locked")
      expect(runtime.getRenderButtons()).toContainEqual({ background: "#10161f", keyIndex: 0, label: "Locked Deck" })
    })

    sessionMonitor.emit({ capability: "supported", state: "unlocked" })

    await vi.waitFor(() => {
      expect(runtime.getActiveDeck().id).toBe("settings")
      expect(runtime.getRenderButtons()).toContainEqual({ background: "#10161f", keyIndex: 0, label: "Settings" })
    })
  })

  it("uses the implicit built-in date-time fallback when no locked deck is configured", async () => {
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
      expect(runtime.getButton(0)).toMatchObject({
        config: {
          date_format: "MM/DD/YYYY",
          time_format: "HH:mm:ss",
          variant: "date-time",
        },
        type: "date-time",
      })
      expect(runtime.getRenderButtons()[0]?.label).toMatch(/\d{2}\/\d{2}\/\d{4}/)
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
            createInstance: ({ button, methods }: { button: { position: number }; methods: { navigateToDeck: (deckId: string) => Promise<void> } }) => ({
              onTap: async () => { await methods.navigateToDeck("settings") },
              render: () => createElement("deck-button", { keyIndex: button.position, label: "Settings" }),
            }),
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
              createInstance: ({ button, methods }: { button: { position: number }; methods: { navigateToDeck: (deckId: string) => Promise<void> } }) => ({
                onTap: async () => { await methods.navigateToDeck("settings") },
                render: () => createElement("deck-button", { keyIndex: button.position, label: "Settings" }),
              }),
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
              createInstance: ({ button, methods }: { button: { position: number }; methods: { navigateToDeck: (deckId: string) => Promise<void> } }) => ({
                onTap: async () => { await methods.navigateToDeck("locked-tools") },
                render: () => createElement("deck-button", { keyIndex: button.position, label: "Locked Tools" }),
              }),
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
      expect(runtime.getRenderButtons()).toContainEqual({ background: "#10161f", keyIndex: 0, label: "Settings Deck" })
    })
  })

  it("keeps the committed Phase 11 locked-session fixture restorable across lock and unlock transitions", async () => {
    const config = loadConfig(
      join(process.cwd(), "fixtures/phase-11/config.locked-session.yml"),
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
      expect(runtime.getRenderButtons()).toContainEqual({ background: "#10161f", keyIndex: 0, label: "Session unlocked" })
    })

    sessionMonitor.emit({ capability: "supported", state: "locked" })

    await vi.waitFor(() => {
      expect(runtime.getActiveDeck().id).toBe("locked")
      expect(runtime.getRenderButtons()).toContainEqual({ background: "#10161f", keyIndex: 0, label: "Locked on linux" })
    })

    sessionMonitor.emit({ capability: "supported", state: "unlocked" })

    await vi.waitFor(() => {
      expect(runtime.getActiveDeck().id).toBe("settings")
      expect(runtime.getRenderButtons()).toContainEqual({ background: "#10161f", keyIndex: 0, label: "Session unlocked" })
    })
  })
})
