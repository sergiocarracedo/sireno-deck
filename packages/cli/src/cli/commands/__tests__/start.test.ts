import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/config/loader", () => ({
  loadConfig: vi.fn(),
}));
vi.mock("@/addon/registry", () => ({
  AddonRegistry: vi.fn(),
}));
vi.mock("@/builtin-addons", () => ({
  registerBuiltins: vi.fn(),
}));
vi.mock("@/config/validation", () => ({
  validateFull: vi.fn(),
  isFullValid: vi.fn(),
  formatFullIssues: vi.fn(),
}));
vi.mock("@/device/registry", () => ({
  listDevices: vi.fn(),
}));
vi.mock("@/device/stream-deck", () => ({
  connectStreamDeck: vi.fn(),
  StreamDeckSelectionError: class StreamDeckSelectionError extends Error {},
}));
vi.mock("@/system/device-selection", () => ({
  selectDevice: vi.fn(),
  NoStreamDeckFoundError: class NoStreamDeckFoundError extends Error {},
}));
vi.mock("@/util/device-config", () => ({
  loadDeviceConfig: vi.fn(),
  saveDeviceConfig: vi.fn(),
}));
vi.mock("@/cli/commands/real-mode", () => ({
  runRealMode: vi.fn(),
}));
vi.mock("@/system/brightness", () => ({
  createBrightnessProvider: vi.fn(() => ({
    getCurrent: vi.fn(async () => ({ value: 50, max: 100 })),
    setBrightness: vi.fn(async () => undefined),
    stop: vi.fn(async () => undefined),
  })),
}));
vi.mock("@/system/clipboard", () => ({
  createClipboardProvider: vi.fn(() => ({
    writeText: vi.fn(async () => undefined),
    readText: vi.fn(async () => ""),
    stop: vi.fn(async () => undefined),
  })),
}));
vi.mock("../http-server", () => ({
  startHttpServer: vi.fn(async () => ({
    port: 3939,
    stop: vi.fn(async () => undefined),
  })),
}));
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
}));
vi.mock("@/deck", () => ({
  createDeckRuntime: vi.fn(),
}));
vi.mock("@/system/active-app", () => ({
  createActiveAppProvider: vi.fn(),
}));
vi.mock("@/system/session-monitor", () => ({
  createSessionProvider: vi.fn(),
}));
vi.mock("@/system/key-macro", () => ({
  createKeyMacroProvider: vi.fn(),
}));
vi.mock("@/system/media", () => ({
  createMediaProvider: vi.fn(),
}));

const loaderMod = await import("@/config/loader");
const registryMod = await import("@/addon/registry");
const builtinsMod = await import("@/builtin-addons");
const validationMod = await import("@/config/validation");
const deviceRegMod = await import("@/device/registry");
const deviceMod = await import("@/device/stream-deck");
const selMod = await import("@/system/device-selection");
const cfgMod = await import("@/util/device-config");
const realMod = await import("@/cli/commands/real-mode");
const daemonMod = await import("@/util/daemon");
const deckMod = await import("@/deck");
const activeAppMod = await import("@/system/active-app");
const sessionMod = await import("@/system/session-monitor");
const keyMacroMod = await import("@/system/key-macro");
const mediaMod = await import("@/system/media");

const loaderMock = loaderMod.loadConfig as unknown as ReturnType<typeof vi.fn>;
const registryCtorMock = registryMod.AddonRegistry as unknown as ReturnType<typeof vi.fn>;
const builtinsMock = builtinsMod.registerBuiltins as unknown as ReturnType<typeof vi.fn>;
const validateFullMock = validationMod.validateFull as unknown as ReturnType<typeof vi.fn>;
const isFullValidMock = validationMod.isFullValid as unknown as ReturnType<typeof vi.fn>;
const listDevicesMock = deviceRegMod.listDevices as unknown as ReturnType<typeof vi.fn>;
const connectMock = deviceMod.connectStreamDeck as unknown as ReturnType<typeof vi.fn>;
const selectDeviceMock = selMod.selectDevice as unknown as ReturnType<typeof vi.fn>;
const loadDeviceConfigMock = cfgMod.loadDeviceConfig as unknown as ReturnType<typeof vi.fn>;
const saveDeviceConfigMock = cfgMod.saveDeviceConfig as unknown as ReturnType<typeof vi.fn>;
const runRealModeMock = realMod.runRealMode as unknown as ReturnType<typeof vi.fn>;
const writePidMock = daemonMod.writePid as unknown as ReturnType<typeof vi.fn>;
const removePidFileMock = daemonMod.removePidFile as unknown as ReturnType<typeof vi.fn>;
const createDeckRuntimeMock = (
  deckMod as unknown as { createDeckRuntime: ReturnType<typeof vi.fn> }
).createDeckRuntime;
const createActiveAppProviderMock = (
  activeAppMod as unknown as { createActiveAppProvider: ReturnType<typeof vi.fn> }
).createActiveAppProvider;
const createSessionProviderMock = (
  sessionMod as unknown as { createSessionProvider: ReturnType<typeof vi.fn> }
).createSessionProvider;
const createKeyMacroProviderMock = (
  keyMacroMod as unknown as { createKeyMacroProvider: ReturnType<typeof vi.fn> }
).createKeyMacroProvider;
const createMediaProviderMock = (
  mediaMod as unknown as { createMediaProvider: ReturnType<typeof vi.fn> }
).createMediaProvider;

const { createLogger } = await import("@/util/logger");
const start = (await import("../start")).default;

const silentLogger = () => createLogger({ level: "silent" });

const setHappyPath = (): void => {
  loaderMock.mockReturnValue({ config: { decks: {} }, configDir: "/d" });
  registryCtorMock.mockImplementation(function FakeRegistry() {
    return {
      hasButtonType: () => true,
      getButtonType: () => ({ def: { internal: false } }),
      resolveActiveTheme: () => ({
        name: "default",
        cssPath: "/theme.css",
        frontendPath: "/index",
      }),
    };
  });
  builtinsMock.mockReturnValue(undefined);
  validateFullMock.mockReturnValue({ issues: [] });
  isFullValidMock.mockReturnValue(true);
  listDevicesMock.mockResolvedValue([{ serial: "ABC", path: "/p", model: "original-mk2" }]);
  loadDeviceConfigMock.mockReturnValue(null);
  selectDeviceMock.mockResolvedValue({
    descriptor: { serial: "ABC", path: "/p", model: "original-mk2" },
    savedButStale: false,
  });
  saveDeviceConfigMock.mockReturnValue(undefined);
  connectMock.mockResolvedValue({
    serial: "ABC",
    path: "/p",
    model: "original-mk2",
    getKeyCount: () => 15,
    setBrightness: vi.fn(async () => undefined),
    fillKeyBuffer: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
  });
  runRealModeMock.mockImplementation(() => new Promise(() => undefined));

  const nullProvider = () => ({
    async getActive() {
      return null;
    },
    subscribe() {
      return () => undefined;
    },
    async stop() {
      return;
    },
    async sendKey() {
      return;
    },
    async play() {
      return;
    },
    async pause() {
      return;
    },
    async toggle() {
      return;
    },
    async next() {
      return;
    },
    async previous() {
      return;
    },
    async getCurrent() {
      return null;
    },
    onChange() {
      return () => undefined;
    },
    getState() {
      return "unknown" as const;
    },
  });
  const fakeRuntime = {
    setActiveAppProvider: vi.fn(),
    stopActiveAppPolling: vi.fn(async () => undefined),
  };
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
    pubSub: { publish: () => undefined, subscribe: () => () => undefined, clear: () => undefined },
    store: { get: () => undefined, set: () => undefined, delete: () => undefined },
  });
  createActiveAppProviderMock.mockResolvedValue(nullProvider());
  createSessionProviderMock.mockResolvedValue(nullProvider());
  createKeyMacroProviderMock.mockResolvedValue(nullProvider());
  createMediaProviderMock.mockResolvedValue(nullProvider());
};

describe("start", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls writePid with current process pid", async () => {
    setHappyPath();
    await start({
      config: "/abs/cfg.yml",
      frontendUrl: "http://x",
      xdgConfigHome: "/xdg",
      homeDir: "/home",
      logger: silentLogger(),
    });
    expect(writePidMock).toHaveBeenCalledWith(process.pid);
  });

  it("resolves immediately without blocking on runRealMode pipeline", async () => {
    setHappyPath();
    runRealModeMock.mockImplementation(() => new Promise(() => undefined));

    const startPromise = start({
      config: "/abs/cfg.yml",
      frontendUrl: "http://x",
      xdgConfigHome: "/xdg",
      homeDir: "/home",
      logger: silentLogger(),
    });

    await expect(
      Promise.race([startPromise, new Promise((r) => setTimeout(r, 10))]),
    ).resolves.toBeUndefined();
    await vi.waitFor(() => expect(runRealModeMock).toHaveBeenCalledTimes(1));
  });

  it("removes the pid file when the background pipeline completes", async () => {
    setHappyPath();
    const handlers: Array<() => void> = [];
    const signals = {
      onSignal: (handler: () => void): (() => void) => {
        handlers.push(handler);
        return () => {};
      },
    };
    runRealModeMock.mockResolvedValue({
      stop: vi.fn(async () => undefined),
    });

    await start({
      config: "/abs/cfg.yml",
      frontendUrl: "http://x",
      xdgConfigHome: "/xdg",
      homeDir: "/home",
      signals,
      logger: silentLogger(),
    });

    expect(removePidFileMock).not.toHaveBeenCalled();

    await vi.waitFor(() => expect(handlers).toHaveLength(1));
    for (const h of handlers) h();

    await vi.waitFor(() => expect(removePidFileMock).toHaveBeenCalledTimes(1));
  });

  it("rejects with a clear error if preflight fails before the pipeline starts", async () => {
    loaderMock.mockReturnValue({ config: { decks: {} }, configDir: "/d" });
    registryCtorMock.mockImplementation(function FakeRegistry() {
      return {
        hasButtonType: () => true,
        getButtonType: () => ({ def: { internal: false } }),
        resolveActiveTheme: () => ({
          name: "default",
          cssPath: "/theme.css",
          frontendPath: "/index",
        }),
      };
    });
    builtinsMock.mockReturnValue(undefined);
    validateFullMock.mockReturnValue({ issues: [{ level: "error", path: "x", message: "bad" }] });
    isFullValidMock.mockReturnValue(false);

    await expect(
      start({
        config: "/abs/cfg.yml",
        frontendUrl: "http://x",
        xdgConfigHome: "/xdg",
        homeDir: "/home",
        logger: silentLogger(),
      }),
    ).rejects.toThrow(/Config validation failed/);

    expect(writePidMock).not.toHaveBeenCalled();
    expect(runRealModeMock).not.toHaveBeenCalled();
  });
});
