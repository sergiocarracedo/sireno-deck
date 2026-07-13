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
vi.mock("@/system/providers/active-app", () => ({
  createActiveAppProvider: vi.fn(),
}))
vi.mock("@/system/providers/session", () => ({
  createSessionProvider: vi.fn(),
}))
vi.mock("@/system/providers/key-macro", () => ({
  createKeyMacroProvider: vi.fn(),
}))
vi.mock("@/system/providers/clipboard", () => ({
  createClipboardProvider: vi.fn(() => ({
    writeText: vi.fn(async () => undefined),
    readText: vi.fn(async () => ""),
    stop: vi.fn(async () => undefined),
  })),
}))
vi.mock("@/util/device-config", () => ({
  loadDeviceConfig: vi.fn(),
}))
vi.mock("@/outputClient", () => ({
  selectOutputClient: vi.fn(),
  RealOutputClient: vi.fn(),
  EmulatorOutputClient: vi.fn(),
}))
vi.mock("../http-server", () => ({
  startHttpServer: vi.fn(async () => ({
    port: 3939,
    stop: vi.fn(async () => undefined),
  })),
}))
vi.mock("@/util/daemon", () => ({
  writePid: vi.fn(),
  removePidFile: vi.fn(),
  readPid: vi.fn(),
  startDaemon: vi.fn(),
  stopDaemon: vi.fn(),
  checkStatus: vi.fn(),
  isRunning: vi.fn(),
  resolveDaemonPaths: vi.fn(),
  generateToken: vi.fn(() => "test-token"),
  readToken: vi.fn(() => null),
  writeToken: vi.fn(),
  removeTokenFile: vi.fn(),
  readChildren: vi.fn(() => null),
  writeChildren: vi.fn(),
  removeChildrenFile: vi.fn(),
}))
vi.mock("@/deck", () => ({
  createDeckRuntime: vi.fn(),
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

const loaderMod = await import("@/config/loader")
const registryMod = await import("@/addon/registry")
const builtinsMod = await import("@/builtin-addons")
const validationMod = await import("@/config/validation")
const outputClientMod = await import("@/outputClient")
const cfgMod = await import("@/util/device-config")
const daemonMod = await import("@/util/daemon")
const deckMod = await import("@/deck")
const activeAppMod = await import("@/system/providers/active-app")
const sessionMod = await import("@/system/providers/session")
const keyMacroMod = await import("@/system/providers/key-macro")

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
const loadDeviceConfigMock = cfgMod.loadDeviceConfig as unknown as ReturnType<
  typeof vi.fn
>
const selectOutputClientMock =
  outputClientMod.selectOutputClient as unknown as ReturnType<typeof vi.fn>
const writePidMock = daemonMod.writePid as unknown as ReturnType<typeof vi.fn>
const removePidFileMock = daemonMod.removePidFile as unknown as ReturnType<
  typeof vi.fn
>
const createDeckRuntimeMock = (
  deckMod as unknown as { createDeckRuntime: ReturnType<typeof vi.fn> }
).createDeckRuntime
const createActiveAppProviderMock = (
  activeAppMod as unknown as {
    createActiveAppProvider: ReturnType<typeof vi.fn>
  }
).createActiveAppProvider
const createSessionProviderMock = (
  sessionMod as unknown as { createSessionProvider: ReturnType<typeof vi.fn> }
).createSessionProvider
const createKeyMacroProviderMock = (
  keyMacroMod as unknown as {
    createKeyMacroProvider: ReturnType<typeof vi.fn>
  }
).createKeyMacroProvider

const { createLogger } = await import("@/util/logger")
const start = (await import("../start")).default

const silentLogger = () => createLogger({ level: "silent" })

const makeFakeOutputClient = (
  kind: "real" | "emulator",
): {
  kind: "real" | "emulator"
  validateReady: ReturnType<typeof vi.fn>
  listDevices: ReturnType<typeof vi.fn>
  selectDevice: ReturnType<typeof vi.fn>
  storeSelection: ReturnType<typeof vi.fn>
  init: ReturnType<typeof vi.fn>
} => {
  const descriptor = {
    id: "ABC",
    model: "mk2",
    keyCount: 15,
    label: "MK.2 (ABC)",
    transport: "real" as const,
  }
  return {
    kind,
    validateReady: vi.fn(async () => undefined),
    listDevices: vi.fn(async () => [descriptor]),
    selectDevice: vi.fn(async () => descriptor),
    storeSelection: vi.fn(async () => undefined),
    init: vi.fn(async () => ({
      descriptor,
      frontendUrl: "http://x",
      childPids: [],
      stop: vi.fn(async () => undefined),
    })),
  }
}

const setHappyPath = (): ReturnType<typeof makeFakeOutputClient> => {
  loaderMock.mockReturnValue({ config: { decks: {} }, configDir: "/d" })
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
    setGestureListener: vi.fn(),
    stopActiveAppPolling: vi.fn(async () => undefined),
    getActiveDeck: vi.fn(() => undefined),
    navStackDepth: vi.fn(() => 1),
    dispatchGesture: vi.fn(),
  }
  createDeckRuntimeMock.mockReturnValue({
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
  createActiveAppProviderMock.mockResolvedValue(nullProvider())
  createSessionProviderMock.mockResolvedValue(nullProvider())
  createKeyMacroProviderMock.mockResolvedValue(nullProvider())

  const outputClient = makeFakeOutputClient("real")
  selectOutputClientMock.mockReturnValue(outputClient)
  return outputClient
}

describe("start", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("calls writePid with current process pid", async () => {
    setHappyPath()
    await start({
      config: "/abs/cfg.yml",
      frontendUrl: "http://x",
      xdgConfigHome: "/xdg",
      homeDir: "/home",
      logger: silentLogger(),
    })
    expect(writePidMock).toHaveBeenCalledWith(process.pid)
  })

  it("resolves immediately without blocking on the background pipeline", async () => {
    const outputClient = setHappyPath()
    outputClient.init.mockImplementation(
      () => new Promise<never>(() => undefined),
    )

    const startPromise = start({
      config: "/abs/cfg.yml",
      frontendUrl: "http://x",
      xdgConfigHome: "/xdg",
      homeDir: "/home",
      logger: silentLogger(),
    })

    await expect(
      Promise.race([startPromise, new Promise((r) => setTimeout(r, 10))]),
    ).resolves.toBeUndefined()
    await vi.waitFor(() => expect(outputClient.init).toHaveBeenCalledTimes(1))
  })

  it("rejects with a clear error if preflight fails before the pipeline starts", async () => {
    loaderMock.mockReturnValue({ config: { decks: {} }, configDir: "/d" })
    registryCtorMock.mockImplementation(function FakeRegistry() {
      return {
        hasButtonType: () => true,
        getButtonType: () => ({ def: { internal: false } }),
        resolveActiveTheme: () => ({
          name: "default",
          cssPath: "/theme.css",
          frontendPath: "/index",
        }),
      }
    })
    builtinsMock.mockReturnValue(undefined)
    validateFullMock.mockReturnValue({
      issues: [{ level: "error", path: "x", message: "bad" }],
    })
    isFullValidMock.mockReturnValue(false)

    await expect(
      start({
        config: "/abs/cfg.yml",
        frontendUrl: "http://x",
        xdgConfigHome: "/xdg",
        homeDir: "/home",
        logger: silentLogger(),
      }),
    ).rejects.toThrow(/Config validation failed/)

    expect(writePidMock).not.toHaveBeenCalled()
    expect(selectOutputClientMock).not.toHaveBeenCalled()
  })
})
