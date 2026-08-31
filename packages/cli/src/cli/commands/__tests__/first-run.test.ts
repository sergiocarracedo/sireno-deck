import { mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

vi.mock("@/config/loader", () => ({ loadConfig: vi.fn() }))
vi.mock("@/addon/registry", () => ({ AddonRegistry: vi.fn() }))
vi.mock("@/builtin-addons", () => ({ registerBuiltins: vi.fn() }))
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
vi.mock("@/util/device-config", () => ({ loadDeviceConfig: vi.fn() }))
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
  readPid: vi.fn(() => null),
  acquireStartLock: vi.fn(() => ({ release: vi.fn() })),
  removeStartLock: vi.fn(),
  isRunning: vi.fn(() => false),
  resolveDaemonPaths: vi.fn(() => ({
    runtimeDir: "/run/user/0",
    pidFile: "/run/user/0/sirenodeck.pid",
    tokenFile: "/run/user/0/sirenodeck.token",
    childrenFile: "/run/user/0/sirenodeck.children.json",
    configPathFile: "/run/user/0/sirenodeck.config",
    flagsFile: "/run/user/0/sirenodeck.flags.json",
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
  writeRuntimeState: vi.fn(),
  readRuntimeState: vi.fn(() => null),
  removeRuntimeStateFile: vi.fn(),
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
      }
      return { pid: 99_999, child }
    }),
    watchFastFail: vi.fn(async () => undefined),
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
    setAddonInventory: vi.fn(),
    setDeckTree: vi.fn(),
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
const setupWizardMock = {
  probeAllCached: vi.fn(),
  summarizeReport: vi.fn(),
}
vi.mock("@/system/setup-wizard", async (importOriginal) => ({
  ...(await importOriginal()),
  ...setupWizardMock,
}))
const systemRequirementsMock = vi.fn(async () => undefined)
vi.mock("../system-requirements", () => ({
  default: systemRequirementsMock,
  systemRequirements: systemRequirementsMock,
  systemRequirementsCommand: { command: "system-requirements" },
}))
const inquirerConfirmMock = vi.fn()
vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  note: vi.fn(),
  log: { info: vi.fn(), success: vi.fn(), warn: vi.fn(), error: vi.fn() },
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn(), message: vi.fn() })),
  select: vi.fn(),
  confirm: inquirerConfirmMock,
  text: vi.fn(),
  password: vi.fn(),
  isCancel: vi.fn(),
  cancel: vi.fn(),
  tasks: vi.fn(),
}))

const probeAllCachedMock = (
  setupWizardMock as unknown as { probeAllCached: ReturnType<typeof vi.fn> }
).probeAllCached
const summarizeReportMock = (
  setupWizardMock as unknown as { summarizeReport: ReturnType<typeof vi.fn> }
).summarizeReport

const loaderMock = (await import("@/config/loader"))
  .loadConfig as unknown as ReturnType<typeof vi.fn>
const builtinsMock = (await import("@/builtin-addons"))
  .registerBuiltins as unknown as ReturnType<typeof vi.fn>
const validateFullMock = (await import("@/config/validation"))
  .validateFull as unknown as ReturnType<typeof vi.fn>
const isFullValidMock = (await import("@/config/validation"))
  .isFullValid as unknown as ReturnType<typeof vi.fn>
const registryCtorMock = (await import("@/addon/registry"))
  .AddonRegistry as unknown as ReturnType<typeof vi.fn>
const loadDeviceConfigMock = (await import("@/util/device-config"))
  .loadDeviceConfig as unknown as ReturnType<typeof vi.fn>
const selectOutputClientMock = (await import("@/outputClient"))
  .selectOutputClient as unknown as ReturnType<typeof vi.fn>
const createDeckRuntimeMock = (await import("@/deck"))
  .createDeckRuntime as unknown as ReturnType<typeof vi.fn>
const createActiveAppProviderMock = (
  await import("@/system/providers/active-app")
).createActiveAppProvider as unknown as ReturnType<typeof vi.fn>
const createSessionProviderMock = (await import("@/system/providers/session"))
  .createSessionProvider as unknown as ReturnType<typeof vi.fn>
const createKeyMacroProviderMock = (
  await import("@/system/providers/key-macro")
).createKeyMacroProvider as unknown as ReturnType<typeof vi.fn>

const { createLogger } = await import("@/util/logger")
const start = (await import("../start")).default

const silentLogger = () => createLogger({ level: "silent" })

const setHappyPath = (): void => {
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
  selectOutputClientMock.mockReturnValue({
    kind: "real",
    validateReady: vi.fn(async () => undefined),
    listDevices: vi.fn(async () => []),
    selectDevice: vi.fn(async () => undefined),
    storeSelection: vi.fn(async () => undefined),
    init: vi.fn(async () => ({
      descriptor: {
        id: "X",
        model: "mk2",
        keyCount: 15,
        label: "X",
        transport: "real" as const,
      },
      frontendUrl: "http://x",
      childPids: [],
      stop: vi.fn(async () => undefined),
    })),
  })
}

interface FakeSummary {
  ok: boolean
  session: "wayland" | "x11" | "unknown"
  packageManager: "apt" | "dnf" | "pacman" | "zypper" | "brew" | "none"
  missingCapabilities: ReadonlyArray<string>
  udevMissing: boolean
  configMissing: boolean
  configPath: string
  streamDeckConnected: boolean
  lines: ReadonlyArray<string>
}

const happySummary = (): FakeSummary => ({
  ok: true,
  session: "wayland",
  packageManager: "apt",
  missingCapabilities: [],
  udevMissing: false,
  configMissing: false,
  configPath: "/home/x/.config/sirenodeck/config.yml",
  streamDeckConnected: false,
  lines: ["ok"],
})

const configMissingSummary = (): FakeSummary => ({
  ok: false,
  session: "wayland",
  packageManager: "apt",
  missingCapabilities: [],
  udevMissing: false,
  configMissing: true,
  configPath: "/home/x/.config/sirenodeck/config.yml",
  streamDeckConnected: false,
  lines: ["config missing"],
})

const capabilityMissingSummary = (): FakeSummary => ({
  ok: false,
  session: "x11",
  packageManager: "apt",
  missingCapabilities: ["keyMacro"],
  udevMissing: false,
  configMissing: false,
  configPath: "/home/x/.config/sirenodeck/config.yml",
  streamDeckConnected: false,
  lines: ["keyMacro missing"],
})

const awaitFork = async (): Promise<void> => {
  const { spawnDetached } = await import("../spawn-daemon")
  await vi.waitFor(() => {
    expect(spawnDetached).toHaveBeenCalledTimes(1)
  })
  const mock = vi.mocked(spawnDetached).mock.results[
    vi.mocked(spawnDetached).mock.results.length - 1
  ] as { type: string; value: { child: { __triggerExit: () => void } } }
  if (mock.type === "return") mock.value.child.__triggerExit()
}

const setSummary = (summary: FakeSummary): void => {
  probeAllCachedMock.mockResolvedValue({} as never)
  summarizeReportMock.mockReturnValue(summary)
}

describe("start first-run wizard hook", () => {
  let savedArgv1: string | undefined
  let savedExitCode: string | number | null | undefined
  let savedIsTTY: boolean | undefined

  beforeAll(() => {
    const dir = mkdtempSync(join(tmpdir(), "first-run-test-"))
    process.env["START_TEST_CFG_DIR"] = dir
    writeFileSync(join(dir, "cfg.yml"), "decks: {}\n")
  })

  beforeEach(() => {
    vi.clearAllMocks()
    savedArgv1 = process.argv[1]
    savedExitCode = process.exitCode
    savedIsTTY = process.stdin.isTTY
    process.argv[1] = "/tmp/sirenodeck/src/cli/main.ts"
    process.exitCode = 0
    setHappyPath()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    process.argv[1] = savedArgv1 ?? "/usr/bin/node"
    process.exitCode = savedExitCode
    Object.defineProperty(process.stdin, "isTTY", {
      value: savedIsTTY,
      configurable: true,
      writable: true,
    })
  })

  const setTty = (isTTY: boolean): void => {
    Object.defineProperty(process.stdin, "isTTY", {
      value: isTTY,
      configurable: true,
      writable: true,
    })
  }

  it("does not invoke the wizard when nothing is missing", async () => {
    setSummary(happySummary())
    setTty(true)
    const startPromise = start({
      config: `${process.env["START_TEST_CFG_DIR"]}/cfg.yml`,
      frontendUrl: "http://x",
      xdgConfigHome: "/xdg",
      homeDir: "/home",
      logger: silentLogger(),
    })
    await awaitFork()
    await startPromise
    expect(inquirerConfirmMock).not.toHaveBeenCalled()
    expect(systemRequirementsMock).not.toHaveBeenCalled()
    expect(process.exitCode).toBe(0)
  })

  it("exits non-zero without prompting when config missing and no TTY", async () => {
    setSummary(configMissingSummary())
    setTty(false)
    const startPromise = start({
      config: `${process.env["START_TEST_CFG_DIR"]}/cfg.yml`,
      frontendUrl: "http://x",
      xdgConfigHome: "/xdg",
      homeDir: "/home",
      logger: silentLogger(),
    })
    await awaitFork()
    await startPromise
    expect(inquirerConfirmMock).not.toHaveBeenCalled()
    expect(systemRequirementsMock).not.toHaveBeenCalled()
    expect(process.exitCode).toBe(1)
  })

  it("runs the wizard when config is missing and user accepts", async () => {
    setSummary(configMissingSummary())
    setSummary(configMissingSummary())
    setTty(true)
    inquirerConfirmMock.mockResolvedValueOnce(true)
    const startPromise = start({
      config: `${process.env["START_TEST_CFG_DIR"]}/cfg.yml`,
      frontendUrl: "http://x",
      xdgConfigHome: "/xdg",
      homeDir: "/home",
      logger: silentLogger(),
    })
    await awaitFork()
    await startPromise
    expect(inquirerConfirmMock).toHaveBeenCalledTimes(1)
    expect(systemRequirementsMock).toHaveBeenCalledTimes(1)
    expect(process.exitCode).toBe(1)
  })

  it("skips the wizard when user declines", async () => {
    setSummary(configMissingSummary())
    setTty(true)
    inquirerConfirmMock.mockResolvedValueOnce(false)
    const startPromise = start({
      config: `${process.env["START_TEST_CFG_DIR"]}/cfg.yml`,
      frontendUrl: "http://x",
      xdgConfigHome: "/xdg",
      homeDir: "/home",
      logger: silentLogger(),
    })
    await awaitFork()
    await startPromise
    expect(inquirerConfirmMock).toHaveBeenCalledTimes(1)
    expect(systemRequirementsMock).not.toHaveBeenCalled()
    expect(process.exitCode).toBe(0)
  })

  it("does not exit non-zero when wizard resolves all missing capabilities", async () => {
    summarizeReportMock
      .mockReturnValueOnce(capabilityMissingSummary())
      .mockReturnValueOnce(happySummary())
    probeAllCachedMock.mockResolvedValue({} as never)
    setTty(true)
    inquirerConfirmMock.mockResolvedValueOnce(true)
    const startPromise = start({
      config: `${process.env["START_TEST_CFG_DIR"]}/cfg.yml`,
      frontendUrl: "http://x",
      xdgConfigHome: "/xdg",
      homeDir: "/home",
      logger: silentLogger(),
    })
    await awaitFork()
    await startPromise
    expect(systemRequirementsMock).toHaveBeenCalledTimes(1)
    expect(process.exitCode).toBe(0)
  })
})
