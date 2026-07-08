import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}))

const spawnMock = (await import("node:child_process"))
  .spawn as unknown as ReturnType<typeof vi.fn>

vi.mock("@/render/ws-bridge", async () => {
  const actual =
    await vi.importActual<typeof import("@/render/ws-bridge")>(
      "@/render/ws-bridge",
    )
  return {
    ...actual,
    startWsBridge: vi.fn(),
  }
})

const { startWsBridge } = await import("@/render/ws-bridge")
const bridgeMock = startWsBridge as unknown as ReturnType<typeof vi.fn>

const { createLogger } = await import("@/util/logger")
const { EmulatorOutputClient } = await import("../emulator")
const { createRuntime } = await import("@/deck/runtime")

const silentLogger = () => createLogger({ level: "silent" })

interface FakeChild {
  stdout: { on: (event: string, cb: (chunk: Buffer) => void) => void }
  stderr: { on: (event: string, cb: (chunk: Buffer) => void) => void }
  on: (event: string, cb: (...args: unknown[]) => void) => void
  once: (event: string, cb: (...args: unknown[]) => void) => void
  kill: ReturnType<typeof vi.fn>
  pid?: number
  exitCode: number | null
  emitStdout(chunk: string): void
  emitStderr(chunk: string): void
  emit(event: string, ...args: unknown[]): void
  markExit(): void
}

const makeFakeChild = (): FakeChild => {
  const processHandlers: Record<
    string,
    Array<(...args: unknown[]) => void>
  > = {}
  const stdoutHandlers: Array<(chunk: Buffer) => void> = []
  const stderrHandlers: Array<(chunk: Buffer) => void> = []

  let counter = 100
  const child: FakeChild = {
    stdout: {
      on: (_event: string, cb: (chunk: Buffer) => void) => {
        stdoutHandlers.push(cb)
      },
    },
    stderr: {
      on: (_event: string, cb: (chunk: Buffer) => void) => {
        stderrHandlers.push(cb)
      },
    },
    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      processHandlers[event] = processHandlers[event] ?? []
      processHandlers[event]!.push(cb)
    }),
    once: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
      processHandlers[event] = processHandlers[event] ?? []
      const wrapper = (...args: unknown[]): void => {
        const list = processHandlers[event]
        if (list !== undefined) {
          const i = list.indexOf(wrapper)
          if (i >= 0) list.splice(i, 1)
        }
        cb(...args)
      }
      processHandlers[event]!.push(wrapper)
    }),
    kill: vi.fn(),
    pid: ++counter,
    exitCode: null,
    emitStdout: (chunk: string) => {
      for (const cb of stdoutHandlers) cb(Buffer.from(chunk))
    },
    emitStderr: (chunk: string) => {
      for (const cb of stderrHandlers) cb(Buffer.from(chunk))
    },
    emit: (event: string, ...args: unknown[]) => {
      const list = processHandlers[event]
      if (list !== undefined) {
        processHandlers[event] = []
        for (const cb of list) cb(...args)
      }
    },
    markExit: () => {
      child.exitCode = 0
      child.emit("exit", 0)
    },
  }
  return child
}

const makeBridgeStub = (port: number, url: string) => {
  const messageHandlers: Array<(m: unknown) => void> = []
  const connectionHandlers: Array<(s: unknown) => void> = []
  return {
    port,
    url,
    broadcast: vi.fn(),
    sendToCaller: vi.fn(),
    onMessage: (handler: (m: unknown) => void) => {
      messageHandlers.push(handler)
      return () => {}
    },
    onConnection: (handler: (s: unknown) => void) => {
      connectionHandlers.push(handler)
      return () => {}
    },
    close: vi.fn(async () => undefined),
    __triggerMessage: (m: unknown) => {
      for (const h of messageHandlers) h(m)
    },
    __triggerConnection: (s: unknown) => {
      for (const h of connectionHandlers) h(s)
    },
  }
}

const makeCtx = (
  bridge: ReturnType<typeof makeBridgeStub>,
  runtime: ReturnType<typeof createRuntime>,
  decks?: Array<{
    id: string
    name?: string
    isMain?: boolean
    buttons: Array<{ id: string; type: string; config?: unknown }>
  }>,
  configPath?: string,
) => ({
  frontendUrl: "http://placeholder",
  runtime,
  pubSub: runtime as never,
  store: { get: vi.fn(), set: vi.fn(), delete: vi.fn() } as never,
  decks: decks ?? [{ id: "main", name: "Main", isMain: true, buttons: [] }],
  theme: { name: "default" },
  logger: silentLogger(),
  addonByType: new Map(),
  bridge,
  ...(configPath !== undefined ? { configPath } : {}),
})

describe("EmulatorOutputClient", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("spawns vite via pnpm filter with --port (frontend 5180, emulator 52938)", async () => {
    const frontendChild = makeFakeChild()
    const emulatorChild = makeFakeChild()
    spawnMock
      .mockReturnValueOnce(frontendChild)
      .mockReturnValueOnce(emulatorChild)
    const bridge = makeBridgeStub(54321, "ws://127.0.0.1:54321")
    bridgeMock.mockResolvedValue(bridge)

    const runtime = createRuntime({
      decks: [{ id: "main", name: "Main", isMain: true, buttons: [] }],
      executor: { run: vi.fn() } as never,
      pubSub: {
        publish: vi.fn(),
        subscribe: vi.fn(() => () => undefined),
      } as never,
      store: { get: vi.fn(), set: vi.fn(), delete: vi.fn() } as never,
      logger: silentLogger(),
    })

    const promise = new EmulatorOutputClient().start(makeCtx(bridge, runtime))

    await new Promise((r) => setTimeout(r, 10))
    frontendChild.emitStdout(
      "  \u001b[32m\u001b[1mLocal\u001b[22m:   \u001b[36mhttp://127.0.0.1:\u001b[1m5180\u001b[22m/\u001b[39m\n",
    )
    await new Promise((r) => setTimeout(r, 1100))
    emulatorChild.emitStdout(
      "  \u001b[32m\u001b[1mLocal\u001b[22m:   \u001b[36mhttp://127.0.0.1:\u001b[1m52938\u001b[22m/\u001b[39m\n",
    )

    const handle = await promise
    expect(spawnMock).toHaveBeenCalledWith(
      expect.stringContaining("node_modules/.bin/vite"),
      [
        "--config",
        expect.stringContaining("frontend/vite.config.ts"),
        "--port",
        "5180",
      ],
      expect.objectContaining({ stdio: ["ignore", "pipe", "pipe"] }),
    )
    expect(spawnMock).toHaveBeenCalledWith(
      expect.stringContaining("node_modules/.bin/vite"),
      [
        "--config",
        expect.stringContaining("emulator/vite.config.ts"),
        "--port",
        "52938",
      ],
      expect.objectContaining({ stdio: ["ignore", "pipe", "pipe"] }),
    )
    expect(handle.emulatorUrl).toBe("http://127.0.0.1:52938")
    expect(handle.frontendUrl).toBe("http://127.0.0.1:5180")
    expect(handle.wsUrl).toBe("ws://127.0.0.1:54321")
  })

  it("stop() kills both vite children", async () => {
    const frontendChild = makeFakeChild()
    const emulatorChild = makeFakeChild()
    let spawnCallCount = 0
    spawnMock.mockImplementation(() => {
      spawnCallCount += 1
      return spawnCallCount === 1 ? frontendChild : emulatorChild
    })
    const bridge = makeBridgeStub(12345, "ws://127.0.0.1:12345")
    bridgeMock.mockResolvedValue(bridge)

    const runtime = createRuntime({
      decks: [{ id: "main", name: "Main", isMain: true, buttons: [] }],
      executor: { run: vi.fn() } as never,
      pubSub: {
        publish: vi.fn(),
        subscribe: vi.fn(() => () => undefined),
      } as never,
      store: { get: vi.fn(), set: vi.fn(), delete: vi.fn() } as never,
      logger: silentLogger(),
    })

    const promise = new EmulatorOutputClient().start(makeCtx(bridge, runtime))
    await new Promise((r) => setTimeout(r, 10))
    frontendChild.emitStdout("Local:   http://127.0.0.1:5173/\n")
    await new Promise((r) => setTimeout(r, 1100))
    emulatorChild.emitStdout("Local:   http://127.0.0.1:52938/\n")
    const handle = await promise

    const stopPromise = handle.stop()
    queueMicrotask(() => {
      frontendChild.exitCode = 0
      frontendChild.emit("exit", 0)
    })
    setTimeout(() => {
      emulatorChild.exitCode = 0
      emulatorChild.emit("exit", 0)
    }, 50)
    await stopPromise

    expect(frontendChild.kill).toHaveBeenCalledWith("SIGTERM")
  })

  it("dispatches button-action through runtime when runtime is provided", async () => {
    const frontendChild = makeFakeChild()
    const emulatorChild = makeFakeChild()
    spawnMock
      .mockReturnValueOnce(frontendChild)
      .mockReturnValueOnce(emulatorChild)
    const bridge = makeBridgeStub(12345, "ws://127.0.0.1:12345")
    bridgeMock.mockResolvedValue(bridge)

    const runtime = createRuntime({
      decks: [
        {
          id: "main",
          name: "Home",
          isMain: true,
          buttons: [
            { id: "0", type: "core:action", config: {} },
            { id: "1", type: "core:action", config: {} },
          ],
        },
      ],
      executor: { run: vi.fn() } as never,
      pubSub: {
        publish: vi.fn(),
        subscribe: vi.fn(() => () => undefined),
      } as never,
      store: { get: vi.fn(), set: vi.fn(), delete: vi.fn() } as never,
      logger: silentLogger(),
    })
    const dispatchSpy = vi.spyOn(runtime, "dispatchGesture")

    const promise = new EmulatorOutputClient().start(
      makeCtx(bridge, runtime, [
        {
          id: "main",
          name: "Home",
          isMain: true,
          buttons: [
            { id: "0", type: "core:action", config: {} },
            { id: "1", type: "core:action", config: {} },
          ],
        },
      ]),
    )
    await new Promise((r) => setTimeout(r, 10))
    frontendChild.emitStdout("Local:   http://127.0.0.1:5173/\n")
    await new Promise((r) => setTimeout(r, 1100))
    emulatorChild.emitStdout("Local:   http://127.0.0.1:52938/\n")
    await promise

    bridge.__triggerMessage({
      type: "button-action",
      deckId: "main",
      position: 1,
      gesture: "dbl-tap",
    })
    await new Promise((r) => setTimeout(r, 10))
    expect(dispatchSpy).toHaveBeenCalledWith("main:1", "dbl-tap")
  })

  it("warns and skips dispatch when button position is unknown", async () => {
    const frontendChild = makeFakeChild()
    const emulatorChild = makeFakeChild()
    spawnMock
      .mockReturnValueOnce(frontendChild)
      .mockReturnValueOnce(emulatorChild)
    const bridge = makeBridgeStub(12345, "ws://127.0.0.1:12345")
    bridgeMock.mockResolvedValue(bridge)

    const runtime = createRuntime({
      decks: [
        {
          id: "main",
          name: "Home",
          isMain: true,
          buttons: [{ id: "b1", type: "x", config: {} }],
        },
      ],
      executor: { run: vi.fn() } as never,
      pubSub: {
        publish: vi.fn(),
        subscribe: vi.fn(() => () => undefined),
      } as never,
      store: { get: vi.fn(), set: vi.fn(), delete: vi.fn() } as never,
      logger: silentLogger(),
    })
    const dispatchSpy = vi.spyOn(runtime, "dispatchGesture")

    const ctx = makeCtx(bridge, runtime, [
      {
        id: "main",
        name: "Home",
        isMain: true,
        buttons: [{ id: "b1", type: "x", config: {} }],
      },
    ])
    const logger = ctx.logger

    const promise = new EmulatorOutputClient().start(ctx)
    await new Promise((r) => setTimeout(r, 10))
    frontendChild.emitStdout("Local:   http://127.0.0.1:5173/\n")
    await new Promise((r) => setTimeout(r, 1100))
    emulatorChild.emitStdout("Local:   http://127.0.0.1:52938/\n")
    await promise

    const warnSpy = vi.spyOn(logger, "warn")
    bridge.__triggerMessage({
      type: "button-action",
      deckId: "main",
      position: 5,
      gesture: "tap",
    })
    await new Promise((r) => setTimeout(r, 10))
    expect(dispatchSpy).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({ deckId: "main", position: 5 }),
      expect.stringContaining("unknown button"),
    )
  })

  it("ignores non-button-action WS messages", async () => {
    const frontendChild = makeFakeChild()
    const emulatorChild = makeFakeChild()
    spawnMock
      .mockReturnValueOnce(frontendChild)
      .mockReturnValueOnce(emulatorChild)
    const bridge = makeBridgeStub(12345, "ws://127.0.0.1:12345")
    bridgeMock.mockResolvedValue(bridge)

    const runtime = createRuntime({
      decks: [{ id: "main", name: "Main", isMain: true, buttons: [] }],
      executor: { run: vi.fn() } as never,
      pubSub: {
        publish: vi.fn(),
        subscribe: vi.fn(() => () => undefined),
      } as never,
      store: { get: vi.fn(), set: vi.fn(), delete: vi.fn() } as never,
      logger: silentLogger(),
    })

    const ctx = makeCtx(bridge, runtime)
    const infoSpy = vi.spyOn(ctx.logger, "info")

    const promise = new EmulatorOutputClient().start(ctx)
    await new Promise((r) => setTimeout(r, 10))
    frontendChild.emitStdout("Local:   http://127.0.0.1:5173/\n")
    await new Promise((r) => setTimeout(r, 1100))
    emulatorChild.emitStdout("Local:   http://127.0.0.1:52938/\n")
    const handle = await promise
    void handle

    bridge.__triggerMessage({ type: "hello", version: 3, token: null })
    expect(infoSpy).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining("button-action"),
    )
  })

  it("rejects when vite child exits before becoming ready", async () => {
    const frontendChild = makeFakeChild()
    const emulatorChild = makeFakeChild()
    spawnMock
      .mockReturnValueOnce(frontendChild)
      .mockReturnValueOnce(emulatorChild)
    const bridge = makeBridgeStub(1, "ws://x")
    bridgeMock.mockResolvedValue(bridge)

    const runtime = createRuntime({
      decks: [{ id: "main", name: "Main", isMain: true, buttons: [] }],
      executor: { run: vi.fn() } as never,
      pubSub: {
        publish: vi.fn(),
        subscribe: vi.fn(() => () => undefined),
      } as never,
      store: { get: vi.fn(), set: vi.fn(), delete: vi.fn() } as never,
      logger: silentLogger(),
    })

    const promise = new EmulatorOutputClient().start(makeCtx(bridge, runtime))
    await new Promise((r) => setTimeout(r, 10))
    frontendChild.emit("exit", 1)

    await expect(promise).rejects.toThrow(/exited/)
  })
})
