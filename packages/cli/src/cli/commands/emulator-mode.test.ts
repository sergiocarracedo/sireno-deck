import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}));

const spawnMock = (await import("node:child_process")).spawn as unknown as ReturnType<typeof vi.fn>;

vi.mock("@/render/ws-bridge", () => ({
  startWsBridge: vi.fn(),
}));

const { startWsBridge } = await import("@/render/ws-bridge");
const bridgeMock = startWsBridge as unknown as ReturnType<typeof vi.fn>;

const { createLogger } = await import("@/util/logger");
const { runEmulatorMode } = await import("./emulator-mode.ts");

const silentLogger = () => createLogger({ level: "silent" });

interface FakeChild {
  stdout: { on: (event: string, cb: (chunk: Buffer) => void) => void };
  stderr: { on: (event: string, cb: (chunk: Buffer) => void) => void };
  on: (event: string, cb: (...args: unknown[]) => void) => void;
  once: (event: string, cb: (...args: unknown[]) => void) => void;
  kill: ReturnType<typeof vi.fn>;
  exitCode: number | null;
  emitStdout(chunk: string): void;
  emitStderr(chunk: string): void;
  emit(event: string, ...args: unknown[]): void;
  markExit(): void;
}

const makeFakeChild = (): FakeChild => {
  const processHandlers: Record<string, Array<(...args: unknown[]) => void>> = {};
  const stdoutHandlers: Array<(chunk: Buffer) => void> = [];
  const stderrHandlers: Array<(chunk: Buffer) => void> = [];

  const child: FakeChild = {
    stdout: {
      on: (_event: string, cb: (chunk: Buffer) => void) => {
        stdoutHandlers.push(cb);
      },
    },
    stderr: {
      on: (_event: string, cb: (chunk: Buffer) => void) => {
        stderrHandlers.push(cb);
      },
    },
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      processHandlers[event] = processHandlers[event] ?? [];
      processHandlers[event]!.push(cb);
    }),
    once: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      processHandlers[event] = processHandlers[event] ?? [];
      const wrapper = (...args: unknown[]): void => {
        const list = processHandlers[event];
        if (list !== undefined) {
          const i = list.indexOf(wrapper);
          if (i >= 0) list.splice(i, 1);
        }
        cb(...args);
      };
      processHandlers[event]!.push(wrapper);
    }),
    kill: vi.fn(),
    exitCode: null,
    emitStdout: (chunk: string) => {
      for (const cb of stdoutHandlers) cb(Buffer.from(chunk));
    },
    emitStderr: (chunk: string) => {
      for (const cb of stderrHandlers) cb(Buffer.from(chunk));
    },
    emit: (event: string, ...args: unknown[]) => {
      const list = processHandlers[event];
      if (list !== undefined) {
        processHandlers[event] = [];
        for (const cb of list) cb(...args);
      }
    },
    markExit: () => {
      child.exitCode = 0;
      child.emit("exit", 0);
    },
  };
  return child;
};

const makeBridgeStub = (port: number, url: string) => {
  const messageHandlers: Array<(m: unknown, s: unknown) => void> = [];
  return {
    url,
    port,
    broadcast: vi.fn(),
    sendToCaller: vi.fn(),
    onMessage: (handler: (m: unknown, s: unknown) => void) => {
      messageHandlers.push(handler);
    },
    onConnection: vi.fn(),
    close: vi.fn(async () => undefined),
    __trigger: (m: unknown) => {
      for (const h of messageHandlers) h(m, {});
    },
  };
};

describe("runEmulatorMode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("spawns vite via pnpm filter with --port", async () => {
    const child = makeFakeChild();
    spawnMock.mockReturnValue(child);
    const bridge = makeBridgeStub(54321, "ws://127.0.0.1:54321");
    bridgeMock.mockResolvedValue(bridge);

    const promise = runEmulatorMode({ logger: silentLogger() });

    await new Promise((r) => setTimeout(r, 10));
    child.emitStdout(
      "  \u001b[32m\u001b[1mLocal\u001b[22m:   \u001b[36mhttp://127.0.0.1:\u001b[1m52938\u001b[22m/\u001b[39m\n",
    );

    const handle = await promise;
    expect(spawnMock).toHaveBeenCalledWith(
      "pnpm",
      ["--filter", "@sireno-deck-2/frontend-emulator", "run", "dev", "--", "--port", "52938"],
      expect.objectContaining({ stdio: ["ignore", "pipe", "pipe"] }),
    );
    expect(handle.frontendUrl).toBe("http://127.0.0.1:52938");
    expect(handle.wsUrl).toBe("ws://127.0.0.1:54321");
  });

  it("starts WS bridge", async () => {
    const child = makeFakeChild();
    spawnMock.mockReturnValue(child);
    bridgeMock.mockResolvedValue(makeBridgeStub(12345, "ws://127.0.0.1:12345"));

    const promise = runEmulatorMode({ logger: silentLogger() });
    await new Promise((r) => setTimeout(r, 10));
    child.emitStdout("Local:   http://127.0.0.1:52938/\n");
    const handle = await promise;

    expect(bridgeMock).toHaveBeenCalled();
    expect(handle.wsUrl).toBe("ws://127.0.0.1:12345");
  });

  it("stop() closes the bridge then kills the vite child", async () => {
    const child = makeFakeChild();
    spawnMock.mockReturnValue(child);
    const bridge = makeBridgeStub(12345, "ws://127.0.0.1:12345");
    bridgeMock.mockResolvedValue(bridge);

    const promise = runEmulatorMode({ logger: silentLogger() });
    await new Promise((r) => setTimeout(r, 10));
    child.emitStdout("Local:   http://127.0.0.1:52938/\n");
    const handle = await promise;

    const stopPromise = handle.stop();
    queueMicrotask(() => child.markExit());
    await stopPromise;

    expect(bridge.close).toHaveBeenCalledTimes(1);
    expect(child.kill).toHaveBeenCalledWith("SIGTERM");
  });

  it("registers a button-action handler that logs (placeholder for Phase 09 runtime dispatch)", async () => {
    const child = makeFakeChild();
    spawnMock.mockReturnValue(child);
    const bridge = makeBridgeStub(12345, "ws://127.0.0.1:12345");
    bridgeMock.mockResolvedValue(bridge);
    const logger = silentLogger();
    const infoSpy = vi.spyOn(logger, "info");

    const promise = runEmulatorMode({ logger });
    await new Promise((r) => setTimeout(r, 10));
    child.emitStdout("Local:   http://127.0.0.1:52938/\n");
    const handle = await promise;
    void handle;

    bridge.__trigger({
      type: "button-action",
      deckId: "main",
      position: 0,
      gesture: "tap",
    });
    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({ deckId: "main", position: 0, gesture: "tap" }),
      expect.stringContaining("button-action received"),
    );
  });

  it("ignores non-button-action WS messages", async () => {
    const child = makeFakeChild();
    spawnMock.mockReturnValue(child);
    const bridge = makeBridgeStub(12345, "ws://127.0.0.1:12345");
    bridgeMock.mockResolvedValue(bridge);
    const logger = silentLogger();
    const infoSpy = vi.spyOn(logger, "info");

    const promise = runEmulatorMode({ logger });
    await new Promise((r) => setTimeout(r, 10));
    child.emitStdout("Local:   http://127.0.0.1:52938/\n");
    const handle = await promise;
    void handle;

    bridge.__trigger({ type: "hello", version: 3, token: null });
    expect(infoSpy).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining("button-action"),
    );
  });

  it("rejects when vite child exits before becoming ready", async () => {
    const child = makeFakeChild();
    spawnMock.mockReturnValue(child);
    bridgeMock.mockResolvedValue(makeBridgeStub(1, "ws://x"));

    const promise = runEmulatorMode({ logger: silentLogger() });
    await new Promise((r) => setTimeout(r, 10));
    child.emit("exit", 1);

    await expect(promise).rejects.toThrow(/exited/);
  });
});
