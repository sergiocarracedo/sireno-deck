import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { writeFileSync, mkdtempSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

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
let capturedBridge: {
  port: number
  url: string
  broadcast: ReturnType<typeof vi.fn>
  sendToCaller: ReturnType<typeof vi.fn>
  onMessage: () => () => undefined
  onConnection: () => () => undefined
  close: () => Promise<undefined>
} | null = null
vi.mock("@/render/ws-bridge", () => ({
  startWsBridge: vi.fn(async () => {
    const handle = {
      port: 52937,
      url: "ws://127.0.0.1:52937",
      broadcast: vi.fn(),
      sendToCaller: vi.fn(),
      onMessage: () => () => undefined,
      onConnection: () => () => undefined,
      close: async () => undefined,
    }
    capturedBridge = handle
    return handle
  }),
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
let configChangeCallback: (() => void) | null = null
vi.mock("@/core/watcher", () => ({
  ConfigWatcher: vi.fn(function FakeConfigWatcher(_paths, opts) {
    configChangeCallback = opts.onChange
    return {
      start: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined),
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
  injectSystemButtons: vi.fn((decks: ReadonlyArray<unknown>) => decks),
}))

const loaderMod = await import("@/config/loader")
const registryMod = await import("@/addon/registry")
const builtinsMod = await import("@/builtin-addons")
const validationMod = await import("@/config/validation")
const outputClientMod = await import("@/outputClient")
const cfgMod = await import("@/util/device-config")
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
const formatFullIssuesMock =
  validationMod.formatFullIssues as unknown as ReturnType<typeof vi.fn>
const selectOutputClientMock =
  outputClientMod.selectOutputClient as unknown as ReturnType<typeof vi.fn>
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
  validateReady: ReturnType<typeof vi.fn>
  listDevices: ReturnType<typeof vi.fn>
  selectDevice: ReturnType<typeof vi.fn>
  storeSelection: ReturnType<typeof vi.fn>
  init: ReturnType<typeof vi.fn>
} => {
  const listDevices = vi.fn(async () => devices)
  const descriptor = descriptorOverride ??
    (devices[0] as (typeof devices)[number] | undefined) ?? {
      id: "default",
      model: "mk2",
      keyCount: 15,
      label: "Default",
      transport: "real",
    }
  const validateReady = vi.fn(async () => undefined)
  const selectDevice = vi.fn(async () => descriptor)
  const storeSelection = vi.fn(async () => undefined)
  const init = vi.fn(async () => ({
    descriptor,
    frontendUrl: "http://x",
    wsUrl: "ws://x",
    childPids: [],
    stop: vi.fn(async () => undefined),
  }))
  return {
    kind,
    validateReady,
    listDevices,
    selectDevice,
    storeSelection,
    init,
  }
}

const setHappyPath = (
  overrides: { outputClient?: ReturnType<typeof makeFakeOutputClient> } = {},
): ReturnType<typeof makeFakeOutputClient> => {
  loaderMock.mockReturnValue({ config: { decks: {} }, configDir: "/dir" })
  registryCtorMock.mockImplementation(function FakeRegistry() {
    return {
      hasButtonType: () => true,
      getButtonType: () => ({ def: { internal: false } }),
      load: () => undefined,
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
    setSessionProvider: vi.fn(),
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
      setNotificationProvider: () => undefined,
      setClipboardProvider: () => undefined,
      setRequirements: () => undefined,
      checkRequirement: () => true,
      showTemporaryError: () => undefined,
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

  const outputClient =
    overrides.outputClient ??
    makeFakeOutputClient("real", [
      {
        id: "ABC",
        model: "mk2",
        keyCount: 15,
        label: "MK.2 (ABC)",
        transport: "real",
      },
    ])
  selectOutputClientMock.mockReturnValue(outputClient)
  return outputClient
}

describe("run", () => {
  beforeAll(() => {
    // ponytail: --config now validates the path exists up-front. Tests
    // use a literal `${process.env.RUN_TEST_CFG_DIR}/cfg.yml`; create it on disk once so the
    // validator accepts it. Removed in afterAll (vitest cleans tmp).
    const dir = mkdtempSync(join(tmpdir(), "run-test-"))
    process.env["RUN_TEST_CFG_DIR"] = dir
    writeFileSync(join(dir, "cfg.yml"), "decks: {}\n")
  })
  beforeEach(() => {
    vi.clearAllMocks()
    configChangeCallback = null
    capturedBridge = null
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("runs full pipeline end-to-end with single connected device", async () => {
    const outputClient = setHappyPath()
    const signals = makeFakeSignals()
    const runPromise = run({
      config: `${process.env.RUN_TEST_CFG_DIR}/cfg.yml`,
      frontendUrl: "http://x",
      xdgConfigHome: "/xdg",
      homeDir: "/home",
      signals,
      logger: silentLogger(),
    })

    await vi.waitFor(() => expect(outputClient.init).toHaveBeenCalledTimes(1))
    signals.trigger()
    await runPromise

    expect(loaderMock).toHaveBeenCalledWith({ configPath: `${process.env.RUN_TEST_CFG_DIR}/cfg.yml` })
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
      config: `${process.env.RUN_TEST_CFG_DIR}/cfg.yml`,
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

  it("rejects with clear error when --config points at a missing file", async () => {
    // ponytail: without this, a daemon started with a stale --config
    // (e.g. worktree removed) would boot, then every config-touch would
    // throw a confusing ConfigLoadError from inside chokidar's hot-reload.
    // Surface it once, at startup, with a fix-it message.
    await expect(
      run({
        config: "/definitely/does/not/exist/config.yml",
        frontendUrl: "http://x",
        xdgConfigHome: "/xdg",
        homeDir: "/home",
        signals: makeFakeSignals(),
        logger: silentLogger(),
      }),
    ).rejects.toThrow(/Config file not found/)
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
        config: `${process.env.RUN_TEST_CFG_DIR}/cfg.yml`,
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
      config: `${process.env.RUN_TEST_CFG_DIR}/cfg.yml`,
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

  it("non-deck config change broadcasts iframe-reload instead of restarting Vite", async () => {
    const outputClient = setHappyPath()
    const signals = makeFakeSignals()
    // First config load: no theme. Second config load: theme added — forces
    // the non-deck branch in handleConfigChange.
    let configCall = 0
    loaderMock.mockImplementation(() => {
      configCall += 1
      if (configCall === 1) {
        return { config: { decks: {} }, configDir: "/dir" }
      }
      return {
        config: { decks: {}, theme: "dark" },
        configDir: "/dir",
      }
    })
    const runPromise = run({
      config: `${process.env.RUN_TEST_CFG_DIR}/cfg.yml`,
      frontendUrl: "http://x",
      xdgConfigHome: "/xdg",
      homeDir: "/home",
      signals,
      logger: silentLogger(),
    })
    await vi.waitFor(() => expect(outputClient.init).toHaveBeenCalledTimes(1))
    await vi.waitFor(() => expect(configChangeCallback).not.toBeNull())
    // Trigger the config change callback registered by ConfigWatcher mock.
    configChangeCallback!()
    // handleConfigChange is fire-and-forget; wait until broadcast fires.
    expect(capturedBridge).not.toBeNull()
    await vi.waitFor(() =>
      expect(capturedBridge!.broadcast).toHaveBeenCalledWith({
        type: "iframe-reload",
      }),
    )
    // Critical: no vite restart — outputHandle.stop was not called again.
    const handle = await outputClient.init.mock.results[0]!.value
    expect(handle.stop).not.toHaveBeenCalled()
    expect(outputClient.init).toHaveBeenCalledTimes(1)
    signals.trigger()
    await runPromise
  })

  it("supervised child crash resolves the pipeline's done promise", async () => {
    const outputClient = setHappyPath()
    const signals = makeFakeSignals()
    const runPromise = run({
      config: `${process.env.RUN_TEST_CFG_DIR}/cfg.yml`,
      frontendUrl: "http://x",
      xdgConfigHome: "/xdg",
      homeDir: "/home",
      signals,
      logger: silentLogger(),
    })
    await vi.waitFor(() => expect(outputClient.init).toHaveBeenCalledTimes(1))
    const initOpts = outputClient.init.mock.calls[0]?.[0] as {
      onChildCrash?: () => void
    }
    expect(typeof initOpts.onChildCrash).toBe("function")
    // Simulate a supervised child crashing and exhausting its retry budget.
    initOpts.onChildCrash?.()
    await runPromise
    const handle = await outputClient.init.mock.results[0]!.value
    expect(handle.stop).toHaveBeenCalledTimes(1)
  })
})

describe("preflight", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("calls outputClient.validateReady()", async () => {
    const outputClient = setHappyPath()
    await preflight({
      config: `${process.env.RUN_TEST_CFG_DIR}/cfg.yml`,
      xdgConfigHome: "/xdg",
      homeDir: "/home",
      logger: silentLogger(),
    })
    expect(outputClient.validateReady).toHaveBeenCalledTimes(1)
  })

  it("propagates the friendly error from outputClient.validateReady()", async () => {
    const realClient = makeFakeOutputClient("real", [])
    realClient.validateReady.mockRejectedValueOnce(
      new Error(
        "No Stream Deck devices found. Connect a device and try again.",
      ),
    )
    setHappyPath({ outputClient: realClient })
    await expect(
      preflight({
        config: `${process.env.RUN_TEST_CFG_DIR}/cfg.yml`,
        xdgConfigHome: "/xdg",
        homeDir: "/home",
        logger: silentLogger(),
      }),
    ).rejects.toThrow(/No Stream Deck devices found/)
  })

  it("real client with no devices in non-TTY throws the friendly error", async () => {
    const realClient = makeFakeOutputClient("real", [])
    setHappyPath({ outputClient: realClient })
    const originalIsTTY = process.stdin.isTTY
    Object.defineProperty(process.stdin, "isTTY", {
      value: false,
      configurable: true,
    })
    try {
      await expect(
        preflight({
          config: `${process.env.RUN_TEST_CFG_DIR}/cfg.yml`,
          xdgConfigHome: "/xdg",
          homeDir: "/home",
          logger: silentLogger(),
        }),
      ).rejects.toThrow(/No Stream Deck devices found/)
      expect(realClient.validateReady).not.toHaveBeenCalled()
    } finally {
      Object.defineProperty(process.stdin, "isTTY", {
        value: originalIsTTY,
        configurable: true,
      })
    }
  })

  it("real client with no devices in TTY prompts and falls back to emulator on confirm", async () => {
    const realClient = makeFakeOutputClient("real", [])
    const emulatorClient = makeFakeOutputClient("emulator", [
      {
        id: "emulator:mk2",
        model: "mk2",
        keyCount: 15,
        label: "Emulator MK.2",
        transport: "emulated",
      },
    ])
    // First selectOutputClient call → realClient. Second call (after fallback)
    // → emulatorClient.
    selectOutputClientMock
      .mockReturnValueOnce(realClient)
      .mockReturnValueOnce(emulatorClient)
    const confirmMock = vi.fn(async () => true)
    vi.doMock("@inquirer/prompts", () => ({ confirm: confirmMock }))
    const originalIsTTY = process.stdin.isTTY
    Object.defineProperty(process.stdin, "isTTY", {
      value: true,
      configurable: true,
    })
    try {
      const opts: {
        config: string
        xdgConfigHome: string
        homeDir: string
        logger: ReturnType<typeof silentLogger>
        emulator?: boolean
      } = {
        config: `${process.env.RUN_TEST_CFG_DIR}/cfg.yml`,
        xdgConfigHome: "/xdg",
        homeDir: "/home",
        logger: silentLogger(),
      }
      await preflight(opts)
      expect(confirmMock).toHaveBeenCalledWith(
        expect.objectContaining({ default: true }),
      )
      expect(opts.emulator).toBe(true)
      expect(selectOutputClientMock).toHaveBeenCalledTimes(2)
      expect(selectOutputClientMock.mock.calls[1]?.[0]).toMatchObject({
        emulator: true,
      })
      expect(emulatorClient.validateReady).toHaveBeenCalled()
    } finally {
      Object.defineProperty(process.stdin, "isTTY", {
        value: originalIsTTY,
        configurable: true,
      })
      vi.doUnmock("@inquirer/prompts")
    }
  })

  it("real client with no devices in TTY throws when user declines fallback", async () => {
    const realClient = makeFakeOutputClient("real", [])
    setHappyPath({ outputClient: realClient })
    const confirmMock = vi.fn(async () => false)
    vi.doMock("@inquirer/prompts", () => ({ confirm: confirmMock }))
    const originalIsTTY = process.stdin.isTTY
    Object.defineProperty(process.stdin, "isTTY", {
      value: true,
      configurable: true,
    })
    try {
      await expect(
        preflight({
          config: `${process.env.RUN_TEST_CFG_DIR}/cfg.yml`,
          xdgConfigHome: "/xdg",
          homeDir: "/home",
          logger: silentLogger(),
        }),
      ).rejects.toThrow(/No Stream Deck devices found/)
      expect(confirmMock).toHaveBeenCalled()
    } finally {
      Object.defineProperty(process.stdin, "isTTY", {
        value: originalIsTTY,
        configurable: true,
      })
      vi.doUnmock("@inquirer/prompts")
    }
  })
})
