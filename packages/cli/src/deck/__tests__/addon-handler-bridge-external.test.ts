import { describe, expect, it, vi } from "vitest"
import { resolve as resolvePath } from "node:path"
import { mkdtemp, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, sep } from "node:path"

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
  it("provides a persistent private directory scoped to the registered addon", async () => {
    const root = await mkdtemp(join(tmpdir(), "sireno-addon-test-"))
    try {
      const { runtime, pubSub, store, executor, decks, methods } = setup()
      const fixture = await import("./__fixtures__/fake-external-addon")
      const handle = await bridgeAddonServices({
        runtime,
        decks,
        scanned: [],
        externalAddons: externalScanned,
        executor,
        pubSub,
        store,
        logger: silentLogger(),
        signal: new AbortController().signal,
        statePublisher: makeStatePublisher(),
        bridge: makeBridge(),
        methods,
        addonDataRoot: root,
      })
      const directory = await fixture.__getCapturedCtx()!.getDataDirectory!()
      expect(directory.startsWith(root + sep)).toBe(true)
      expect(await fixture.__getCapturedCtx()!.getDataDirectory!()).toBe(
        directory,
      )
      if (process.platform !== "win32")
        expect((await stat(directory)).mode & 0o777).toBe(0o700)
      handle.dispose()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
  it("deactivates the departed overlay page and reactivates its parent on back", async () => {
    const { runtime, pubSub, store, executor, decks, methods } = setup()
    const fixture = await import("./__fixtures__/fake-external-addon")
    fixture.__resetCapturedCtx()
    const button = (id: string) => ({
      id,
      type: "fake-external:button",
      position: 0,
    })
    const allDecks = [
      ...decks,
      { id: "overlay", name: "Overlay", buttons: [button("overlay-button")] },
      { id: "page", name: "Page", buttons: [button("page-button")] },
    ]
    runtime.setDecks(allDecks)
    const handle = await bridgeAddonServices({
      runtime,
      decks: allDecks,
      scanned: [],
      externalAddons: externalScanned,
      executor,
      pubSub,
      store,
      logger: silentLogger(),
      signal: new AbortController().signal,
      statePublisher: makeStatePublisher(),
      bridge: makeBridge(),
      methods,
    })
    runtime.setOverlay("overlay")
    runtime.navigateToDeck("page")
    const page = fixture
      .__getButtonContexts()
      .find((ctx) => ctx.buttonId === "page-button")!
    expect(page.signal.aborted).toBe(false)
    runtime.goBack()
    expect(runtime.getActiveDeckId()).toBe("overlay")
    expect(page.signal.aborted).toBe(true)
    const overlayContexts = fixture
      .__getButtonContexts()
      .filter((ctx) => ctx.buttonId === "overlay-button")
    expect(overlayContexts).toHaveLength(2)
    expect(overlayContexts[1]!.signal.aborted).toBe(false)
    handle.dispose()
  })
  it("releases a service-owned interruption when the bridge is disposed", async () => {
    const { runtime, pubSub, store, executor, decks, methods } = setup()
    const fixture = await import("./__fixtures__/fake-external-addon")
    fixture.__resetCapturedCtx()
    const allDecks = [...decks, { id: "alarm", name: "Alarm", buttons: [] }]
    runtime.setDecks(allDecks)
    const handle = await bridgeAddonServices({
      runtime,
      decks: allDecks,
      scanned: [],
      externalAddons: externalScanned,
      executor,
      pubSub,
      store,
      logger: silentLogger(),
      signal: new AbortController().signal,
      statePublisher: makeStatePublisher(),
      bridge: makeBridge(),
      methods,
    })
    const release = fixture.__getCapturedCtx()!.interruptDeck!("alarm")!
    expect(runtime.getActiveDeckId()).toBe("alarm")
    expect(fixture.__getButtonContexts()[0]!.signal.aborted).toBe(true)
    release()
    expect(runtime.getActiveDeckId()).toBe("main")
    expect(fixture.__getButtonContexts()[1]!.signal.aborted).toBe(false)
    fixture.__getCapturedCtx()!.interruptDeck!("alarm")
    handle.dispose()
    expect(runtime.getActiveDeckId()).toBe("main")
    release()
    expect(runtime.getActiveDeckId()).toBe("main")
  })
  it("remounts a button with a fresh signal after returning to its deck", async () => {
    const { runtime, pubSub, store, executor, decks, methods } = setup()
    const fixture = await import("./__fixtures__/fake-external-addon")
    fixture.__resetCapturedCtx()
    const allDecks = [...decks, { id: "other", name: "Other", buttons: [] }]
    runtime.setDecks(allDecks)
    const handle = await bridgeAddonServices({
      runtime,
      decks: allDecks,
      scanned: [],
      externalAddons: externalScanned,
      executor,
      pubSub,
      store,
      logger: silentLogger(),
      signal: new AbortController().signal,
      statePublisher: makeStatePublisher(),
      bridge: makeBridge(),
      methods,
    })
    const first = fixture.__getButtonContexts()[0]!
    runtime.navigateToDeck("other")
    expect(first.signal.aborted).toBe(true)
    runtime.goBack()
    const contexts = fixture.__getButtonContexts()
    expect(contexts).toHaveLength(2)
    expect(contexts[1]!.signal.aborted).toBe(false)
    handle.dispose()
  })
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
