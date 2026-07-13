import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createPubSub } from "@/core/pub-sub"
import { createStore } from "@/core/store"
import { createLogger } from "@/util/logger"
import type {
  ActiveAppProvider,
  ActiveAppSnapshot,
} from "@/system/providers/active-app"

import { createRuntime, type RuntimeDeck } from "../runtime"
import { createMethods } from "../methods"
import { createActionExecutor } from "@/action/executor"
import { getHostContext } from "../host-context"

const silentLogger = () => createLogger({ level: "silent" })

const makeDeck = (overrides: Partial<RuntimeDeck> = {}): RuntimeDeck => ({
  id: "d1",
  name: "Deck 1",
  buttons: [],
  ...overrides,
})

const setup = (decks: ReadonlyArray<RuntimeDeck>) => {
  const pubSub = createPubSub()
  const store = createStore()
  const executor = createActionExecutor({ host: getHostContext() })
  const methodsRef: { current: ReturnType<typeof createMethods> | undefined } =
    { current: undefined }
  const runtime = createRuntime({
    decks,
    pubSub,
    store,
    logger: silentLogger(),
    getMethods: () => methodsRef.current!,
  })
  const methods = createMethods({
    runtime,
    pubSub,
    store,
    executor,
    logger: silentLogger(),
  })
  methodsRef.current = methods
  return { runtime, pubSub, store, methods }
}

describe("createRuntime", () => {
  it("initial active deck = main", () => {
    const { runtime } = setup([
      makeDeck({ id: "main", isMain: true, buttons: [] }),
      makeDeck({ id: "media" }),
    ])
    expect(runtime.getActiveDeckId()).toBe("main")
  })

  it("navigateToDeck pushes to nav stack", () => {
    const { runtime } = setup([
      makeDeck({ id: "main", isMain: true }),
      makeDeck({ id: "media" }),
    ])
    runtime.navigateToDeck("media")
    expect(runtime.getActiveDeckId()).toBe("media")
    expect(runtime.navStackDepth()).toBe(2)
  })

  it("goBack pops nav stack", () => {
    const { runtime } = setup([
      makeDeck({ id: "main", isMain: true }),
      makeDeck({ id: "media" }),
    ])
    runtime.navigateToDeck("media")
    runtime.goBack()
    expect(runtime.getActiveDeckId()).toBe("main")
    expect(runtime.navStackDepth()).toBe(1)
  })

  it("goBack at root is a no-op", () => {
    const { runtime } = setup([makeDeck({ id: "main", isMain: true })])
    runtime.goBack()
    expect(runtime.getActiveDeckId()).toBe("main")
  })

  it("setOverlay + getOverlay roundtrip", () => {
    const { runtime } = setup([
      makeDeck({ id: "main", isMain: true }),
      makeDeck({ id: "spotify", isOverlay: true }),
    ])
    runtime.setOverlay("spotify")
    expect(runtime.getOverlay()?.id).toBe("spotify")
    runtime.setOverlay(null)
    expect(runtime.getOverlay()).toBeNull()
  })

  it("dispatchGesture tap calls registered onTap", async () => {
    const { runtime } = setup([
      makeDeck({
        id: "main",
        isMain: true,
        buttons: [{ id: "b1", type: "x" }],
      }),
    ])
    const onTap = vi.fn()
    runtime.registerButtonHandler("main:b1", { onTap })
    await runtime.dispatchGesture("b1", "tap")
    expect(onTap).toHaveBeenCalledWith(
      expect.objectContaining({
        buttonId: "b1",
        deckId: "main",
        gesture: "tap",
      }),
    )
  })

  it("dispatchGesture dbl-tap calls onDblTap", async () => {
    const { runtime } = setup([
      makeDeck({
        id: "main",
        isMain: true,
        buttons: [{ id: "b1", type: "x" }],
      }),
    ])
    const onDblTap = vi.fn()
    runtime.registerButtonHandler("main:b1", { onDblTap })
    await runtime.dispatchGesture("b1", "dbl-tap")
    expect(onDblTap).toHaveBeenCalledOnce()
  })

  it("dispatchGesture hold calls onHold", async () => {
    const { runtime } = setup([
      makeDeck({
        id: "main",
        isMain: true,
        buttons: [{ id: "b1", type: "x" }],
      }),
    ])
    const onHold = vi.fn()
    runtime.registerButtonHandler("main:b1", { onHold })
    await runtime.dispatchGesture("b1", "hold")
    expect(onHold).toHaveBeenCalledOnce()
  })

  it("dispatchGesture missing handler is a no-op", async () => {
    const { runtime } = setup([
      makeDeck({
        id: "main",
        isMain: true,
        buttons: [{ id: "b1", type: "x" }],
      }),
    ])
    await expect(runtime.dispatchGesture("b1", "tap")).resolves.toBeUndefined()
  })

  it("dispatchGesture missing button is a no-op", async () => {
    const { runtime } = setup([makeDeck({ id: "main", isMain: true })])
    await expect(
      runtime.dispatchGesture("missing", "tap"),
    ).resolves.toBeUndefined()
  })

  it("dispatchGesture fires gestureListener with the short button id and timestamp", async () => {
    const { runtime } = setup([
      makeDeck({
        id: "main",
        isMain: true,
        buttons: [{ id: "b1", type: "x" }],
      }),
    ])
    runtime.registerButtonHandler("main:b1", { onTap: vi.fn() })
    const listener = vi.fn()
    runtime.setGestureListener(listener)
    const before = Date.now()
    await runtime.dispatchGesture("main:b1", "tap")
    const after = Date.now()
    expect(listener).toHaveBeenCalledOnce()
    const [buttonId, event] = listener.mock.calls[0]!
    expect(buttonId).toBe("b1")
    expect(event.gesture).toBe("tap")
    expect(event.at).toBeGreaterThanOrEqual(before)
    expect(event.at).toBeLessThanOrEqual(after)
  })

  it("dispatchGesture does not fire gestureListener when button is missing", async () => {
    const { runtime } = setup([makeDeck({ id: "main", isMain: true })])
    const listener = vi.fn()
    runtime.setGestureListener(listener)
    await runtime.dispatchGesture("missing", "tap")
    expect(listener).not.toHaveBeenCalled()
  })

  it("invokeAction runs the handler but does not fire the gestureListener", async () => {
    const { runtime } = setup([
      makeDeck({
        id: "main",
        isMain: true,
        buttons: [{ id: "b1", type: "x" }],
      }),
    ])
    const onTap = vi.fn()
    runtime.registerButtonHandler("main:b1", { onTap })
    const listener = vi.fn()
    runtime.setGestureListener(listener)
    await runtime.invokeAction("b1", "tap")
    expect(onTap).toHaveBeenCalledOnce()
    expect(listener).not.toHaveBeenCalled()
  })

  it("setGestureListener(null) detaches the listener", async () => {
    const { runtime } = setup([
      makeDeck({
        id: "main",
        isMain: true,
        buttons: [{ id: "b1", type: "x" }],
      }),
    ])
    runtime.registerButtonHandler("main:b1", { onTap: vi.fn() })
    const listener = vi.fn()
    runtime.setGestureListener(listener)
    runtime.setGestureListener(null)
    await runtime.dispatchGesture("b1", "tap")
    expect(listener).not.toHaveBeenCalled()
  })

  it("navigateToDeck with addToHistory=false doesn't push", () => {
    const { runtime } = setup([
      makeDeck({ id: "main", isMain: true }),
      makeDeck({ id: "media" }),
    ])
    runtime.navigateToDeck("media", { addToHistory: false })
    expect(runtime.getActiveDeckId()).toBe("media")
    expect(runtime.navStackDepth()).toBe(1)
    runtime.goBack()
    expect(runtime.getActiveDeckId()).toBe("main")
  })
})

interface FakeProvider extends Pick<ActiveAppProvider, "getActive" | "stop"> {
  snapshot: ActiveAppSnapshot | null
  getActive: () => Promise<ActiveAppSnapshot | null>
  stop: () => Promise<void>
  calls: { getActive: number; stop: number }
}

const makeFakeProvider = (initial: ActiveAppSnapshot | null): FakeProvider => {
  const provider: FakeProvider = {
    snapshot: initial,
    calls: { getActive: 0, stop: 0 },
    async getActive() {
      provider.calls.getActive += 1
      return provider.snapshot
    },
    async stop() {
      provider.calls.stop += 1
    },
  }
  return provider
}

const flush = async (ms = 5): Promise<void> => {
  await vi.advanceTimersByTimeAsync(ms)
  await Promise.resolve()
}

describe("createRuntime with active-app provider", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"],
    })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("setActiveAppProvider starts the poll loop", async () => {
    const { runtime } = setup([
      makeDeck({ id: "main", isMain: true }),
      makeDeck({ id: "chrome", processNames: ["chrome"] }),
    ])
    const provider = makeFakeProvider({
      name: "Google Chrome",
      windowTitle: null,
      processId: 1,
    })
    runtime.setActiveAppProvider(provider)
    await flush(1_200)
    expect(provider.calls.getActive).toBeGreaterThan(0)
    await runtime.stopActiveAppPolling()
  })

  it("overlay switches to deck whose processNames match", async () => {
    const { runtime } = setup([
      makeDeck({ id: "main", isMain: true }),
      makeDeck({ id: "chrome-deck", processNames: ["chrome"] }),
    ])
    const provider = makeFakeProvider({
      name: "Google Chrome",
      windowTitle: null,
      processId: 1,
    })
    runtime.setActiveAppProvider(provider)
    await flush(1_200)
    expect(runtime.getOverlay()?.id).toBe("chrome-deck")
    await runtime.stopActiveAppPolling()
  })

  it("overlay clears when active-app no longer matches", async () => {
    const { runtime } = setup([
      makeDeck({ id: "main", isMain: true }),
      makeDeck({ id: "chrome-deck", processNames: ["chrome"] }),
    ])
    const provider = makeFakeProvider({
      name: "Google Chrome",
      windowTitle: null,
      processId: 1,
    })
    runtime.setActiveAppProvider(provider)
    await flush(1_200)
    expect(runtime.getOverlay()?.id).toBe("chrome-deck")
    provider.snapshot = { name: "Firefox", windowTitle: null, processId: 2 }
    await flush(1_500)
    expect(runtime.getOverlay()).toBeNull()
    await runtime.stopActiveAppPolling()
  })

  it("first matching deck wins when multiple match", async () => {
    const { runtime } = setup([
      makeDeck({ id: "main", isMain: true }),
      makeDeck({ id: "first-match", processNames: ["chrome", "*firefox*"] }),
      makeDeck({ id: "second-match", processNames: ["*chrome*"] }),
    ])
    const provider = makeFakeProvider({
      name: "Google Chrome",
      windowTitle: null,
      processId: 1,
    })
    runtime.setActiveAppProvider(provider)
    await flush(1_200)
    expect(runtime.getOverlay()?.id).toBe("first-match")
    await runtime.stopActiveAppPolling()
  })

  it("stopActiveAppPolling stops the provider", async () => {
    const { runtime } = setup([makeDeck({ id: "main", isMain: true })])
    const provider = makeFakeProvider(null)
    runtime.setActiveAppProvider(provider)
    await flush(100)
    await runtime.stopActiveAppPolling()
    expect(provider.calls.stop).toBe(1)
  })

  it("hasOverlayDeckAvailable is false before any active-app match", () => {
    const { runtime } = setup([
      makeDeck({ id: "main", isMain: true }),
      makeDeck({ id: "chrome", processNames: ["chrome"] }),
    ])
    expect(runtime.hasOverlayDeckAvailable()).toBe(false)
  })

  it("hasOverlayDeckAvailable is true after overlay applies via poll", async () => {
    const { runtime } = setup([
      makeDeck({ id: "main", isMain: true }),
      makeDeck({ id: "chrome-deck", processNames: ["chrome"] }),
    ])
    const provider = makeFakeProvider({
      name: "Google Chrome",
      windowTitle: null,
      processId: 1,
    })
    runtime.setActiveAppProvider(provider)
    await flush(1_200)
    expect(runtime.hasOverlayDeckAvailable()).toBe(true)
    await runtime.stopActiveAppPolling()
  })

  it("hasOverlayDeckAvailable transitions back to false when active-app no longer matches", async () => {
    const { runtime } = setup([
      makeDeck({ id: "main", isMain: true }),
      makeDeck({ id: "chrome-deck", processNames: ["chrome"] }),
    ])
    const provider = makeFakeProvider({
      name: "Google Chrome",
      windowTitle: null,
      processId: 1,
    })
    runtime.setActiveAppProvider(provider)
    await flush(1_200)
    expect(runtime.hasOverlayDeckAvailable()).toBe(true)
    provider.snapshot = { name: "Firefox", windowTitle: null, processId: 2 }
    await flush(1_300)
    expect(runtime.hasOverlayDeckAvailable()).toBe(false)
    await runtime.stopActiveAppPolling()
  })
})

describe("invokeAction — user actions", () => {
  it("user action fires when button has actions.tap and no handler registered", async () => {
    const { runtime, methods } = setup([
      makeDeck({
        id: "main",
        isMain: true,
        buttons: [
          { id: "b1", type: "date-time:date", actions: { tap: "echo hello" } },
        ],
      }),
    ])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dispatch = vi
      .spyOn(methods as any, "dispatch")
      .mockResolvedValue(undefined)
    await runtime.invokeAction("b1", "tap")
    expect(dispatch).toHaveBeenCalledWith("echo hello")
  })

  it("user action fires with dbltap", async () => {
    const { runtime, methods } = setup([
      makeDeck({
        id: "main",
        isMain: true,
        buttons: [
          { id: "b1", type: "date-time:date", actions: { dbltap: "echo dbl" } },
        ],
      }),
    ])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dispatch = vi
      .spyOn(methods as any, "dispatch")
      .mockResolvedValue(undefined)
    await runtime.invokeAction("b1", "dbl-tap")
    expect(dispatch).toHaveBeenCalledWith("echo dbl")
  })

  it("user action fires with hold", async () => {
    const { runtime, methods } = setup([
      makeDeck({
        id: "main",
        isMain: true,
        buttons: [
          { id: "b1", type: "date-time:date", actions: { hold: "echo hold" } },
        ],
      }),
    ])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dispatch = vi
      .spyOn(methods as any, "dispatch")
      .mockResolvedValue(undefined)
    await runtime.invokeAction("b1", "hold")
    expect(dispatch).toHaveBeenCalledWith("echo hold")
  })

  it("user action wins over addon handler when both exist", async () => {
    const { runtime, methods } = setup([
      makeDeck({
        id: "main",
        isMain: true,
        buttons: [
          { id: "b1", type: "media:mute", actions: { tap: "echo user" } },
        ],
      }),
    ])
    const addonHandler = vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dispatch = vi
      .spyOn(methods as any, "dispatch")
      .mockResolvedValue(undefined)
    runtime.registerButtonHandler("main:b1", { onTap: addonHandler })
    await runtime.invokeAction("b1", "tap")
    expect(dispatch).toHaveBeenCalledWith("echo user")
    expect(addonHandler).not.toHaveBeenCalled()
  })

  it("addon handler fires when no user action defined", async () => {
    const { runtime, methods } = setup([
      makeDeck({
        id: "main",
        isMain: true,
        buttons: [{ id: "b1", type: "media:mute" }],
      }),
    ])
    const addonHandler = vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dispatch = vi
      .spyOn(methods as any, "dispatch")
      .mockResolvedValue(undefined)
    runtime.registerButtonHandler("main:b1", { onTap: addonHandler })
    await runtime.invokeAction("b1", "tap")
    expect(addonHandler).toHaveBeenCalled()
    expect(dispatch).not.toHaveBeenCalled()
  })

  it("dispatch routes macro:// to keyMacro", async () => {
    const { runtime, methods } = setup([
      makeDeck({
        id: "main",
        isMain: true,
        buttons: [{ id: "b1", type: "x", actions: { tap: "macro://ctrl+c" } }],
      }),
    ])
    const sendKey = vi.fn().mockResolvedValue(undefined)
    methods.setKeyMacroProvider({ sendKey, stop: async () => undefined })
    await runtime.invokeAction("b1", "tap")
    expect(sendKey).toHaveBeenCalledWith("ctrl+c")
  })

  it("dispatch routes paste:// to pasteText", async () => {
    const { runtime, methods } = setup([
      makeDeck({
        id: "main",
        isMain: true,
        buttons: [{ id: "b1", type: "x", actions: { tap: "paste://🔥" } }],
      }),
    ])
    const writeText = vi.fn().mockResolvedValue(undefined)
    methods.setClipboardProvider({
      writeText,
      readText: async () => "",
      stop: async () => undefined,
    })
    await runtime.invokeAction("b1", "tap")
    expect(writeText).toHaveBeenCalledWith("🔥")
  })

  describe("invokeAction guard — inactive deck", () => {
    it("drops gesture when button belongs to non-active (main) deck while overlay is active", async () => {
      const { runtime } = setup([
        makeDeck({
          id: "main",
          isMain: true,
          buttons: [{ id: "b1", type: "x" }],
        }),
        makeDeck({ id: "overlay", buttons: [{ id: "b2", type: "y" }] }),
      ])
      const onTap = vi.fn()
      runtime.registerButtonHandler("main:b1", { onTap })
      runtime.setOverlay("overlay")
      await runtime.invokeAction("main:b1", "tap")
      expect(onTap).not.toHaveBeenCalled()
    })

    it("allows gesture when button belongs to active overlay deck", async () => {
      const { runtime } = setup([
        makeDeck({
          id: "main",
          isMain: true,
          buttons: [{ id: "b1", type: "x" }],
        }),
        makeDeck({ id: "overlay", buttons: [{ id: "b2", type: "y" }] }),
      ])
      const onTap = vi.fn()
      runtime.registerButtonHandler("overlay:b2", { onTap })
      runtime.setOverlay("overlay")
      await runtime.invokeAction("overlay:b2", "tap")
      expect(onTap).toHaveBeenCalledOnce()
    })
  })

  describe("setOverlay — pub/sub", () => {
    it("publishes runtime:deck-inactive for previous deck", () => {
      const { runtime, pubSub } = setup([
        makeDeck({ id: "main", isMain: true, buttons: [] }),
        makeDeck({ id: "overlay", buttons: [] }),
      ])
      const inactive: unknown[] = []
      pubSub.subscribe("runtime:deck-inactive", (p) => inactive.push(p))
      runtime.setOverlay("overlay")
      expect(inactive).toContainEqual({ deckId: "main" })
    })

    it("publishes runtime:activeDeck with overlay deckId", () => {
      const { runtime, pubSub } = setup([
        makeDeck({ id: "main", isMain: true, buttons: [] }),
        makeDeck({ id: "overlay", buttons: [] }),
      ])
      const activeDeck: unknown[] = []
      pubSub.subscribe("runtime:activeDeck", (p) => activeDeck.push(p))
      runtime.setOverlay("overlay")
      expect(activeDeck).toContainEqual({ deckId: "overlay" })
    })

    it("setOverlay replaces overlay-a with overlay-b: deck-inactive fires for overlay-a", () => {
      const { runtime, pubSub } = setup([
        makeDeck({ id: "main", isMain: true, buttons: [] }),
        makeDeck({ id: "overlay-a", buttons: [] }),
        makeDeck({ id: "overlay-b", buttons: [] }),
      ])
      const inactive: unknown[] = []
      pubSub.subscribe("runtime:deck-inactive", (p) => inactive.push(p))
      runtime.setOverlay("overlay-a")
      runtime.setOverlay("overlay-b")
      expect(inactive).toContainEqual({ deckId: "overlay-a" })
    })
  })
})
