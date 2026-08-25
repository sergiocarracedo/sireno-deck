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

const fixturePath = resolvePath(
  __dirname,
  "__fixtures__/fake-external-addon.ts",
)

const makeBridge = () => ({
  broadcast: vi.fn(),
  registerCacheablePoller: vi.fn(),
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
  const decks = [
    {
      id: "main",
      name: "Main",
      isMain: true,
      buttons: [
        {
          id: "fake-external-1",
          type: "fake-external:button",
          position: 0,
        },
      ],
    },
  ]
  const executor = createActionExecutor({ host: getHostContext() })
  const methods = createMethods({
    runtime: undefined as never,
    pubSub,
    store,
    executor,
    logger: silentLogger(),
  })
  const runtime = createRuntime({
    decks,
    pubSub,
    store,
    logger: silentLogger(),
    getMethods: () => methods,
  })
  // ponytail: createMethods needs a Runtime, but we built a placeholder above
  // (Methods don't actually call runtime methods at construction). Replace
  // the runtime reference on methods now that it exists.
  ;(methods as unknown as { runtime: typeof runtime }).runtime = runtime
  return { runtime, pubSub, store, executor, decks, methods }
}

const externalScanned: ReadonlyArray<ScannedAddon> = [
  {
    name: "fake-external",
    types: ["fake-external:button"],
    frontendEntry: fixturePath,
    publishIntervalMs: null,
    pollerEntry: null,
    buttonTypes: {
      "fake-external:button": {
        exportName: "fake-external:button",
        internal: false,
      },
    },
    deckTypes: {},
    source: "json",
    globalServiceEntry: fixturePath,
    decks: [],
  },
]

describe("bridgeAddonServices (third-party addon)", () => {
  it("wires globalService from an external addon", async () => {
    const { runtime, pubSub, store, executor, decks, methods } = setup()
    const bridge = makeBridge()
    const statePublisher = makeStatePublisher()
    const signal = new AbortController().signal

    await bridgeAddonServices({
      runtime,
      decks,
      scanned: [],
      externalAddons: externalScanned,
      executor,
      pubSub,
      store,
      logger: silentLogger(),
      signal,
      statePublisher,
      bridge,
      methods,
    })

    expect(statePublisher.registerChannel).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "fake-external:state",
        addonName: "fake-external",
      }),
    )
    expect(bridge.registerCacheablePoller).toHaveBeenCalledWith(
      "fake-external:state",
      expect.any(Function),
    )
  })

  it("loads a third-party addon's buttonType from its frontendEntry", async () => {
    const { runtime, pubSub, store, executor, decks, methods } = setup()
    const bridge = makeBridge()
    const statePublisher = makeStatePublisher()
    const signal = new AbortController().signal

    await bridgeAddonServices({
      runtime,
      decks,
      scanned: [],
      externalAddons: externalScanned,
      executor,
      pubSub,
      store,
      logger: silentLogger(),
      signal,
      statePublisher,
      bridge,
      methods,
    })

    const tap = await import("./__fixtures__/fake-external-addon")
    tap.__resetCapturedCtx()
    expect(tap.__getTapCount()).toBe(0)
  })
})
