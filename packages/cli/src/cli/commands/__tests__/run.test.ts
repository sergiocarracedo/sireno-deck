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
    url: "ws://127.0.0.1:52937",
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
vi.mock("@/outputClient", () => ({
  selectOutputClient: vi.fn(),
  RealOutputClient: vi.fn(),
  EmulatorOutputClient: vi.fn(),
}))
vi.mock("@/util/device-config", () => ({
  loadDeviceConfig: vi.fn(),
}))
vi.mock("@/deck", () => ({
  createDeckRuntime: vi.fn(),
}))

const loaderMod = await import("@/config/loader")
const registryMod = await import("@/addon/registry")
const builtinsMod = await import("@/builtin-addons")
const validationMod = await import("@/config/validation")
const outputClientMod = await import("@/outputClient")
const cfgMod = await import("@/util/device-config")
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
const selectOutputClientMock = outputClientMod.selectOutputClient as unknown as ReturnType<
  typeof vi.fn
>
const loadDeviceConfigMock = cfgMod.loadDeviceConfig as unknown as ReturnType<
  typeof vi.fn
>

const { createLogger } = await import("@/util/logger")
const { run, preflight } = await import("../run")

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

const makeFakeOutputClient = (
  kind: "real" | "emulator",
  devices: ReadonlyArray<{
    id: string
    model: string
    keyCount: number
    label: string
    transport: "real" | "emulated"
  }>,
  descriptorOverride?: {
    id: string
    model: string
    keyCount: number
    label: string
    transport: "real" | "emulated"
  },
): {
  kind: "real" | "emulator"
  listDevices: ReturnType<typeof vi.fn>
  selectDevice: ReturnType<typeof vi.fn>
  storeSelection: ReturnType<typeof vi.fn>
  init: ReturnType<typeof vi.fn>
} => {
  const listDevices = vi.fn(async () => devices)
  const descriptor =
    descriptorOverride ?? (devices[0] as (typeof devices)[number] | undefined) ?? {
      id: "default",
      model: "mk2",
      keyCount: 15,
      label: "Default",
      transport: "real",
    }
  const selectDevice = vi.fn(async () => descriptor)
  const storeSelection = vi.fn(async () => undefined)
  const init = vi.fn(async () => ({
    descriptor,
    frontendUrl: "http://x",
    wsUrl: "ws://x",
    childPids: [],
    stop: vi.fn(async () => undefined),
  }))
  return { kind, listDevices, selectDevice, storeSelection, init }
}

const setHappyPath = (
  overrides: { outputClient?: ReturnType<typeof makeFakeOutputClient> } = {},
): ReturnType<typeof makeFakeOutputClient> => {
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
  loadDeviceConfigMock.mockReturnValue(null)

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

  const outputClient =
    overrides.outputClient ??
    makeFakeOutputClient("real", [
      { id: "ABC", model: "mk2", keyCount: 15, label: "MK.2 (ABC)", transport: "real" },
    ])
  selectOutputClientMock.mockReturnValue(outputClient)
  return outputClient
}

describe("run", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("runs full pipeline end-to-end with single connected device", async () => {
    const outputClient = setHappyPath()
    const signals = makeFakeSignals()
    const runPromise = run({
      config: "/abs/cfg.yml",
      frontendUrl: "http://x",
      xdgConfigHome: "/xdg",
      homeDir: "/home",
      signals,
      logger: silentLogger(),
    })

    await vi.waitFor(() => expect(outputClient.init).toHaveBeenCalledTimes(1))
    signals.trigger()
    await runPromise

    expect(loaderMock).toHaveBeenCalledWith({ configPath: "/abs/cfg.yml" })
    expect(builtinsMock).toHaveBeenCalled()
    expect(validateFullMock).toHaveBeenCalled()
    expect(outputClient.listDevices).toHaveBeenCalled()
    expect(outputClient.selectDevice).toHaveBeenCalledWith(
      expect.any(Array),
      null,
      expect.anything(),
    )
    expect(outputClient.storeSelection).toHaveBeenCalledWith(
      expect.objectContaining({ id: "ABC" }),
    )
    expect(outputClient.init).toHaveBeenCalledWith(
      expect.objectContaining({
        frontendUrl: "http://x",
      }),
    )
  })

  it("SIGINT triggers stop() on the output handle", async () => {
    const outputClient = setHappyPath()
    const signals = makeFakeSignals()
    const runPromise = run({
      config: "/abs/cfg.yml",
      frontendUrl: "http://x",
      xdgConfigHome: "/xdg",
      homeDir: "/home",
      signals,
      logger: silentLogger(),
    })

    await vi.waitFor(() => expect(outputClient.init).toHaveBeenCalledTimes(1))
    const handle = await outputClient.init.mock.results[0]!.value
    expect(signals.onSignalSpy).toHaveBeenCalledTimes(1)
    signals.trigger()
    await runPromise

    expect(handle.stop).toHaveBeenCalledTimes(1)
  })

  it("rejects when config validation fails (does not call outputClient)", async () => {
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

    expect(selectOutputClientMock).not.toHaveBeenCalled()
  })

  it("emulator mode: no devices and no friendly error needed", async () => {
    const emulatorClient = makeFakeOutputClient("emulator", [])
    setHappyPath({ outputClient: emulatorClient })
    const signals = makeFakeSignals()
    const runPromise = run({
      config: "/abs/cfg.yml",
      frontendUrl: "http://x",
      emulator: true,
      xdgConfigHome: "/xdg",
      homeDir: "/home",
      signals,
      logger: silentLogger(),
    })

    await vi.waitFor(() => expect(emulatorClient.init).toHaveBeenCalledTimes(1))
    signals.trigger()
    await runPromise

    expect(selectOutputClientMock).toHaveBeenCalledWith(
      expect.objectContaining({ emulator: true }),
    )
  })
})

describe("preflight", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("rejects with friendly error when real mode finds no devices", async () => {
    const realClient = makeFakeOutputClient("real", [])
    setHappyPath({ outputClient: realClient })
    await expect(
      preflight({
        config: "/abs/cfg.yml",
        xdgConfigHome: "/xdg",
        homeDir: "/home",
        logger: silentLogger(),
      }),
    ).rejects.toThrow(/No Stream Deck devices found/)
  })

  it("passes for emulator mode without listing devices", async () => {
    const emulatorClient = makeFakeOutputClient("emulator", [])
    setHappyPath({ outputClient: emulatorClient })
    await expect(
      preflight({
        config: "/abs/cfg.yml",
        emulator: true,
        xdgConfigHome: "/xdg",
        homeDir: "/home",
        logger: silentLogger(),
      }),
    ).resolves.toBeUndefined()
    expect(emulatorClient.listDevices).not.toHaveBeenCalled()
  })
})