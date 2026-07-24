import { describe, expect, it, vi } from "vitest"

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

const coreLockDeckWith = (
  buttons: ReadonlyArray<{
    type: string
    position?: number
    config?: unknown
    actions?: { tap?: string }
  }>,
): RuntimeDeck => ({
  id: "core:lock",
  name: "Lock",
  buttons: buttons.map((b, i) => ({
    id: b.position !== undefined ? String(b.position) : `b${i}`,
    ...(b.position !== undefined ? { position: b.position } : {}),
    type: b.type,
    ...(b.config !== undefined ? { config: b.config } : {}),
    ...(b.actions !== undefined ? { actions: b.actions } : {}),
  })),
})

const defaultCoreLockDeck = (): RuntimeDeck =>
  coreLockDeckWith([
    { type: "date-time:date-time", position: 0, config: { format: "HH" } },
    {
      type: "date-time:date-time",
      position: 1,
      config: { format: "<blink>:</blink>" },
    },
    { type: "date-time:date-time", position: 2, config: { format: "mm" } },
  ])

const silentLogger = () => createLogger({ level: "silent" })

const makeDeck = (overrides: Partial<RuntimeDeck> = {}): RuntimeDeck => ({
  id: "d1",
  name: "Deck 1",
  buttons: [],
  ...overrides,
})

const fakeSessionProvider = () => {
  let handler: ((state: "locked" | "unlocked" | "unknown") => void) | null =
    null
  return {
    getState: () => "unknown" as const,
    subscribe: (
      cb: (state: "locked" | "unlocked" | "unknown") => void,
    ): (() => void) => {
      handler = cb
      return () => {
        handler = null
      }
    },
    stop: async () => undefined,
    emit: (state: "locked" | "unlocked" | "unknown") => {
      handler?.(state)
    },
  }
}

const fakeActiveAppProvider = (
  snapshot: ActiveAppSnapshot | null,
): ActiveAppProvider => ({
  getActive: async () => snapshot,
  stop: async () => undefined,
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

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

describe("lock deck — overlay auto-resume (Phase 6 Plan 3)", () => {
  it("regular deck restored on unlock when no overlay was active", async () => {
    const { runtime } = setup([
      makeDeck({ id: "main", isMain: true, buttons: [] }),
      makeDeck({ id: "media", buttons: [] }),
      defaultCoreLockDeck(),
    ])
    runtime.navigateToDeck("media")
    expect(runtime.getActiveDeckId()).toBe("media")

    const session = fakeSessionProvider()
    runtime.setSessionProvider(session)
    runtime.setActiveAppProvider(fakeActiveAppProvider(null))

    session.emit("locked")
    expect(runtime.isLockActive()).toBe(true)
    expect(runtime.getActiveDeckId()).toBe("core:lock")

    session.emit("unlocked")
    expect(runtime.isLockActive()).toBe(false)
    expect(runtime.getActiveDeckId()).toBe("media")
  })

  it("overlay auto-resumes on unlock if trigger still matches", async () => {
    const { runtime } = setup([
      makeDeck({ id: "main", isMain: true, buttons: [] }),
      makeDeck({
        id: "spotify",
        isOverlay: true,
        autoShow: true,
        processNames: ["Spotify"],
      }),
      defaultCoreLockDeck(),
    ])

    runtime.setActiveAppProvider(
      fakeActiveAppProvider({
        name: "Spotify",
        windowTitle: "Song",
        processId: 1,
      }),
    )
    await wait(1500)
    expect(runtime.getOverlay()?.id).toBe("spotify")

    const session = fakeSessionProvider()
    runtime.setSessionProvider(session)
    session.emit("locked")
    expect(runtime.getActiveDeckId()).toBe("core:lock")
    expect(runtime.getOverlay()?.id).toBe("spotify")

    session.emit("unlocked")
    expect(runtime.isLockActive()).toBe(false)
    expect(runtime.getOverlay()?.id).toBe("spotify")
    expect(runtime.getActiveDeckId()).toBe("spotify")
  })

  it("overlay dismissed + regular deck restored on unlock when trigger no longer matches", async () => {
    const { runtime } = setup([
      makeDeck({ id: "main", isMain: true, buttons: [] }),
      makeDeck({ id: "media", buttons: [] }),
      makeDeck({
        id: "spotify",
        isOverlay: true,
        autoShow: true,
        processNames: ["Spotify"],
      }),
      defaultCoreLockDeck(),
    ])
    runtime.navigateToDeck("media")

    runtime.setActiveAppProvider(
      fakeActiveAppProvider({
        name: "Spotify",
        windowTitle: "Song",
        processId: 1,
      }),
    )
    await wait(1500)
    expect(runtime.getOverlay()?.id).toBe("spotify")

    const session = fakeSessionProvider()
    runtime.setSessionProvider(session)
    session.emit("locked")
    expect(runtime.getActiveDeckId()).toBe("core:lock")

    runtime.stopActiveAppPolling()
    runtime.setActiveAppProvider(
      fakeActiveAppProvider({
        name: "Firefox",
        windowTitle: "Browser",
        processId: 2,
      }),
    )
    await wait(1500)

    session.emit("unlocked")
    expect(runtime.isLockActive()).toBe(false)
    expect(runtime.getOverlay()).toBeNull()
    expect(runtime.getActiveDeckId()).toBe("media")
  })

  it("lock → folder-escape → OS unlock → no auto-restore (escape is sticky)", async () => {
    const { runtime } = setup([
      makeDeck({ id: "main", isMain: true, buttons: [] }),
      makeDeck({ id: "system", buttons: [] }),
      coreLockDeckWith([
        { type: "core:change-deck", position: 0, config: { deck: "system" } },
      ]),
    ])
    const session = fakeSessionProvider()
    runtime.setSessionProvider(session)
    runtime.setActiveAppProvider(fakeActiveAppProvider(null))

    session.emit("locked")
    runtime.registerButtonHandler("core:lock:0", {
      onTap: async () => {
        runtime.navigateToDeck("system", { addToHistory: false })
      },
    })
    await runtime.dispatchGesture("core:lock:0", "tap")
    expect(runtime.isLockActive()).toBe(false)
    expect(runtime.getActiveDeckId()).toBe("system")

    session.emit("unlocked")
    expect(runtime.isLockActive()).toBe(false)
    expect(runtime.getActiveDeckId()).toBe("system")
  })

  it("snapshot refreshes on consecutive lock events", async () => {
    const { runtime } = setup([
      makeDeck({ id: "main", isMain: true, buttons: [] }),
      makeDeck({ id: "media", buttons: [] }),
      makeDeck({ id: "settings", buttons: [] }),
      defaultCoreLockDeck(),
    ])
    runtime.navigateToDeck("media")
    const session = fakeSessionProvider()
    runtime.setSessionProvider(session)
    runtime.setActiveAppProvider(fakeActiveAppProvider(null))

    session.emit("locked")
    runtime.navigateToDeck("settings")
    session.emit("locked")
    session.emit("unlocked")
    expect(runtime.getActiveDeckId()).toBe("settings")
  })
})
