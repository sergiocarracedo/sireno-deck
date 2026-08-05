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
  const methodsRef: { current: ReturnType<typeof createMethods> | undefined } =
    { current: undefined }
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

  it("returns true for a paginated deck base id when -p1 exists", () => {
    const { runtime } = setup(["main", "demo-media-p1", "demo-media-p2"])
    expect(runtime.deckExists("demo-media")).toBe(true)
  })

  it("returns false for a deck id that does not exist even with a -p suffix", () => {
    const { runtime } = setup(["main", "other-p1"])
    expect(runtime.deckExists("demo-media")).toBe(false)
  })
})

describe("navigateToDeck missing target", () => {
  it("active deck does not change when target does not exist", () => {
    const { runtime } = setup(["main"])
    expect(runtime.getActiveDeckId()).toBe("main")
    runtime.navigateToDeck("nonexistent")
    expect(runtime.getActiveDeckId()).toBe("main")
  })

  it("resolves a paginated base id to its first page", () => {
    const { runtime } = setup(["main", "demo-media-p1", "demo-media-p2"])
    runtime.navigateToDeck("demo-media")
    expect(runtime.getActiveDeckId()).toBe("demo-media-p1")
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
        position: 5,
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

  it("emits a buttonError at the source slot when position is on the payload (production format)", () => {
    // ponytail: position is now a real field on the runtime:navigate-deck
    // payload (added in the change-deck/page-nav backends). The id format
    // `[position]-[deck]-[page]` is opaque and never parsed; pages 2+
    // collide with the page-nav slot's bare-digit prefix if you try.
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
        buttonId: "2-demo-decks-index-1",
        position: 2,
      })
      expect(errors).toHaveLength(1)
      const err = errors[0] as {
        deckId: string
        position: number
        details: string
      }
      expect(err.deckId).toBe("main")
      expect(err.position).toBe(2)
      expect(err.details).toContain("missing-navigation-target")
      expect(err.details).toContain("nonexistent")
      expect(runtime.getActiveDeckId()).toBe("main")
    } finally {
      unsubscribe()
    }
  })

  it("does not emit a buttonError when buttonId is opaque and no position is on the payload", () => {
    // ponytail: pages 2+ cannot rely on parsing position out of buttonId —
    // publishers must forward `position` explicitly. Verify the handler stays
    // silent when they don't (rather than guessing wrong).
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
      expect(errors).toHaveLength(0)
      expect(runtime.getActiveDeckId()).toBe("main")
    } finally {
      unsubscribe()
    }
  })

  it("does not emit a buttonError when target resolves via paginated -p1 fallback", () => {
    const { runtime, pubSub } = setup([
      "main",
      "demo-media-p1",
      "demo-media-p2",
    ])
    const errors: unknown[] = []
    pubSub.subscribe("runtime:buttonError", (payload) => {
      errors.push(payload)
    })
    const unsubscribe = subscribeNavigateDeck(pubSub, runtime)
    try {
      pubSub.publish("runtime:navigate-deck", {
        deckId: "demo-media",
        addToHistory: true,
        buttonId: "2-demo-decks-index-0",
        position: 2,
      })
      expect(errors).toHaveLength(0)
      expect(runtime.getActiveDeckId()).toBe("demo-media-p1")
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
        position: 0,
      })
      expect(errors).toHaveLength(0)
      expect(runtime.getActiveDeckId()).toBe("media")
    } finally {
      unsubscribe()
    }
  })
})
