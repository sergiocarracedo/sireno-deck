import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/config/loader", () => ({
  loadConfig: vi.fn(),
}))
vi.mock("@/addon/registry", () => ({
  AddonRegistry: vi.fn(),
}))
vi.mock("@/builtin-addons", () => ({
  registerBuiltins: vi.fn(),
}))
vi.mock("@/config/validation", () => ({
  validateFull: vi.fn(),
  isFullValid: vi.fn(),
  formatFullIssues: vi.fn(),
}))
vi.mock("@/device/registry", () => ({
  listDevices: vi.fn(),
}))
vi.mock("@/device/stream-deck", () => ({
  connectStreamDeck: vi.fn(),
  StreamDeckSelectionError: class StreamDeckSelectionError extends Error {},
}))
vi.mock("@/system/device-selection", () => ({
  selectDevice: vi.fn(),
  NoStreamDeckFoundError: class NoStreamDeckFoundError extends Error {},
}))
vi.mock("@/util/device-config", () => ({
  loadDeviceConfig: vi.fn(),
  saveDeviceConfig: vi.fn(),
}))
vi.mock("@/cli/commands/output-client", () => ({
  selectOutputClient: vi.fn(),
  RealOutputClient: vi.fn(),
  EmulatorOutputClient: vi.fn(),
}))
vi.mock("@/deck", () => ({
  createDeckRuntime: vi.fn(),
}))
vi.mock("@/system/active-app", () => ({
  createActiveAppProvider: vi.fn(),
}))
vi.mock("@/system/session-monitor", () => ({
  createSessionProvider: vi.fn(),
}))
vi.mock("@/system/key-macro", () => ({
  createKeyMacroProvider: vi.fn(),
}))
vi.mock("@/system/media", () => ({
  createMediaProvider: vi.fn(),
}))
vi.mock("@/system/clipboard", () => ({
  createClipboardProvider: vi.fn(() => ({
    writeText: vi.fn(async () => undefined),
    readText: vi.fn(async () => ""),
    stop: vi.fn(async () => undefined),
  })),
}))
vi.mock("@/render/ws-bridge", () => ({
  startWsBridge: vi.fn(async () => ({
    port: 52937,
    broadcast: vi.fn(),
    sendToCaller: vi.fn(),
    onMessage: () => () => undefined,
    onConnection: () => () => undefined,
    close: async () => undefined,
  })),
}))
vi.mock("@/render/state-publisher", () => ({
  StatePublisher: vi.fn(function FakeStatePublisher() {
    return {
      registerChannel: vi.fn(),
      setActiveDeck: vi.fn(),
      stopAll: vi.fn(),
    }
  }),
}))
vi.mock("@/deck/addon-handler-bridge", () => ({
  bridgeAddonServices: vi.fn(async () => undefined),
}))
vi.mock("@/cli/commands/addon-registry", () => ({
  collectBuiltinAddonRegistry: vi.fn(async () => ({
    scanned: [],
    byType: new Map(),
  })),
}))

const loaderMod = await import("@/config/loader")
const registryMod = await import("@/addon/registry")
const builtinsMod = await import("@/builtin-addons")
const validationMod = await import("@/config/validation")
const deviceRegMod = await import("@/device/registry")
const deviceMod = await import("@/device/stream-deck")
const selMod = await import("@/system/device-selection")
const cfgMod = await import("@/util/device-config")
const realMod = await import("@/cli/commands/output-client")
const deckMod = await import("@/deck")
const activeAppMod = await import("@/system/active-app")
const sessionMod = await import("@/system/session-monitor")
const keyMacroMod = await import("@/system/key-macro")
const mediaMod = await import("@/system/media")

const loaderMock = loaderMod.loadConfig as unknown as ReturnType<typeof vi.fn>
const registryCtorMock = registryMod.AddonRegistry as unknown as ReturnType<
  typeof vi.fn
>
const builtinsMock = builtinsMod.registerBuiltins as unknown as ReturnType<
  typeof vi.fn
>
const validateFullMock = validationMod.validateFull as unknown as ReturnType<
  typeof vi.fn
>
const isFullValidMock = validationMod.isFullValid as unknown as ReturnType<
  typeof vi.fn
>
const formatFullIssuesMock =
  validationMod.formatFullIssues as unknown as ReturnType<typeof vi.fn>
const listDevicesMock = deviceRegMod.listDevices as unknown as ReturnType<
  typeof vi.fn
>
const connectMock = deviceMod.connectStreamDeck as unknown as ReturnType<
  typeof vi.fn
>
const selectDeviceMock = selMod.selectDevice as unknown as ReturnType<
  typeof vi.fn
>
const loadDeviceConfigMock = cfgMod.loadDeviceConfig as unknown as ReturnType<
  typeof vi.fn
>
const saveDeviceConfigMock = cfgMod.saveDeviceConfig as unknown as ReturnType<
  typeof vi.fn
>
const runRealModeMock = realMod.selectOutputClient as unknown as ReturnType<
  typeof vi.fn
>

const { createLogger } = await import("@/util/logger")
const { run } = await import("../run")

const silentLogger = () => createLogger({ level: "silent" })

type FakeSignal = import("../run").SignalProvider & {
  onSignalSpy: ReturnType<typeof vi.fn>
  trigger: () => void
}

const makeFakeSignals = (): FakeSignal => {
  const handlers: Array<() => void> = []
  const onSignalSpy = vi.fn((handler: () => void): (() => void) => {
    handlers.push(handler)
    return () => {
      const i = handlers.indexOf(handler)
      if (i >= 0) handlers.splice(i, 1)
    }
  })
  const signalProvider: import("../run").SignalProvider = {
    onSignal(handler: () => void): () => void {
      return onSignalSpy(handler)
    },
  }
  return {
    ...signalProvider,
    onSignalSpy,
    trigger: () => {
      for (const h of handlers) h()
    },
  }
}

const mockDevice = () => ({
  serial: "ABC",
  path: "/p",
  model: "mk2",
  getKeyCount: () => 15,
  setBrightness: vi.fn(async () => undefined),
  fillKeyBuffer: vi.fn(async () => undefined),
  close: vi.fn(async () => undefined),
  onKeyEvent: vi.fn(() => () => undefined),
})

const setHappyPath = (
  overrides: {
    devices?: Array<{ serial: string; path: string; model: string }>
  } = {},
): void => {
  loaderMock.mockReturnValue({ config: { decks: {} }, configDir: "/dir" })
  registryCtorMock.mockImplementation(function FakeRegistry() {
    return {
      hasButtonType: () => true,
      getButtonType: () => ({ def: { internal: false } }),
      resolveActiveTheme: () => ({
        name: "default",
        apiVersion: 1,
        source: { kind: "local" as const, resolvedPath: "/theme" },
        manifestPath: "/theme/sirenodeck.json",
        uiOverridesPath: null,
        cssPath: "/theme.css",
      }),
      listAddons: () => [],
      listButtonTypes: () => [],
      getAddon: () => undefined,
    }
  })
  builtinsMock.mockReturnValue(undefined)
  validateFullMock.mockReturnValue({ issues: [] })
  isFullValidMock.mockReturnValue(true)
  const devices = overrides.devices ?? [
    { serial: "ABC", path: "/p", model: "mk2" },
  ]
  listDevicesMock.mockResolvedValue(devices)
  loadDeviceConfigMock.mockReturnValue(null)
  selectDeviceMock.mockResolvedValue({
    descriptor: devices[0]!,
    savedButStale: false,
  })
  saveDeviceConfigMock.mockReturnValue(undefined)
  connectMock.mockResolvedValue(mockDevice())

  const nullProvider = () => ({
    async getActive() {
      return null
    },
    subscribe() {
      return () => undefined
    },
    async stop() {
      return
    },
    async sendKey() {
      return
    },
    async play() {
      return
    },
    async pause() {
      return
    },
    async toggle() {
      return
    },
    async next() {
      return
    },
    async previous() {
      return
    },
    async getCurrent() {
      return null
    },
    onChange() {
      return () => undefined
    },
    getState() {
      return "unknown" as const
    },
  })
  const fakeRuntime = {
    setActiveAppProvider: vi.fn(),
    setClipboardProvider: vi.fn(),
    setGestureListener: vi.fn(),
    stopActiveAppPolling: vi.fn(async () => undefined),
    getActiveDeck: vi.fn(() => undefined),
    navStackDepth: vi.fn(() => 1),
    dispatchGesture: vi.fn(),
  }
  ;(
    deckMod as unknown as { createDeckRuntime: ReturnType<typeof vi.fn> }
  ).createDeckRuntime.mockReturnValue({
    runtime: fakeRuntime,
    methods: {
      setKeyMacroProvider: () => undefined,
      setClipboardProvider: () => undefined,
      runCommand: () => undefined,
      keyMacro: () => undefined,
      pasteText: () => undefined,
      navigateToDeck: () => undefined,
      goBack: () => undefined,
      getActiveDeckId: () => undefined,
      invalidate: () => undefined,
      publish: () => undefined,
      subscribe: () => () => undefined,
    },
    pubSub: {
      publish: () => undefined,
      subscribe: () => () => undefined,
      clear: () => undefined,
    },
    store: {
      get: () => undefined,
      set: () => undefined,
      delete: () => undefined,
    },
  })
  ;(
    activeAppMod as unknown as {
      createActiveAppProvider: ReturnType<typeof vi.fn>
    }
  ).createActiveAppProvider.mockResolvedValue(nullProvider())
  ;(
    sessionMod as unknown as { createSessionProvider: ReturnType<typeof vi.fn> }
  ).createSessionProvider.mockResolvedValue(nullProvider())
  ;(
    keyMacroMod as unknown as {
      createKeyMacroProvider: ReturnType<typeof vi.fn>
    }
  ).createKeyMacroProvider.mockResolvedValue(nullProvider())
  ;(
    mediaMod as unknown as { createMediaProvider: ReturnType<typeof vi.fn> }
  ).createMediaProvider.mockResolvedValue(nullProvider())
}

describe("run", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("runs full pipeline end-to-end with a single connected device", async () => {
    setHappyPath()
    const stop = vi.fn(async () => undefined)
    const startMock = vi.fn(async () => ({ stop, childPids: [] }))
    runRealModeMock.mockReturnValue({ start: startMock })

    const signals = makeFakeSignals()
    const runPromise = run({
      config: "/abs/cfg.yml",
      frontendUrl: "http://x",
      xdgConfigHome: "/xdg",
      homeDir: "/home",
      signals,
      logger: silentLogger(),
    })

    await vi.waitFor(() => expect(startMock).toHaveBeenCalledTimes(1))
    signals.trigger()

    await runPromise

    expect(loaderMock).toHaveBeenCalledWith({ configPath: "/abs/cfg.yml" })
    expect(builtinsMock).toHaveBeenCalled()
    expect(validateFullMock).toHaveBeenCalled()
    expect(listDevicesMock).toHaveBeenCalled()
    expect(selectDeviceMock).toHaveBeenCalled()
    expect(saveDeviceConfigMock).toHaveBeenCalled()
    expect(connectMock).toHaveBeenCalledWith({ serial: "ABC" })
    expect(runRealModeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        emulator: false,
        device: expect.objectContaining({ serial: "ABC" }),
      }),
    )
    expect(startMock).toHaveBeenCalledWith(
      expect.objectContaining({
        frontendUrl: "http://x",
      }),
    )
    expect(stop).toHaveBeenCalled()
  })

  it("prompts via selectDevice when multiple devices and no saved config", async () => {
    setHappyPath({
      devices: [
        { serial: "A", path: "/p0", model: "mk2" },
        { serial: "B", path: "/p1", model: "xl" },
      ],
    })
    selectDeviceMock.mockResolvedValue({
      descriptor: { serial: "B", path: "/p1", model: "xl" },
      savedButStale: false,
    })
    const startMock = vi.fn(async () => ({
      stop: vi.fn(async () => undefined),
      childPids: [],
    }))
    runRealModeMock.mockReturnValue({ start: startMock })

    const signals = makeFakeSignals()
    const runPromise = run({
      config: "/abs/cfg.yml",
      frontendUrl: "http://x",
      xdgConfigHome: "/xdg",
      homeDir: "/home",
      signals,
      logger: silentLogger(),
    })
    await vi.waitFor(() => expect(startMock).toHaveBeenCalled())
    signals.trigger()
    await runPromise

    expect(selectDeviceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        devices: expect.arrayContaining([
          expect.objectContaining({ serial: "A" }),
          expect.objectContaining({ serial: "B" }),
        ]),
        current: null,
      }),
    )
  })

  it("uses saved device.json when present and matches a connected device", async () => {
    setHappyPath({
      devices: [
        { serial: "A", path: "/p0", model: "mk2" },
        { serial: "B", path: "/p1", model: "xl" },
      ],
    })
    loadDeviceConfigMock.mockReturnValue({
      serial: "B",
      path: "/p1",
      model: "xl",
    })
    selectDeviceMock.mockResolvedValue({
      descriptor: { serial: "B", path: "/p1", model: "xl" },
      savedButStale: false,
    })
    const startMock = vi.fn(async () => ({
      stop: vi.fn(async () => undefined),
      childPids: [],
    }))
    runRealModeMock.mockReturnValue({ start: startMock })

    const signals = makeFakeSignals()
    const runPromise = run({
      config: "/abs/cfg.yml",
      frontendUrl: "http://x",
      xdgConfigHome: "/xdg",
      homeDir: "/home",
      signals,
      logger: silentLogger(),
    })
    await vi.waitFor(() => expect(startMock).toHaveBeenCalled())
    signals.trigger()
    await runPromise

    expect(loadDeviceConfigMock).toHaveBeenCalledWith({ xdgConfigHome: "/xdg" })
    expect(selectDeviceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        current: { serial: "B", path: "/p1", model: "xl" },
      }),
    )
    expect(connectMock).toHaveBeenCalledWith({ serial: "B" })
  })

  it("saves new selection to device.json after picking", async () => {
    setHappyPath({
      devices: [
        { serial: "A", path: "/p0", model: "mk2" },
        { serial: "B", path: "/p1", model: "xl" },
      ],
    })
    selectDeviceMock.mockResolvedValue({
      descriptor: { serial: "B", path: "/p1", model: "xl" },
      savedButStale: false,
    })
    runRealModeMock.mockReturnValue({
      start: vi.fn(async () => ({
        stop: vi.fn(async () => undefined),
        childPids: [],
      })),
    })

    const signals = makeFakeSignals()
    const runPromise = run({
      config: "/abs/cfg.yml",
      frontendUrl: "http://x",
      xdgConfigHome: "/xdg",
      homeDir: "/home",
      signals,
      logger: silentLogger(),
    })
    await vi.waitFor(() => expect(runRealModeMock).toHaveBeenCalled())
    signals.trigger()
    await runPromise

    expect(saveDeviceConfigMock).toHaveBeenCalledWith({
      xdgConfigHome: "/xdg",
      config: { serial: "B", path: "/p1", model: "xl" },
    })
  })

  it("SIGINT during runRealMode triggers stop() via the signals provider", async () => {
    setHappyPath()
    const stop = vi.fn(async () => undefined)
    runRealModeMock.mockReturnValue({
      start: vi.fn(async () => ({ stop, childPids: [] })),
    })

    const signals = makeFakeSignals()
    const runPromise = run({
      config: "/abs/cfg.yml",
      frontendUrl: "http://x",
      xdgConfigHome: "/xdg",
      homeDir: "/home",
      signals,
      logger: silentLogger(),
    })

    await vi.waitFor(() => expect(runRealModeMock).toHaveBeenCalled())
    expect(signals.onSignalSpy).toHaveBeenCalledTimes(1)
    signals.trigger()
    await runPromise

    expect(stop).toHaveBeenCalledTimes(1)
  })

  it("rejects when config validation fails (does not start renderer)", async () => {
    loaderMock.mockReturnValue({ config: { decks: {} }, configDir: "/d" })
    registryCtorMock.mockImplementation(function FakeRegistry() {
      return {
        hasButtonType: () => true,
        getButtonType: () => ({ def: { internal: false } }),
      }
    })
    builtinsMock.mockReturnValue(undefined)
    validateFullMock.mockReturnValue({
      issues: [{ level: "error", path: "x", message: "bad" }],
    })
    isFullValidMock.mockReturnValue(false)
    formatFullIssuesMock.mockReturnValue("error x: bad")

    await expect(
      run({
        config: "/abs/cfg.yml",
        frontendUrl: "http://x",
        xdgConfigHome: "/xdg",
        homeDir: "/home",
        signals: makeFakeSignals(),
        logger: silentLogger(),
      }),
    ).rejects.toThrow(/Config validation failed/)

    expect(listDevicesMock).not.toHaveBeenCalled()
    expect(runRealModeMock).not.toHaveBeenCalled()
  })

  it("rejects with friendly error when no Stream Deck found", async () => {
    setHappyPath()
    listDevicesMock.mockResolvedValue([])
    const { NoStreamDeckFoundError } = await import("@/system/device-selection")
    selectDeviceMock.mockRejectedValue(new NoStreamDeckFoundError())

    await expect(
      run({
        config: "/abs/cfg.yml",
        frontendUrl: "http://x",
        xdgConfigHome: "/xdg",
        homeDir: "/home",
        signals: makeFakeSignals(),
        logger: silentLogger(),
      }),
    ).rejects.toThrow(/No Stream Deck devices found/)
  })
})
