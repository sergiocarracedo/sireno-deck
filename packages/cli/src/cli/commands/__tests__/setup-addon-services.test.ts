import { afterEach, describe, expect, it, vi } from "vitest"

import { createPubSub } from "@/core/pub-sub"
import {
  createDeckPresentationPublisher,
  createRuntime,
  type RuntimeDeck,
} from "@/deck"
import { injectSystemButtons } from "@/deck/system-back-injection"

const logger = {
  child: () => logger,
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as never

describe("deck presentation broadcasts", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("keeps the injected back button for the overlay split action", () => {
    const mainDeck: RuntimeDeck = {
      id: "main",
      name: "Main",
      isMain: true,
      buttons: [],
    }
    const sourceOverlay: RuntimeDeck = {
      id: "app-shortcuts:chrome-p1",
      name: "Chrome",
      processNames: ["google-chrome"],
      buttons: [],
    }
    const decks = injectSystemButtons([mainDeck, sourceOverlay], 15)
    const pubSub = createPubSub({ debounceMs: 60_000 })
    const runtime = createRuntime({
      decks,
      pubSub,
      store: {} as never,
      logger,
      getMethods: () => ({}) as never,
    })
    const broadcast = vi.fn()
    const presentation = createDeckPresentationPublisher({
      runtime,
      pubSub,
      addonByType: new Map(),
      bridge: {
        broadcast,
        onConnection: vi.fn(),
      } as never,
      isCompact: false,
      resolverOptions: {} as never,
      keyCount: 15,
      assetLookup: () => undefined,
      logger,
    })
    presentation.start()

    runtime.setOverlay(sourceOverlay.id)

    const message = broadcast.mock.calls
      .map(
        ([value]) =>
          value as {
            deckId?: string
            surfaces?: Record<
              string,
              { buttons?: Array<{ position?: number; type: string }> }
            >
          },
      )
      .find((value) => value.deckId === sourceOverlay.id)
    const n1Button = message?.surfaces?.[sourceOverlay.id]?.buttons?.find(
      (button) => button.position === 14,
    )

    expect(n1Button?.type).toBe("core:back")

    presentation.dispose()
    pubSub.dispose()
  })
})
