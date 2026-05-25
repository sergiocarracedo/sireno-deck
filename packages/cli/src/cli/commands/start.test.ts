import { resolve } from "node:path"

import { createElement } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { createAddonRegistry } from "../../addon/registry.js"

const blankRemainingKeys = vi.fn()
const createBrowserRenderer = vi.fn()
const createStreamDeckLifecycle = vi.fn()
const createVirtualStreamDeckLifecycle = vi.fn()
const replayLastRenderedBuffers = vi.fn()
const watch = vi.fn()
const writeKeyBuffer = vi.fn(async () => {})
const createBundledAddonRegistry = vi.fn(() => ({ bundled: true }))
const loadBootstrapConfig = vi.fn()
const loadConfigWithSources = vi.fn()
const loadConfiguredAddons = vi.fn()
const resolveHostContext = vi.fn()
const createSessionMonitor = vi.fn()
const resolveTheme = vi.fn()

class StreamDeckSelectionError extends Error {}

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>()

  return {
    ...actual,
    watch,
  }
})

vi.mock("../../config/loader.js", () => ({
  createBundledAddonRegistry,
  loadBootstrapConfig,
  loadConfigWithSources,
}))

vi.mock("../../config/theme.js", () => ({
  resolveTheme,
}))

vi.mock("../../addon/loader.js", () => ({
  loadConfiguredAddons,
}))

vi.mock("../../device/stream-deck.js", () => ({
  blankRemainingKeys,
  createStreamDeckLifecycle,
  createVirtualStreamDeckLifecycle,
  replayLastRenderedBuffers,
  StreamDeckSelectionError,
  writeKeyBuffer,
}))

vi.mock("../../render/browser-renderer.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../render/browser-renderer.js")>()

  return {
    ...actual,
    createBrowserRenderer,
  }
})

vi.mock("../../system/host-context.js", () => ({
  resolveHostContext,
}))

vi.mock("../../system/session-monitor.js", () => ({
  createSessionMonitor,
}))

describe("loadRuntimeConfig", () => {
  const phase23FixtureRoot = resolve(import.meta.dirname, "../../../fixtures/phase-23/local-raw-addon")
  const supportedSessionMonitor = {
    getSnapshot: vi.fn(() => ({ capability: "supported", state: "unknown" })),
    stop: vi.fn(),
    subscribe: vi.fn(),
  }
  const unsupportedSessionMonitor = {
    getSnapshot: vi.fn(() => ({ capability: "unsupported", state: "unknown" })),
    stop: vi.fn(),
    subscribe: vi.fn(),
  }

  beforeEach(() => {
    blankRemainingKeys.mockReset()
    createBrowserRenderer.mockReset()
    createStreamDeckLifecycle.mockReset()
    createVirtualStreamDeckLifecycle.mockReset()
    watch.mockReset()
    replayLastRenderedBuffers.mockReset()
    writeKeyBuffer.mockReset()
    createBundledAddonRegistry.mockClear()
    loadBootstrapConfig.mockReset()
    loadConfigWithSources.mockReset()
    loadConfiguredAddons.mockReset()
    resolveHostContext.mockReset()
    createSessionMonitor.mockReset()
    resolveTheme.mockReset()
    supportedSessionMonitor.getSnapshot.mockClear()
    unsupportedSessionMonitor.getSnapshot.mockClear()
  })

  it("passes disabled illustrative addons through without logging startup warnings", async () => {
    createSessionMonitor.mockResolvedValue(supportedSessionMonitor)
    resolveHostContext.mockResolvedValue({ os: { type: "linux", variant: "ubuntu", version: "24.04" }, session: { capability: "supported", state: "unknown" } })
    loadBootstrapConfig.mockReturnValue({
      config: {
        addons: [
          { enabled: false, name: "local-clock-addon", path: "addons/local-clock-addon", source: "local" },
          { enabled: false, name: "@sireno-deck/community-addon", source: "npm" },
        ],
      },
      cwd: "/tmp/project",
      filePath: "/tmp/project/config.yml",
    })
    loadConfiguredAddons.mockResolvedValue({
      loaded: [],
      warnings: [],
    })
    loadConfigWithSources.mockReturnValue({
      config: { main_deck: "main", theme: "dark" },
      filePath: "/tmp/project/config.yml",
      filePaths: ["/tmp/project/config.yml"],
    })
    resolveTheme.mockResolvedValue({ filePaths: ["/tmp/project/themes/default/index.js"] })

    const { loadRuntimeConfig } = await import("./start.js")
    const logger = { warn: vi.fn() } as const

    await loadRuntimeConfig({ config: "/tmp/project/config.yml", logger: logger as never })

    expect(resolveHostContext).toHaveBeenCalledWith(undefined, { capability: "supported", state: "unknown" })
    expect(loadBootstrapConfig).toHaveBeenCalledWith("/tmp/project/config.yml", {
      os: { type: "linux", variant: "ubuntu", version: "24.04" },
      session: { capability: "supported", state: "unknown" },
    })
    expect(loadConfiguredAddons).toHaveBeenCalledWith({
      addons: [
        { enabled: false, name: "local-clock-addon", path: "addons/local-clock-addon", source: "local" },
        { enabled: false, name: "@sireno-deck/community-addon", source: "npm" },
      ],
      cwd: "/tmp/project",
      registry: { bundled: true },
    })
    expect(loadConfigWithSources).toHaveBeenCalledWith("/tmp/project/config.yml", { bundled: true }, {
      os: { type: "linux", variant: "ubuntu", version: "24.04" },
      session: { capability: "supported", state: "unknown" },
    })
    expect(resolveTheme).toHaveBeenCalledWith("dark", { baseDirectory: "/tmp/project" })
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it("logs warnings for recoverable addon load failures and keeps loading config", async () => {
    createSessionMonitor.mockResolvedValue(supportedSessionMonitor)
    resolveHostContext.mockResolvedValue({ os: { type: "linux", variant: "ubuntu", version: "24.04" }, session: { capability: "supported", state: "unknown" } })
    loadBootstrapConfig.mockReturnValue({
      config: { addons: [{ enabled: true, name: "broken-addon", source: "local" }] },
      cwd: "/tmp/project",
      filePath: "/tmp/project/config.yml",
    })
    loadConfiguredAddons.mockResolvedValue({
      loaded: [],
      warnings: [{ addonName: "broken-addon", reason: "broken import" }],
    })
    loadConfigWithSources.mockReturnValue({
      config: { main_deck: "main", theme: "dark" },
      filePath: "/tmp/project/config.yml",
      filePaths: ["/tmp/project/config.yml", "/tmp/project/decks/main.yml"],
    })
    resolveTheme.mockResolvedValue({ filePaths: ["/tmp/project/themes/default/index.js", "/tmp/project/themes/default/manifest.yml"] })

    const { loadRuntimeConfig } = await import("./start.js")
    const logger = { warn: vi.fn() } as const

    const result = await loadRuntimeConfig({ config: "/tmp/project/config.yml", logger: logger as never })

    expect(createBundledAddonRegistry).toHaveBeenCalledTimes(1)
    expect(loadConfiguredAddons).toHaveBeenCalledWith({
      addons: [{ enabled: true, name: "broken-addon", source: "local" }],
      cwd: "/tmp/project",
      registry: { bundled: true },
    })
    expect(logger.warn).toHaveBeenCalledWith(
      { addonName: "broken-addon", reason: "broken import" },
      "skipping addon after startup warning",
    )
    expect(loadConfigWithSources).toHaveBeenCalledWith("/tmp/project/config.yml", { bundled: true }, {
      os: { type: "linux", variant: "ubuntu", version: "24.04" },
      session: { capability: "supported", state: "unknown" },
    })
    expect(result.config).toEqual({ main_deck: "main", theme: "dark" })
    expect(result.configDirectory).toBe("/tmp/project")
    expect(result.filePaths).toEqual([
      "/tmp/project/config.yml",
      "/tmp/project/decks/main.yml",
      "/tmp/project/themes/default/index.js",
      "/tmp/project/themes/default/manifest.yml",
    ])
  })

  it("warns once when session lock monitoring is unsupported on the current host", async () => {
    createSessionMonitor.mockResolvedValue(unsupportedSessionMonitor)
    resolveHostContext.mockResolvedValue({ os: { type: "macos", variant: "unknown", version: "14.0" }, session: { capability: "unsupported", state: "unknown" } })
    loadBootstrapConfig.mockReturnValue({
      config: { addons: [] },
      cwd: "/tmp/project",
      filePath: "/tmp/project/config.yml",
    })
    loadConfiguredAddons.mockResolvedValue({
      loaded: [],
      warnings: [],
    })
    loadConfigWithSources.mockReturnValue({
      config: { main_deck: "main", theme: "dark" },
      filePath: "/tmp/project/config.yml",
      filePaths: ["/tmp/project/config.yml"],
    })
    resolveTheme.mockResolvedValue({ filePaths: ["/tmp/project/themes/default/index.js"] })

    const { loadRuntimeConfig } = await import("./start.js")
    const logger = { warn: vi.fn() } as const

    const result = await loadRuntimeConfig({ config: "/tmp/project/config.yml", logger: logger as never })

    expect(logger.warn).toHaveBeenCalledWith(
      { platform: process.platform },
      "session lock monitoring unavailable on this host; continuing without lock-aware deck switching",
    )
    expect(result.hostContext).toEqual({
      os: { type: "macos", variant: "unknown", version: "14.0" },
      session: { capability: "unsupported", state: "unknown" },
    })
    expect(result.sessionMonitor).toBe(unsupportedSessionMonitor)
  })

  it("stops before swapping global asset resolution when theme loading fails", async () => {
    createSessionMonitor.mockResolvedValue(supportedSessionMonitor)
    resolveHostContext.mockResolvedValue({ os: { type: "linux", variant: "ubuntu", version: "24.04" }, session: { capability: "supported", state: "unknown" } })
    loadBootstrapConfig.mockReturnValue({
      config: { addons: [] },
      cwd: "/tmp/project",
      filePath: "/tmp/project/config.yml",
    })
    loadConfiguredAddons.mockResolvedValue({ loaded: [], warnings: [] })
    loadConfigWithSources.mockReturnValue({
      config: { main_deck: "main", theme: "dark" },
      filePath: "/tmp/project/config.yml",
      filePaths: ["/tmp/project/config.yml"],
    })
    resolveTheme.mockRejectedValue(new Error("broken theme runtime"))

    const { loadRuntimeConfig } = await import("./start.js")

    await expect(loadRuntimeConfig({ config: "/tmp/project/config.yml", logger: { warn: vi.fn() } as never })).rejects.toThrow("broken theme runtime")
  })

  it("loads a local raw .tsx addon fixture through the normal startup config path", async () => {
    const registry = createAddonRegistry()
    const actualLoader = await vi.importActual<typeof import("../../addon/loader.js")>("../../addon/loader.js")

    createSessionMonitor.mockResolvedValue(supportedSessionMonitor)
    resolveHostContext.mockResolvedValue({ os: { type: "linux", variant: "ubuntu", version: "24.04" }, session: { capability: "supported", state: "unknown" } })
    createBundledAddonRegistry.mockReturnValue(registry)
    loadConfiguredAddons.mockImplementation((options) => actualLoader.loadConfiguredAddons(options))
    loadBootstrapConfig.mockReturnValue({
      config: {
        addons: [{ enabled: true, name: "phase-23-local-raw-addon", path: phase23FixtureRoot, source: "local" }],
      },
      cwd: "/tmp/project",
      filePath: "/tmp/project/config.yml",
    })
    loadConfigWithSources.mockReturnValue({
      config: { main_deck: "main", theme: "dark" },
      filePath: "/tmp/project/config.yml",
      filePaths: ["/tmp/project/config.yml"],
    })
    resolveTheme.mockResolvedValue({ filePaths: ["/tmp/project/themes/default/index.js"] })

    const { loadRuntimeConfig } = await import("./start.js")

    const result = await loadRuntimeConfig({ config: "/tmp/project/config.yml", logger: { warn: vi.fn() } as never })

    expect(loadConfiguredAddons).toHaveBeenCalledWith({
      addons: [{ enabled: true, name: "phase-23-local-raw-addon", path: phase23FixtureRoot, source: "local" }],
      cwd: "/tmp/project",
      registry,
    })
    expect(result.registry.getButton("phase-23-local-raw-button")?.type).toBe("phase-23-local-raw-button")
  })
})

beforeEach(() => {
  blankRemainingKeys.mockReset()
  createBrowserRenderer.mockReset()
  createStreamDeckLifecycle.mockReset()
  createVirtualStreamDeckLifecycle.mockReset()
  watch.mockReset()
  replayLastRenderedBuffers.mockReset()
  writeKeyBuffer.mockReset()
  createBundledAddonRegistry.mockReset()
  loadBootstrapConfig.mockReset()
  loadConfigWithSources.mockReset()
  loadConfiguredAddons.mockReset()
  resolveHostContext.mockReset()
  createSessionMonitor.mockReset()
  resolveTheme.mockReset()
})

describe("watchConfigFiles", () => {
  it("watches each config file once and debounces reload callbacks", async () => {
    vi.useFakeTimers()
    const closes: Array<() => void> = []
    const listeners = new Map<string, () => void>()
    watch.mockImplementation((filePath: string, _options: unknown, listener: () => void) => {
      listeners.set(filePath, listener)
      const close = vi.fn()
      closes.push(close)
      return { close }
    })

    const { watchConfigFiles } = await import("./start.js")
    const onChange = vi.fn()
    const stopWatching = watchConfigFiles([
      "/tmp/project/config.yml",
      "/tmp/project/config.yml",
      "/tmp/project/decks/main.yml",
    ], onChange)

    expect(watch).toHaveBeenCalledTimes(2)

    listeners.get("/tmp/project/config.yml")?.()
    listeners.get("/tmp/project/decks/main.yml")?.()
    await vi.advanceTimersByTimeAsync(74)
    expect(onChange).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    expect(onChange).toHaveBeenCalledTimes(1)

    stopWatching()
    expect(closes).toHaveLength(2)
    expect(closes.every((close) => vi.mocked(close).mock.calls.length === 1)).toBe(true)
    vi.useRealTimers()
  })
})

describe("restoreReloadNavigation", () => {
  it("falls back from full stack to active deck to main deck", async () => {
    const restoreStack = vi.fn(async (stackSnapshot?: readonly string[]) => {
      const stack = stackSnapshot ? [...stackSnapshot] : []

      if (stack.length === 3 || stack[0] === "settings") {
        throw new Error("missing deck")
      }
    })
    const runtime = { restoreStack } as never

    const { restoreReloadNavigation } = await import("./start.js")

    await restoreReloadNavigation(runtime, ["main", "apps", "settings"], "settings", "main")

    expect(restoreStack.mock.calls).toEqual([[["main", "apps", "settings"]], [["settings"]], [["main"]]])
  })
})

describe("createTemporaryConfigErrorLines", () => {
  it("formats a compact runtime-owned error summary from config validation failures", async () => {
    const { ConfigValidationError } = await import("../../core/schemas.js")
    const { createTemporaryConfigErrorLines } = await import("./start.js")

    const lines = createTemporaryConfigErrorLines(
      new ConfigValidationError(
        "Unknown button type 'broken'",
        "/tmp/project/decks/main.yml",
        8,
        "Register 'broken' before using it in config.yml.",
      ),
    )

    expect(lines).toEqual([
      "main.yml:8",
      "Unknown button type 'broken'",
      "Register 'broken' before using it in config.yml.",
    ])
  })
})

describe("isDomRenderButton", () => {
  it("detects runtime render outputs that carry DOM content", async () => {
    const { isDomRenderButton } = await import("./start.js")

    expect(isDomRenderButton({ content: { type: "div" }, keyIndex: 0 } as never)).toBe(true)
    expect(isDomRenderButton({ keyIndex: 0, label: "Clock" })).toBe(false)
  })
})

describe("ensureBrowserRenderer", () => {
  it("fails honestly when the browser renderer cannot start", async () => {
    const start = vi.fn(async () => {
      throw new Error("missing chromium")
    })
    const close = vi.fn(async () => {})
    createBrowserRenderer.mockReturnValue({ close, start })

    const { ensureBrowserRenderer } = await import("./start.js")

    await expect(ensureBrowserRenderer(null, 15)).rejects.toThrow("missing chromium")
    expect(createBrowserRenderer).toHaveBeenCalledWith({ keyCount: 15 })
    expect(close).toHaveBeenCalledTimes(1)
  })
})

describe("renderRuntimeDeckSurface", () => {
  beforeEach(() => {
    createBrowserRenderer.mockReset()
    writeKeyBuffer.mockReset()
  })

  it("rejects decks that are not fully DOM-backed", async () => {
    const browserRenderer = {
      captureKeyBuffers: vi.fn(),
      close: vi.fn(),
      start: vi.fn(),
      updateDeck: vi.fn(),
    }
    const connection = { info: { keyCount: 3 } }
    const logger = { info: vi.fn() } as const
    const { renderRuntimeDeckSurface } = await import("./start.js")

    await expect(renderRuntimeDeckSurface(
      connection as never,
      [
        { content: { type: "div" }, keyIndex: 0, label: "DOM Clock" } as never,
        { keyIndex: 1, label: "Legacy Clock" },
      ],
      browserRenderer as never,
      logger as never,
    )).rejects.toThrow("Runtime deck rendering must provide DOM-backed button content")

    expect(browserRenderer.updateDeck).not.toHaveBeenCalled()
    expect(writeKeyBuffer).not.toHaveBeenCalled()
  })

  it("renders all-DOM decks through the browser-backed path", async () => {
    const browserRenderer = {
      captureKeyBuffers: vi.fn(async () => new Map([[0, Buffer.from("dom")]])),
      close: vi.fn(),
      start: vi.fn(),
      updateDeck: vi.fn(async () => {}),
    }
    const connection = { info: { keyCount: 1 } }
    const logger = { info: vi.fn() } as const
    const { renderRuntimeDeckSurface } = await import("./start.js")

    await renderRuntimeDeckSurface(
      connection as never,
      [{ content: createElement("div", null, "DOM Clock"), keyIndex: 0, label: "DOM Clock" } as never],
      browserRenderer as never,
      logger as never,
    )

    expect(browserRenderer.updateDeck).toHaveBeenCalledTimes(1)
    expect(browserRenderer.captureKeyBuffers).toHaveBeenCalledTimes(1)
    expect(writeKeyBuffer).toHaveBeenCalledTimes(1)
  })
})

describe("startDaemon", () => {
  it("exits honestly when the browser renderer cannot start", async () => {
    const connection = {
      device: { clearPanel: vi.fn(async () => {}) },
      info: { keyCount: 15, model: "XL", serialNumber: "abc" },
    }
    const lifecycle = {
      close: vi.fn(async () => {}),
      getConnection: vi.fn(() => connection),
      start: vi.fn(async () => connection),
      subscribeKeyEvents: vi.fn(() => () => {}),
    }
    const sessionMonitor = {
      getSnapshot: vi.fn(() => ({ capability: "supported", state: "unknown" })),
      stop: vi.fn(async () => {}),
      subscribe: vi.fn(() => () => {}),
    }
    createStreamDeckLifecycle.mockReturnValue(lifecycle)
    createSessionMonitor.mockResolvedValue(sessionMonitor)
    resolveHostContext.mockResolvedValue({ os: { type: "linux", variant: "ubuntu", version: "24.04" }, session: { capability: "supported", state: "unknown" } })
    loadBootstrapConfig.mockReturnValue({
      config: { addons: [] },
      cwd: "/tmp/project",
      filePath: "/tmp/project/config.yml",
    })
    loadConfiguredAddons.mockResolvedValue({ loaded: [], warnings: [] })
    loadConfigWithSources.mockReturnValue({
      config: {
        decks: { main: { buttons: [], id: "main" } },
        main_deck: "main",
        theme: "dark",
      },
      filePath: "/tmp/project/config.yml",
      filePaths: ["/tmp/project/config.yml"],
    })
    resolveTheme.mockResolvedValue({
      accent: "#f59e0b",
      background: "#10161f",
      buttonFrame: vi.fn(),
      danger: "#fb7185",
      filePaths: ["/tmp/project/themes/default/index.js"],
      foreground: "#eef2f7",
      name: "dark",
      primary: "#7dd3fc",
      rootDir: "/tmp/project/themes/default",
      stylesheets: [],
      success: "#34d399",
    })
    createBrowserRenderer.mockReturnValue({
      close: vi.fn(async () => {}),
      start: vi.fn(async () => {
        throw new Error("missing chromium")
      }),
    })
    resolveTheme.mockResolvedValue({
      accent: "#f59e0b",
      background: "#10161f",
      buttonFrame: vi.fn(),
      danger: "#fb7185",
      filePaths: ["/tmp/project/themes/default/index.js"],
      foreground: "#eef2f7",
      name: "dark",
      primary: "#7dd3fc",
      rootDir: "/tmp/project/themes/default",
      stylesheets: [],
      success: "#34d399",
    })

    const { startDaemon } = await import("./start.js")
    const logger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() } as const

    await expect(startDaemon({ logger: logger as never })).rejects.toThrow("missing chromium")
  })
})

describe("startEmulatorSession", () => {
  it("starts a hardware-free emulator session and serves the current deck surface locally", async () => {
    const lifecycle = {
      close: vi.fn(async () => {}),
      emitKeyEvent: vi.fn(),
      getConnection: vi.fn(() => ({ info: { keyCount: 15, model: "Virtual Stream Deck 15", serialNumber: "virtual-15" } })),
      start: vi.fn(async () => ({ info: { keyCount: 15, model: "Virtual Stream Deck 15", serialNumber: "virtual-15" } })),
      subscribeKeyEvents: vi.fn(() => () => {}),
    }
    const sessionMonitor = {
      getSnapshot: vi.fn(() => ({ capability: "supported", state: "unknown" })),
      stop: vi.fn(async () => {}),
      subscribe: vi.fn(() => () => {}),
    }
    const browserRenderer = {
      close: vi.fn(async () => {}),
      start: vi.fn(async () => {}),
      updateDeck: vi.fn(async () => {}),
    }
    createVirtualStreamDeckLifecycle.mockReturnValue(lifecycle)
    createBrowserRenderer.mockReturnValue(browserRenderer)
    createSessionMonitor.mockResolvedValue(sessionMonitor)
    resolveHostContext.mockResolvedValue({ os: { type: "linux", variant: "ubuntu", version: "24.04" }, session: { capability: "supported", state: "unknown" } })
    loadBootstrapConfig.mockReturnValue({
      config: { addons: [] },
      cwd: "/tmp/project",
      filePath: "/tmp/project/config.yml",
    })
    loadConfiguredAddons.mockResolvedValue({ loaded: [], warnings: [] })
    loadConfigWithSources.mockReturnValue({
      config: {
        decks: {
          main: {
            buttons: [{
              config: { label: "Clock" },
              definition: {
                configSchema: { parse: (value: unknown) => value, safeParse: (value: unknown) => ({ data: value, success: true as const }) },
                createInstance: () => ({ render: () => createElement("div", null, "Clock") }),
                type: "dom-button",
              },
              label: "Clock",
              position: 0,
              type: "dom-button",
            }],
            id: "main",
          },
        },
        main_deck: "main",
        theme: "dark",
      },
      filePath: "/tmp/project/config.yml",
      filePaths: ["/tmp/project/config.yml"],
    })
    resolveTheme.mockResolvedValue({
      accent: "#f59e0b",
      background: "#10161f",
      buttonFrame: vi.fn(({ children }: { children: unknown }) => children),
      danger: "#fb7185",
      filePaths: ["/tmp/project/themes/default/index.js"],
      foreground: "#eef2f7",
      name: "dark",
      primary: "#7dd3fc",
      rootDir: "/tmp/project/themes/default",
      stylesheets: [],
      success: "#34d399",
    })

    const { startEmulatorSession } = await import("./start.js")
    const session = await startEmulatorSession({ logger: { info: vi.fn(), warn: vi.fn() } as never, port: 0 })

    expect(createStreamDeckLifecycle).not.toHaveBeenCalled()
    expect(createVirtualStreamDeckLifecycle).toHaveBeenCalledWith({
      keyCount: 15,
      model: "Stream Deck MK.2",
    })
    expect(browserRenderer.start).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => {
      expect(browserRenderer.updateDeck).toHaveBeenCalledTimes(1)
    })

    const stateResponse = await fetch(`${session.url}/__sireno/state`)
    const state = await stateResponse.json()
    const pageResponse = await fetch(session.url)
    const pageHtml = await pageResponse.text()
    const deckResponse = await fetch(`${session.url}/__sireno/deck`)
    const deckHtml = await deckResponse.text()

    expect(stateResponse.status).toBe(200)
    expect(state).toMatchObject({
      activeDeckId: "main",
      device: "Stream Deck MK.2",
      selectedKeyCount: 15,
      status: "ready",
      version: 1,
    })
    expect(pageResponse.status).toBe(200)
    expect(pageHtml).toContain("Browser Deck Emulator")
    expect(pageHtml).toContain("Local Emulator")
    expect(deckResponse.status).toBe(200)
    expect(deckHtml).toContain("deck-root")
    expect(deckHtml).toContain("Clock")

    await session.close()
    expect(browserRenderer.close).toHaveBeenCalledTimes(1)
    expect(sessionMonitor.stop).toHaveBeenCalledTimes(1)
    expect(lifecycle.close).toHaveBeenCalledTimes(1)
  })

  it("bridges browser input through the virtual lifecycle and exposes pressed feedback in the served deck html", async () => {
    let keyListener: ((event: { keyIndex: number; type: "down" | "up" }) => void) | undefined
    const lifecycle = {
      close: vi.fn(async () => {}),
      emitKeyEvent: vi.fn((event: { keyIndex: number; type: "down" | "up" }) => {
        keyListener?.(event)
      }),
      getConnection: vi.fn(() => ({ info: { keyCount: 15, model: "Virtual Stream Deck 15", serialNumber: "virtual-15" } })),
      start: vi.fn(async () => ({ info: { keyCount: 15, model: "Virtual Stream Deck 15", serialNumber: "virtual-15" } })),
      subscribeKeyEvents: vi.fn((listener: (event: { keyIndex: number; type: "down" | "up" }) => void) => {
        keyListener = listener
        return () => {
          keyListener = undefined
        }
      }),
    }
    const sessionMonitor = {
      getSnapshot: vi.fn(() => ({ capability: "supported", state: "unknown" })),
      stop: vi.fn(async () => {}),
      subscribe: vi.fn(() => () => {}),
    }
    createVirtualStreamDeckLifecycle.mockReturnValue(lifecycle)
    createBrowserRenderer.mockReturnValue({
      close: vi.fn(async () => {}),
      start: vi.fn(async () => {}),
      updateDeck: vi.fn(async () => {}),
    })
    createSessionMonitor.mockResolvedValue(sessionMonitor)
    resolveHostContext.mockResolvedValue({ os: { type: "linux", variant: "ubuntu", version: "24.04" }, session: { capability: "supported", state: "unknown" } })
    loadBootstrapConfig.mockReturnValue({
      config: { addons: [] },
      cwd: "/tmp/project",
      filePath: "/tmp/project/config.yml",
    })
    loadConfiguredAddons.mockResolvedValue({ loaded: [], warnings: [] })
    loadConfigWithSources.mockReturnValue({
      config: {
        decks: {
          main: {
            buttons: [{
              config: { label: "Tap Me" },
              definition: {
                configSchema: { parse: (value: unknown) => value, safeParse: (value: unknown) => ({ data: value, success: true as const }) },
                createInstance: () => ({ render: () => createElement("div", null, "Tap Me") }),
                type: "dom-button",
              },
              label: "Tap Me",
              position: 0,
              type: "dom-button",
            }],
            id: "main",
          },
        },
        main_deck: "main",
        theme: "dark",
      },
      filePath: "/tmp/project/config.yml",
      filePaths: ["/tmp/project/config.yml"],
    })
    resolveTheme.mockResolvedValue({
      accent: "#f59e0b",
      background: "#10161f",
      buttonFrame: vi.fn(({ children, state }: { children: unknown; state: string }) => createElement("div", { "data-frame-state": state }, children)),
      danger: "#fb7185",
      filePaths: ["/tmp/project/themes/default/index.js"],
      foreground: "#eef2f7",
      name: "dark",
      primary: "#7dd3fc",
      rootDir: "/tmp/project/themes/default",
      stylesheets: [],
      success: "#34d399",
    })

    const { startEmulatorSession } = await import("./start.js")
    const session = await startEmulatorSession({ logger: { info: vi.fn(), warn: vi.fn() } as never, port: 0 })

    const initialDeckHtml = await fetch(`${session.url}/__sireno/deck`).then(async (response) => response.text())
    expect(initialDeckHtml).toContain("deck-root")
    expect(initialDeckHtml).toContain("data-frame-state=\"idle\"")

    const downResponse = await fetch(`${session.url}/__sireno/input`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ keyIndex: 0, type: "down" }),
    })
    expect(downResponse.status).toBe(204)

    await vi.waitFor(async () => {
      const pressedDeckHtml = await fetch(`${session.url}/__sireno/deck`).then(async (response) => response.text())
      expect(pressedDeckHtml).toContain("data-frame-state=\"hold\"")
    })

    const upResponse = await fetch(`${session.url}/__sireno/input`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ keyIndex: 0, type: "up" }),
    })
    expect(upResponse.status).toBe(204)

    await vi.waitFor(async () => {
      const releasedDeckHtml = await fetch(`${session.url}/__sireno/deck`).then(async (response) => response.text())
      expect(releasedDeckHtml).toContain("data-frame-state=\"idle\"")
    })

    expect(lifecycle.emitKeyEvent).toHaveBeenCalledWith({ keyIndex: 0, type: "down" })
    expect(lifecycle.emitKeyEvent).toHaveBeenCalledWith({ keyIndex: 0, type: "up" })

    await session.close()
  })

  it("restarts the emulator with a new virtual device when the page requests a device switch", async () => {
    const firstLifecycle = {
      close: vi.fn(async () => {}),
      emitKeyEvent: vi.fn(),
      getConnection: vi.fn(() => ({ info: { keyCount: 15, model: "Stream Deck MK.2", serialNumber: "virtual-15" } })),
      start: vi.fn(async () => ({ info: { keyCount: 15, model: "Stream Deck MK.2", serialNumber: "virtual-15" } })),
      subscribeKeyEvents: vi.fn(() => () => {}),
    }
    const secondLifecycle = {
      close: vi.fn(async () => {}),
      emitKeyEvent: vi.fn(),
      getConnection: vi.fn(() => ({ info: { keyCount: 32, model: "Stream Deck XL", serialNumber: "virtual-32" } })),
      start: vi.fn(async () => ({ info: { keyCount: 32, model: "Stream Deck XL", serialNumber: "virtual-32" } })),
      subscribeKeyEvents: vi.fn(() => () => {}),
    }
    const firstRenderer = {
      close: vi.fn(async () => {}),
      keyCount: 15,
      start: vi.fn(async () => {}),
      updateDeck: vi.fn(async () => {}),
    }
    const secondRenderer = {
      close: vi.fn(async () => {}),
      keyCount: 32,
      start: vi.fn(async () => {}),
      updateDeck: vi.fn(async () => {}),
    }
    const sessionMonitor = {
      getSnapshot: vi.fn(() => ({ capability: "supported", state: "unknown" })),
      stop: vi.fn(async () => {}),
      subscribe: vi.fn(() => () => {}),
    }
    createVirtualStreamDeckLifecycle.mockReturnValueOnce(firstLifecycle).mockReturnValueOnce(secondLifecycle)
    createBrowserRenderer.mockReturnValueOnce(firstRenderer).mockReturnValueOnce(secondRenderer)
    createSessionMonitor.mockResolvedValue(sessionMonitor)
    resolveHostContext.mockResolvedValue({ os: { type: "linux", variant: "ubuntu", version: "24.04" }, session: { capability: "supported", state: "unknown" } })
    loadBootstrapConfig.mockReturnValue({ config: { addons: [] }, cwd: "/tmp/project", filePath: "/tmp/project/config.yml" })
    loadConfiguredAddons.mockResolvedValue({ loaded: [], warnings: [] })
    loadConfigWithSources.mockReturnValue({
      config: {
        decks: { main: { buttons: [{ config: { label: "Clock" }, definition: { configSchema: { parse: (value: unknown) => value, safeParse: (value: unknown) => ({ data: value, success: true as const }) }, createInstance: () => ({ render: () => createElement("div", null, "Clock") }), type: "dom-button" }, label: "Clock", position: 0, type: "dom-button" }], id: "main" } },
        main_deck: "main",
        theme: "dark",
      },
      filePath: "/tmp/project/config.yml",
      filePaths: ["/tmp/project/config.yml"],
    })
    resolveTheme.mockResolvedValue({
      accent: "#f59e0b",
      background: "#10161f",
      buttonFrame: vi.fn(({ children }: { children: unknown }) => children),
      danger: "#fb7185",
      filePaths: ["/tmp/project/themes/default/index.js"],
      foreground: "#eef2f7",
      name: "dark",
      primary: "#7dd3fc",
      rootDir: "/tmp/project/themes/default",
      stylesheets: [],
      success: "#34d399",
    })

    const { startEmulatorSession } = await import("./start.js")
    const session = await startEmulatorSession({ logger: { info: vi.fn(), warn: vi.fn() } as never, port: 0, keyCount: 15 })

    const switchResponse = await fetch(`${session.url}/__sireno/device`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ keyCount: 32 }),
    })
    expect(switchResponse.status).toBe(202)

    await vi.waitFor(async () => {
      const state = await fetch(`${session.url}/__sireno/state`).then(async (response) => response.json())
      expect(state).toMatchObject({ selectedKeyCount: 32, status: "ready" })
    })

    expect(firstLifecycle.close).toHaveBeenCalledTimes(1)
    expect(firstRenderer.close).toHaveBeenCalledTimes(1)
    expect(secondRenderer.start).toHaveBeenCalledTimes(1)

    await session.close()
  })

  it("fails honestly when the selected virtual device cannot represent the configured deck", async () => {
    const lifecycle = {
      close: vi.fn(async () => {}),
      emitKeyEvent: vi.fn(),
      getConnection: vi.fn(() => ({ info: { keyCount: 15, model: "Stream Deck MK.2", serialNumber: "virtual-15" } })),
      start: vi.fn(async () => ({ info: { keyCount: 15, model: "Stream Deck MK.2", serialNumber: "virtual-15" } })),
      subscribeKeyEvents: vi.fn(() => () => {}),
    }
    const renderer = {
      close: vi.fn(async () => {}),
      keyCount: 15,
      start: vi.fn(async () => {}),
      updateDeck: vi.fn(async () => {}),
    }
    const smallRenderer = {
      close: vi.fn(async () => {}),
      keyCount: 6,
      start: vi.fn(async () => {}),
      updateDeck: vi.fn(async () => {}),
    }
    const sessionMonitor = {
      getSnapshot: vi.fn(() => ({ capability: "supported", state: "unknown" })),
      stop: vi.fn(async () => {}),
      subscribe: vi.fn(() => () => {}),
    }
    createVirtualStreamDeckLifecycle.mockReturnValue(lifecycle)
    createBrowserRenderer.mockReturnValueOnce(renderer).mockReturnValueOnce(smallRenderer)
    createSessionMonitor.mockResolvedValue(sessionMonitor)
    resolveHostContext.mockResolvedValue({ os: { type: "linux", variant: "ubuntu", version: "24.04" }, session: { capability: "supported", state: "unknown" } })
    loadBootstrapConfig.mockReturnValue({ config: { addons: [] }, cwd: "/tmp/project", filePath: "/tmp/project/config.yml" })
    loadConfiguredAddons.mockResolvedValue({ loaded: [], warnings: [] })
    loadConfigWithSources.mockReturnValue({
      config: {
        decks: { main: { buttons: [{ config: { label: "Key 8" }, definition: { configSchema: { parse: (value: unknown) => value, safeParse: (value: unknown) => ({ data: value, success: true as const }) }, createInstance: () => ({ render: () => createElement("div", null, "Key 8") }), type: "dom-button" }, label: "Key 8", position: 7, type: "dom-button" }], id: "main" } },
        main_deck: "main",
        theme: "dark",
      },
      filePath: "/tmp/project/config.yml",
      filePaths: ["/tmp/project/config.yml"],
    })
    resolveTheme.mockResolvedValue({
      accent: "#f59e0b",
      background: "#10161f",
      buttonFrame: vi.fn(({ children }: { children: unknown }) => children),
      danger: "#fb7185",
      filePaths: ["/tmp/project/themes/default/index.js"],
      foreground: "#eef2f7",
      name: "dark",
      primary: "#7dd3fc",
      rootDir: "/tmp/project/themes/default",
      stylesheets: [],
      success: "#34d399",
    })

    const { startEmulatorSession } = await import("./start.js")
    const session = await startEmulatorSession({ logger: { info: vi.fn(), warn: vi.fn() } as never, port: 0, keyCount: 15 })

    const switchResponse = await fetch(`${session.url}/__sireno/device`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ keyCount: 6 }),
    })
    expect(switchResponse.status).toBe(202)

    await vi.waitFor(async () => {
      const state = await fetch(`${session.url}/__sireno/state`).then(async (response) => response.json())
      expect(state.status).toBe("error")
      expect(state.error).toMatchObject({ code: "emulator_layout_mismatch" })
    })

    const deckHtml = await fetch(`${session.url}/__sireno/deck`).then(async (response) => response.text())
    expect(deckHtml).toContain("Emulator Layout Error")
    expect(deckHtml).toContain("configured deck needs 8")

    await session.close()
  })
})
