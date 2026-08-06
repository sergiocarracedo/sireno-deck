import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"
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
  writeConfigPath: vi.fn(),
  writeFlags: vi.fn(),
  readFlags: vi.fn(() => null),
  pruneStaleChildren: vi.fn(),
  terminateChildren: vi.fn(async () => undefined),
  removePidFile: vi.fn(),
  readPid: vi.fn(),
  acquireStartLock: vi.fn(() => ({ release: vi.fn() })),
  removeStartLock: vi.fn(),
  isRunning: vi.fn(() => false),
  resolveDaemonPaths: vi.fn(() => ({
    runtimeDir: "/run/user/0",
    pidFile: "/run/user/0/sireno-deck.pid",
    tokenFile: "/run/user/0/sireno-deck.token",
    childrenFile: "/run/user/0/sireno-deck.children.json",
    configPathFile: "/run/user/0/sireno-deck.config",
    flagsFile: "/run/user/0/sireno-deck.flags.json",
  })),
  generateToken: vi.fn(() => "test-token"),
  generateSentinel: vi.fn(() => "test-sentinel"),
  readToken: vi.fn(() => null),
  readConfigPath: vi.fn(() => null),
  writeToken: vi.fn(),
  removeTokenFile: vi.fn(),
  readChildren: vi.fn(() => null),
  writeChildren: vi.fn(),
  removeChildrenFile: vi.fn(),
  SENTINEL_ENV_VAR: "SIRENO_DAEMON_SENTINEL",
}))
vi.mock("../spawn-daemon", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    isUnderServiceManager: vi.fn(() =>
      Boolean(process.env["SIRENO_DAEMON_CHILD"]),
    ),
    spawnDetached: vi.fn(() => {
      const listeners: Record<string, Array<() => void>> = {}
      const child = {
        unref: (): void => undefined,
        once: (event: string, cb: () => void): void => {
          ;(listeners[event] ??= []).push(cb)
        },
        __triggerExit: (): void => {
          for (const cb of listeners.exit ?? []) cb()
        },
        __triggerSignal: (): void => {
          for (const cb of listeners.SIGINT ?? []) cb()
        },
      }
      return { pid: 99_999, child }
    }),
    watchFastFail: vi.fn(async () => undefined),
    __testHelpers: {
      triggerLastExit: (): void => undefined,
    },
  }
})
vi.mock("../service-manager", () => ({
  ensureInstalled: vi.fn(async () => undefined),
  invokeManager: vi.fn(async () => undefined),
  isUnitInstalled: vi.fn(() => true),
}))
vi.mock("@/deck", () => ({
  createDeckRuntime: vi.fn(),
  injectSystemButtons: vi.fn((decks: ReadonlyArray<unknown>) => decks),
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
vi.mock("@/system/setup-wizard", () => ({
  probeAll: vi.fn(async () => ({})),
  summarizeReport: vi.fn(() => ({
    ok: true,
    session: "unknown",
    packageManager: "none",
    missingCapabilities: [],
    udevMissing: false,
    configMissing: false,
    configPath: "",
    streamDeckConnected: false,
    lines: [],
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
    setSessionProvider: vi.fn(),
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
  createActiveAppProviderMock.mockResolvedValue(nullProvider())
  createSessionProviderMock.mockResolvedValue(nullProvider())
  createKeyMacroProviderMock.mockResolvedValue(nullProvider())

  const outputClient = makeFakeOutputClient("real")
  selectOutputClientMock.mockReturnValue(outputClient)
  return outputClient
}

describe("start", () => {
  let savedArgv1: string | undefined
  beforeAll(() => {
    // ponytail: --config now validates the path exists up-front.
    // Tests use a literal `${process.env.START_TEST_CFG_DIR}/cfg.yml`; create it on disk once so
    // the validator accepts it.
    const dir = mkdtempSync(join(tmpdir(), "start-test-"))
    process.env["START_TEST_CFG_DIR"] = dir
    writeFileSync(join(dir, "cfg.yml"), "decks: {}\n")
  })
  beforeEach(() => {
    vi.clearAllMocks()
    savedArgv1 = process.argv[1]
    // Simulate dev invocation (argv[1] is .ts) so forkOffDev path runs.
    process.argv[1] = "/tmp/sireno-deck/src/cli/main.ts"
  })
  afterEach(() => {
    vi.restoreAllMocks()
    process.argv[1] = savedArgv1
  })

  const awaitFork = async (): Promise<void> => {
    const { spawnDetached } = await import("../spawn-daemon")
    // ponytail: killPortListeners runs before forkOffDev inside start(), so
    // we need to wait for that microtask chain to settle before reading
    // mock.results. `waitFor` retries the assertion until spawnDetached has
    // been called, then fires the mock exit so the awaiting start() resolves.
    await vi.waitFor(() => {
      expect(spawnDetached).toHaveBeenCalledTimes(1)
    })
    const mock = vi.mocked(spawnDetached).mock.results[
      vi.mocked(spawnDetached).mock.results.length - 1
    ] as { type: string; value: { child: { __triggerExit: () => void } } }
    if (mock.type === "return") mock.value.child.__triggerExit()
  }

  it("forks off: calls spawnDetached and writePid with the spawned pid", async () => {
    setHappyPath()
    const { spawnDetached } = await import("../spawn-daemon")
    const startPromise = start({
      config: `${process.env.START_TEST_CFG_DIR}/cfg.yml`,
      frontendUrl: "http://x",
      xdgConfigHome: "/xdg",
      homeDir: "/home",
      logger: silentLogger(),
    })
    await awaitFork()
    await startPromise
    expect(spawnDetached).toHaveBeenCalledTimes(1)
    expect(writePidMock).toHaveBeenCalledWith(99_999)
  })

  it("persists the resolved config path so service run can find it", async () => {
    setHappyPath()
    const { writeConfigPath } = await import("@/util/daemon")
    const startPromise = start({
      config: `${process.env.START_TEST_CFG_DIR}/cfg.yml`,
      frontendUrl: "http://x",
      xdgConfigHome: "/xdg",
      homeDir: "/home",
      logger: silentLogger(),
    })
    await awaitFork()
    await startPromise
    expect(writeConfigPath).toHaveBeenCalledWith(
      `${process.env.START_TEST_CFG_DIR}/cfg.yml`,
    )
  })

  it("resolves immediately without blocking on the forked pipeline", async () => {
    setHappyPath()
    const startPromise = start({
      config: `${process.env.START_TEST_CFG_DIR}/cfg.yml`,
      frontendUrl: "http://x",
      xdgConfigHome: "/xdg",
      homeDir: "/home",
      logger: silentLogger(),
    })

    await expect(
      Promise.race([startPromise, new Promise((r) => setTimeout(r, 10))]),
    ).resolves.toBeUndefined()
    await awaitFork()
  })

  it("rejects with a clear error if preflight fails in-process (SIRENO_DAEMON_CHILD=1)", async () => {
    process.env["SIRENO_DAEMON_CHILD"] = "1"
    try {
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
          config: `${process.env.START_TEST_CFG_DIR}/cfg.yml`,
          frontendUrl: "http://x",
          xdgConfigHome: "/xdg",
          homeDir: "/home",
          logger: silentLogger(),
        }),
      ).rejects.toThrow(/Config validation failed/)

      expect(writePidMock).not.toHaveBeenCalled()
      expect(selectOutputClientMock).not.toHaveBeenCalled()
    } finally {
      delete process.env["SIRENO_DAEMON_CHILD"]
    }
  })

  // ponytail: Fix A1 — the start lock used to leak on every runInProcess exit
  // because nothing called startLock.release(). Verify it's released both on
  // a thrown setup (preflight failure) and on a clean in-process run that
  // races through the pipeline.
  const lastRelease = async (): Promise<ReturnType<typeof vi.fn>> => {
    const { acquireStartLock } = await import("@/util/daemon")
    const last = (
      acquireStartLock as unknown as { mock: { results: unknown[] } }
    ).mock.results.at(-1) as {
      type: string
      value: { release: ReturnType<typeof vi.fn> }
    }
    expect(last.type).toBe("return")
    return last.value.release
  }

  it("releases the start lock when preflight throws", async () => {
    process.env["SIRENO_DAEMON_CHILD"] = "1"
    try {
      loaderMock.mockReturnValue({ config: { decks: {} }, configDir: "/d" })
      builtinsMock.mockReturnValue(undefined)
      validateFullMock.mockReturnValue({
        issues: [{ level: "error", path: "x", message: "bad" }],
      })
      isFullValidMock.mockReturnValue(false)

      await expect(
        start({
          config: `${process.env.START_TEST_CFG_DIR}/cfg.yml`,
          frontendUrl: "http://x",
          xdgConfigHome: "/xdg",
          homeDir: "/home",
          logger: silentLogger(),
        }),
      ).rejects.toThrow(/Config validation failed/)

      expect(await lastRelease()).toHaveBeenCalledTimes(1)
    } finally {
      delete process.env["SIRENO_DAEMON_CHILD"]
    }
  })

  it("releases the start lock on a successful in-process start", async () => {
    process.env["SIRENO_DAEMON_CHILD"] = "1"
    // ponytail: runInProcess's runPipeline().finally() calls process.exit(0)
    // after cleanup. Without a spy, that would kill the vitest worker before
    // we can assert against the lock release. Stub it for the duration.
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never)
    try {
      setHappyPath()
      const startPromise = start({
        config: `${process.env.START_TEST_CFG_DIR}/cfg.yml`,
        frontendUrl: "http://x",
        xdgConfigHome: "/xdg",
        homeDir: "/home",
        logger: silentLogger(),
      })
      // runInProcess awaits runPipeline().finally(...) before returning;
      // give the microtask queue a turn to settle, then assert release ran.
      await vi.waitFor(async () => {
        expect(await lastRelease()).toHaveBeenCalled()
      })
      await startPromise
      expect(await lastRelease()).toHaveBeenCalledTimes(1)
      expect(exitSpy).toHaveBeenCalled()
    } finally {
      exitSpy.mockRestore()
      delete process.env["SIRENO_DAEMON_CHILD"]
    }
  })
})
