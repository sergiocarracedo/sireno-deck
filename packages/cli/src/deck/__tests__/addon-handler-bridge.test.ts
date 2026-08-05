import { describe, expect, it, vi } from "vitest"
import { resolve as resolvePath } from "node:path"

import { createPubSub } from "@/core/pub-sub"
import { createStore } from "@/core/store"
import { createLogger } from "@/util/logger"
import { createActionExecutor } from "@/action/executor"

import type { ScannedAddon } from "@/cli/commands/addon-registry"
import { getHostContext } from "../host-context"
import { createMethods } from "../methods"
import { createRuntime } from "../runtime"
import { bridgeAddonServices } from "../addon-handler-bridge"

const silentLogger = () => createLogger({ level: "silent" })

const fixturePath = resolvePath(__dirname, "__fixtures__/fake-media-backend.ts")

const baseScanned: ReadonlyArray<ScannedAddon> = [
  {
    name: "fake-media",
    types: ["fake-media:player"],
    frontendEntry: null,
    publishIntervalMs: null,
    pollerEntry: null,
    buttonTypes: {},
    deckTypes: {},
    source: "json",
    globalServiceEntry: fixturePath,
    decks: [],
  },
]

const makeBridge = () => ({
  broadcast: vi.fn(),
  registerCacheablePoller: vi.fn(),
  sendToCaller: vi.fn(),
  onMessage: () => () => undefined,
  onConnection: () => () => undefined,
  close: async () => undefined,
})

const makeStatePublisher = () => ({
  registerChannel: vi.fn(),
  setActiveDeck: vi.fn(),
  stopAll: vi.fn(),
})

const setup = () => {
  const pubSub = createPubSub()
  const store = createStore()
  const decks = [{ id: "main", name: "Main", buttons: [], isMain: true }]
  const runtime = createRuntime({
    decks,
    pubSub,
    store,
    logger: silentLogger(),
  })
  const executor = createActionExecutor({ host: getHostContext() })
  const methods = createMethods({
    runtime,
    pubSub,
    store,
    executor,
    logger: silentLogger(),
  })
  return { runtime, pubSub, store, executor, decks, methods }
}

describe("bridgeAddonServices", () => {
  it("registers each globalService poller with the state publisher", async () => {
    const { runtime, pubSub, store, executor, decks, methods } = setup()
    const bridge = makeBridge()
    const statePublisher = makeStatePublisher()
    const signal = new AbortController().signal

    await bridgeAddonServices({
      runtime,
      decks,
      scanned: baseScanned,
      externalAddons: [],
      executor,
      pubSub,
      store,
      logger: silentLogger(),
      signal,
      statePublisher,
      bridge,
      methods,
    })

    expect(statePublisher.registerChannel).toHaveBeenCalledTimes(1)
    const [call] = (statePublisher.registerChannel as ReturnType<typeof vi.fn>)
      .mock.calls
    expect(call).toBeDefined()
    const [arg] = call as [
      {
        channel: string
        addonName: string
        intervalMs: number
        poll: () => unknown
      },
    ]
    expect(arg.channel).toBe("fake-media:state")
    expect(arg.addonName).toBe("fake-media")
    expect(arg.intervalMs).toBe(2000)
    expect(arg.poll()).toEqual({ title: "track", artist: "artist" })
  })

  it("routes ctx.publish from onLoad to the WS bridge on the primary channel", async () => {
    const { runtime, pubSub, store, executor, decks, methods } = setup()
    const bridge = makeBridge()
    const statePublisher = makeStatePublisher()
    const signal = new AbortController().signal

    await bridgeAddonServices({
      runtime,
      decks,
      scanned: baseScanned,
      externalAddons: [],
      executor,
      pubSub,
      store,
      logger: silentLogger(),
      signal,
      statePublisher,
      bridge,
      methods,
    })

    expect(bridge.broadcast).toHaveBeenCalledWith({
      type: "state",
      channels: { "fake-media:state": { initial: true } },
    })
  })

  it("does not call pubSub for ctx.publish when a poller is registered", async () => {
    const { runtime, pubSub, store, executor, decks, methods } = setup()
    const bridge = makeBridge()
    const statePublisher = makeStatePublisher()
    const signal = new AbortController().signal

    const subSpy = vi.fn()
    pubSub.subscribe("addon:fake-media", subSpy)

    await bridgeAddonServices({
      runtime,
      decks,
      scanned: baseScanned,
      externalAddons: [],
      executor,
      pubSub,
      store,
      logger: silentLogger(),
      signal,
      statePublisher,
      bridge,
      methods,
    })

    expect(subSpy).not.toHaveBeenCalled()
  })

  it("falls back to pubSub for ctx.publish when no poller is defined", async () => {
    const { runtime, pubSub, store, executor, decks, methods } = setup()
    const bridge = makeBridge()
    const statePublisher = makeStatePublisher()
    const subSpy = vi.fn()
    pubSub.subscribe("addon:fake-media", subSpy)
    const signal = new AbortController().signal

    const fixtureNoPoller = resolvePath(
      __dirname,
      "__fixtures__/fake-backend-no-poller.ts",
    )

    await bridgeAddonServices({
      runtime,
      decks,
      scanned: [
        {
          ...baseScanned[0]!,
          globalServiceEntry: fixtureNoPoller,
        },
      ],
      externalAddons: [],
      executor,
      pubSub,
      store,
      signal,
      statePublisher,
      bridge,
      methods,
      logger: silentLogger(),
    })

    expect(subSpy).toHaveBeenCalledWith({ initial: true })
    expect(statePublisher.registerChannel).not.toHaveBeenCalled()
    expect(bridge.broadcast).not.toHaveBeenCalled()
  })

  it("ignores addons without globalServiceEntry", async () => {
    const { runtime, pubSub, store, executor, decks, methods } = setup()
    const bridge = makeBridge()
    const statePublisher = makeStatePublisher()
    const signal = new AbortController().signal

    await bridgeAddonServices({
      runtime,
      decks,
      scanned: [{ ...baseScanned[0]!, globalServiceEntry: null }],
      externalAddons: [],
      executor,
      pubSub,
      logger: silentLogger(),
      store,
      signal,
      statePublisher,
      bridge,
      methods,
    })

    expect(statePublisher.registerChannel).not.toHaveBeenCalled()
    expect(bridge.broadcast).not.toHaveBeenCalled()
  })

  it("ctx.poll(id) runs the matching poller and broadcasts the result", async () => {
    const { __resetCapturedCtx, __getCapturedCtx } =
      await import("./__fixtures__/fake-media-backend")
    __resetCapturedCtx()

    const { runtime, pubSub, store, executor, decks, methods } = setup()
    const bridge = makeBridge()
    const statePublisher = makeStatePublisher()
    const signal = new AbortController().signal

    await bridgeAddonServices({
      runtime,
      decks,
      scanned: baseScanned,
      externalAddons: [],
      executor,
      pubSub,
      store,
      logger: silentLogger(),
      signal,
      statePublisher,
      bridge,
      methods,
    })

    const ctx = __getCapturedCtx()
    expect(ctx).not.toBeNull()
    bridge.broadcast.mockClear()

    await ctx!.poll("state")

    expect(bridge.broadcast).toHaveBeenCalledTimes(1)
    expect(bridge.broadcast).toHaveBeenCalledWith({
      type: "state",
      channels: { "fake-media:state": { title: "track", artist: "artist" } },
    })
  })

  it("ctx.poll with an unknown id is a silent no-op", async () => {
    const { __resetCapturedCtx, __getCapturedCtx } =
      await import("./__fixtures__/fake-media-backend")
    __resetCapturedCtx()

    const { runtime, pubSub, store, executor, decks, methods } = setup()
    const bridge = makeBridge()
    const statePublisher = makeStatePublisher()
    const signal = new AbortController().signal

    await bridgeAddonServices({
      runtime,
      decks,
      scanned: baseScanned,
      externalAddons: [],
      executor,
      pubSub,
      store,
      logger: silentLogger(),
      signal,
      statePublisher,
      bridge,
      methods,
    })

    const ctx = __getCapturedCtx()
    bridge.broadcast.mockClear()

    await ctx!.poll("nonexistent")

    expect(bridge.broadcast).not.toHaveBeenCalled()
  })

  it("forwards runtime gestures to the bridge as a state message on runtime:gesture:<id>", async () => {
    const { runtime, pubSub, store, executor, decks, methods } = setup()
    const decksWithButton = [
      {
        id: "main",
        name: "Main",
        isMain: true,
        buttons: [{ id: "b1", type: "fake-media:player", config: {} }],
      },
    ]
    const freshRuntime = createRuntime({
      decks: decksWithButton,
      pubSub,
      store,
      logger: silentLogger(),
    })
    freshRuntime.registerButtonHandler("main:b1", { onTap: vi.fn() })

    const bridge = makeBridge()
    const statePublisher = makeStatePublisher()
    const signal = new AbortController().signal

    await bridgeAddonServices({
      runtime: freshRuntime,
      decks: decksWithButton,
      scanned: baseScanned,
      externalAddons: [],
      executor,
      pubSub,
      store,
      logger: silentLogger(),
      signal,
      statePublisher,
      bridge,
      methods,
    })

    bridge.broadcast.mockClear()

    await freshRuntime.dispatchGesture("b1", "tap")

    expect(bridge.broadcast).toHaveBeenCalledTimes(1)
    const payload = bridge.broadcast.mock.calls[0]![0] as {
      type: string
      channels: Record<string, { kind: string; at: number }>
    }
    expect(payload.type).toBe("state")
    expect(payload.channels["runtime:gesture:b1"]).toBeDefined()
    expect(payload.channels["runtime:gesture:b1"].gesture).toBe("tap")
    expect(typeof payload.channels["runtime:gesture:b1"].at).toBe("number")
  })

  it("does not forward gestures when invokeAction is called", async () => {
    const decksWithButton = [
      {
        id: "main",
        name: "Main",
        isMain: true,
        buttons: [{ id: "b1", type: "fake-media:player", config: {} }],
      },
    ]
    const pubSub = createPubSub()
    const store = createStore()
    const freshRuntime = createRuntime({
      decks: decksWithButton,
      pubSub,
      store,
      logger: silentLogger(),
    })
    freshRuntime.registerButtonHandler("main:b1", { onTap: vi.fn() })

    const bridge = makeBridge()
    const statePublisher = makeStatePublisher()
    const signal = new AbortController().signal
    const executor = createActionExecutor({ host: getHostContext() })
    const methods = createMethods({
      runtime: freshRuntime,
      pubSub,
      store,
      executor,
      logger: silentLogger(),
    })

    await bridgeAddonServices({
      runtime: freshRuntime,
      decks: decksWithButton,
      scanned: baseScanned,
      externalAddons: [],
      executor,
      pubSub,
      store,
      logger: silentLogger(),
      signal,
      statePublisher,
      bridge,
      methods,
    })

    bridge.broadcast.mockClear()

    await freshRuntime.invokeAction("b1", "tap")

    expect(bridge.broadcast).not.toHaveBeenCalled()
  })
})
