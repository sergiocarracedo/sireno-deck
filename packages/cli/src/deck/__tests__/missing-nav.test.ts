import { describe, it, expect } from "vitest"
import { createPubSub } from "@/core/pub-sub"
import { createStore } from "@/core/store"
import { createLogger } from "@/util/logger"
import { createRuntime } from "@/deck/runtime"
import { createMethods } from "@/deck/methods"
import { subscribeNavigateDeck } from "@/deck/runtime-subscriptions"
import { createActionExecutor } from "@/action/executor"
import { getHostContext } from "../host-context"

const silentLogger = () => createLogger({ level: "silent" })

const setup = (deckIds: string[]) => {
  const pubSub = createPubSub()
  const store = createStore()
  const executor = createActionExecutor({ host: getHostContext() })
  const methodsRef: { current: ReturnType<typeof createMethods> | undefined } = { current: undefined }
  const runtime = createRuntime({
    decks: deckIds.map((id, i) => ({
      id,
      name: id,
      buttons: [],
      ...(i === 0 ? { isMain: true } : {}),
    })),
    pubSub,
    store,
    logger: silentLogger(),
    getMethods: () => methodsRef.current!,
  })
  const methods = createMethods({ runtime, pubSub, store, executor, logger: silentLogger() })
  methodsRef.current = methods
  return { runtime, pubSub, store, methods }
}

describe("runtime.deckExists", () => {
  it("returns true for existing deck", () => {
    const { runtime } = setup(["main", "media"])
    expect(runtime.deckExists("main")).toBe(true)
    expect(runtime.deckExists("media")).toBe(true)
  })

  it("returns false for nonexistent deck", () => {
    const { runtime } = setup(["main"])
    expect(runtime.deckExists("nonexistent")).toBe(false)
    expect(runtime.deckExists("")).toBe(false)
  })
})

describe("navigateToDeck missing target", () => {
  it("active deck does not change when target does not exist", () => {
    const { runtime } = setup(["main"])
    expect(runtime.getActiveDeckId()).toBe("main")
    runtime.navigateToDeck("nonexistent")
    expect(runtime.getActiveDeckId()).toBe("main")
  })
})

describe("subscribeNavigateDeck: missing target publishes runtime:buttonError", () => {
  it("emits a buttonError at the source slot and does not change active deck", () => {
    const { runtime, pubSub } = setup(["main", "media"])
    const errors: unknown[] = []
    pubSub.subscribe("runtime:buttonError", (payload) => {
      errors.push(payload)
    })
    const unsubscribe = subscribeNavigateDeck(pubSub, runtime)
    try {
      pubSub.publish("runtime:navigate-deck", {
        deckId: "nonexistent",
        addToHistory: true,
        buttonId: "5",
      })
      expect(errors).toHaveLength(1)
      const err = errors[0] as {
        deckId: string
        position: number
        details: string
      }
      expect(err.deckId).toBe("main")
      expect(err.position).toBe(5)
      expect(err.details).toContain("missing-navigation-target")
      expect(err.details).toContain("nonexistent")
      expect(runtime.getActiveDeckId()).toBe("main")
    } finally {
      unsubscribe()
    }
  })

  it("navigates to existing deck without emitting a buttonError", () => {
    const { runtime, pubSub } = setup(["main", "media"])
    const errors: unknown[] = []
    pubSub.subscribe("runtime:buttonError", (payload) => {
      errors.push(payload)
    })
    const unsubscribe = subscribeNavigateDeck(pubSub, runtime)
    try {
      pubSub.publish("runtime:navigate-deck", {
        deckId: "media",
        addToHistory: true,
        buttonId: "0",
      })
      expect(errors).toHaveLength(0)
      expect(runtime.getActiveDeckId()).toBe("media")
    } finally {
      unsubscribe()
    }
  })
})
