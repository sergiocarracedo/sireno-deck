import { beforeEach, describe, expect, it, vi } from "vitest"

const blankRemainingKeys = vi.fn()
const createStreamDeckLifecycle = vi.fn()
const watch = vi.fn()
const createBrowserRenderer = vi.fn()
const createBundledAddonRegistry = vi.fn(() => ({ bundled: true }))
const loadBootstrapConfig = vi.fn()
const loadConfigWithSources = vi.fn()
const loadConfiguredAddons = vi.fn()
const renderBlankKeyImage = vi.fn(async () => Buffer.from("blank"))
const renderTextImage = vi.fn(async () => Buffer.from("rendered"))
const replayLastRenderedBuffers = vi.fn()
const resolveHostContext = vi.fn()
const createSessionMonitor = vi.fn()
const writeKeyBuffer = vi.fn(async () => {})

class StreamDeckSelectionError extends Error {}

vi.mock("node:fs", async () => ({
  watch,
}))

vi.mock("../../config/loader.js", () => ({
  createBundledAddonRegistry,
  loadBootstrapConfig,
  loadConfigWithSources,
}))

vi.mock("../../addon/loader.js", () => ({
  loadConfiguredAddons,
}))

vi.mock("../../device/stream-deck.js", () => ({
  blankRemainingKeys,
  createStreamDeckLifecycle,
  replayLastRenderedBuffers,
  StreamDeckSelectionError,
  writeKeyBuffer,
}))

vi.mock("../../render/browser-renderer.js", () => ({
  createBrowserRenderer,
}))

vi.mock("../../render/text-image.js", () => ({
  renderBlankKeyImage,
  renderTextImage,
}))

vi.mock("../../system/host-context.js", () => ({
  resolveHostContext,
}))

vi.mock("../../system/session-monitor.js", () => ({
  createSessionMonitor,
}))

describe("loadRuntimeConfig", () => {
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
    createStreamDeckLifecycle.mockReset()
    watch.mockReset()
    createBrowserRenderer.mockReset()
    createBundledAddonRegistry.mockClear()
    loadBootstrapConfig.mockReset()
    loadConfigWithSources.mockReset()
    loadConfiguredAddons.mockReset()
    renderBlankKeyImage.mockClear()
    renderTextImage.mockClear()
    replayLastRenderedBuffers.mockReset()
    resolveHostContext.mockReset()
    createSessionMonitor.mockReset()
    supportedSessionMonitor.getSnapshot.mockClear()
    unsupportedSessionMonitor.getSnapshot.mockClear()
    writeKeyBuffer.mockReset()
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
      config: { main_deck: "main" },
      filePath: "/tmp/project/config.yml",
      filePaths: ["/tmp/project/config.yml"],
    })

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
      config: { main_deck: "main" },
      filePath: "/tmp/project/config.yml",
      filePaths: ["/tmp/project/config.yml", "/tmp/project/decks/main.yml"],
    })

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
    expect(result.config).toEqual({ main_deck: "main" })
    expect(result.configDirectory).toBe("/tmp/project")
    expect(result.filePaths).toEqual(["/tmp/project/config.yml", "/tmp/project/decks/main.yml"])
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
      config: { main_deck: "main" },
      filePath: "/tmp/project/config.yml",
      filePaths: ["/tmp/project/config.yml"],
    })

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

describe("resolvePrimitiveRenderOptions", () => {
  it("maps legacy wrapper ids onto the shared wrapper on the shipped render path", async () => {
    const { resolvePrimitiveRenderOptions } = await import("./start.js")

    expect(resolvePrimitiveRenderOptions(
      {
        keyIndex: 0,
        label: "Clock",
        style_id: "core-buttons/accent",
        wrapper_id: "core-buttons/shared-card",
      },
      {
        getStylePrimitive: vi.fn(() => ({ addonName: "core-buttons", id: "core-buttons/accent", name: "accent", shared: { tone: "accent" } })),
        getWrapperPrimitive: vi.fn(() => ({ addonName: "core-buttons", id: "core-buttons/shared-card", name: "shared-card", wrapper: "shared" })),
      },
    )).toEqual({ sharedStyleTone: "accent", wrapper: "shared" })
  })

  it("does not apply wrapper compatibility when full-surface rendering is explicit", async () => {
    const { resolvePrimitiveRenderOptions } = await import("./start.js")

    expect(resolvePrimitiveRenderOptions(
      {
        full_surface: true,
        keyIndex: 0,
        label: "Clock",
        style_id: "core-buttons/accent",
        wrapper_id: "core-buttons/shared-card",
      },
      {
        getStylePrimitive: vi.fn(() => ({ addonName: "core-buttons", id: "core-buttons/accent", name: "accent", shared: { tone: "accent" } })),
        getWrapperPrimitive: vi.fn(() => ({ addonName: "core-buttons", id: "core-buttons/shared-card", name: "shared-card", wrapper: "shared" })),
      },
    )).toEqual({ sharedStyleTone: "accent" })
  })
})

describe("createRenderTextImageOptions", () => {
  it("forwards explicit full-surface rendering on the shipped start path while keeping wrapper compatibility opt-out narrow", async () => {
    const { createRenderTextImageOptions } = await import("./start.js")

    expect(createRenderTextImageOptions(
      {
        full_surface: true,
        keyIndex: 1,
        label: "Explicit Full Surface",
        style_id: "core-buttons/accent",
        wrapper_id: "core-buttons/shared-card",
      },
      { accent: "#f59e0b", background: "#10161f", danger: "#fb7185", foreground: "#eef2f7", name: "dark", primary: "#7dd3fc", success: "#34d399" },
      { sharedStyleTone: "accent" },
    )).toMatchObject({
      full_surface: true,
      sharedStyleTone: "accent",
      text: "Explicit Full Surface",
      wrapper: undefined,
    })
  })
})

describe("isDomRenderButton", () => {
  it("detects runtime render outputs that carry DOM content", async () => {
    const { isDomRenderButton } = await import("./start.js")

    expect(isDomRenderButton({ content: { type: 'div' }, keyIndex: 0 } as never)).toBe(true)
    expect(isDomRenderButton({ keyIndex: 0, label: 'Clock' })).toBe(false)
  })
})

describe("toLegacyRenderButton", () => {
  it("preserves fallback-compatible fields from runtime render output", async () => {
    const { toLegacyRenderButton } = await import("./start.js")

    expect(toLegacyRenderButton({
      background: '#10161f',
      detailLines: ['Line 1'],
      full_surface: true,
      keyIndex: 2,
      label: 'Clock',
      subtitle: 'NOW',
      toggle_mode: 'internal',
      variant: 'toggle',
    })).toEqual({
      background: '#10161f',
      detailLines: ['Line 1'],
      full_surface: true,
      keyIndex: 2,
      label: 'Clock',
      subtitle: 'NOW',
      toggle_mode: 'internal',
      variant: 'toggle',
    })
  })
})

describe("ensureBrowserRenderer", () => {
  it("warns and falls back when the browser renderer cannot start", async () => {
    const start = vi.fn(async () => {
      throw new Error('missing chromium')
    })
    const close = vi.fn(async () => {})
    createBrowserRenderer.mockReturnValue({ close, start })

    const { ensureBrowserRenderer } = await import("./start.js")
    const logger = { warn: vi.fn() } as const

    await expect(ensureBrowserRenderer(null, 15, logger as never)).resolves.toBeNull()
    expect(createBrowserRenderer).toHaveBeenCalledWith({ keyCount: 15 })
    expect(close).toHaveBeenCalledTimes(1)
    expect(logger.warn).toHaveBeenCalledWith(
      { error: expect.any(Error) },
      "browser renderer unavailable; falling back to SVG/text-image rendering",
    )
  })
})

describe("renderRuntimeDeckSurface", () => {
  beforeEach(() => {
    createBrowserRenderer.mockReset()
    renderTextImage.mockClear()
    writeKeyBuffer.mockReset()
  })

  it("renders mixed DOM and legacy decks through the fallback path using DOM fallback metadata", async () => {
    const browserRenderer = {
      captureKeyBuffers: vi.fn(),
      close: vi.fn(),
      start: vi.fn(),
      updateDeck: vi.fn(),
    }
    const connection = { info: { keyCount: 3 } }
    const logger = { info: vi.fn(), warn: vi.fn() } as const
    const { renderRuntimeDeckSurface } = await import("./start.js")

    const result = await renderRuntimeDeckSurface(
      connection as never,
      [
        { content: { type: 'div' }, keyIndex: 0, label: 'DOM Clock' } as never,
        { keyIndex: 1, label: 'Legacy Clock' },
      ],
      browserRenderer as never,
      { accent: '#f59e0b', background: '#10161f', danger: '#fb7185', foreground: '#eef2f7', name: 'dark', primary: '#7dd3fc', success: '#34d399' },
      () => ({}),
      logger as never,
    )

    expect(result).toBe(browserRenderer)
    expect(browserRenderer.updateDeck).not.toHaveBeenCalled()
    expect(renderTextImage).toHaveBeenCalledTimes(2)
    expect(renderTextImage.mock.calls.map((call) => call[0]?.text)).toEqual(['DOM Clock', 'Legacy Clock'])
    expect(writeKeyBuffer).toHaveBeenCalledTimes(2)
  })

  it("falls back to SVG rendering when an all-DOM deck cannot start the browser", async () => {
    const browserRenderer = null
    const start = vi.fn(async () => {
      throw new Error('missing chromium')
    })
    const close = vi.fn(async () => {})
    createBrowserRenderer.mockReturnValue({ close, start })
    const connection = { info: { keyCount: 1 } }
    const logger = { info: vi.fn(), warn: vi.fn() } as const
    const { renderRuntimeDeckSurface } = await import("./start.js")

    const result = await renderRuntimeDeckSurface(
      connection as never,
      [{ content: { type: 'div' }, keyIndex: 0, label: 'DOM Clock' } as never],
      browserRenderer,
      { accent: '#f59e0b', background: '#10161f', danger: '#fb7185', foreground: '#eef2f7', name: 'dark', primary: '#7dd3fc', success: '#34d399' },
      () => ({}),
      logger as never,
    )

    expect(result).toBeNull()
    expect(renderTextImage).toHaveBeenCalledTimes(1)
    expect(renderTextImage).toHaveBeenCalledWith(expect.objectContaining({ text: 'DOM Clock' }))
    expect(writeKeyBuffer).toHaveBeenCalledTimes(1)
    expect(logger.warn).toHaveBeenCalledTimes(1)
  })
})
