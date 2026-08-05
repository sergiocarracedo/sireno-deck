import type { PubSub } from "@/core/pub-sub"

import type { Runtime } from "./runtime"

export const subscribeNavigateDeck = (
  pubSub: PubSub,
  runtime: Runtime,
): (() => void) => {
  return pubSub.subscribe("runtime:navigate-deck", (payload: unknown) => {
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("deckId" in payload)
    ) {
      return
    }
    const deckId = String((payload as { deckId: unknown }).deckId)
    const addToHistory =
      "addToHistory" in payload
        ? Boolean((payload as { addToHistory: unknown }).addToHistory)
        : true
    // ponytail: position arrives as a real field on the payload — never parse it
    // from buttonId. The id format `[position]-[deck]-[page]` is opaque; pages
    // 2+ collide with the page-nav slot's bare-digit prefix if you try.
    const sourcePosition =
      "position" in payload &&
      (payload as { position: unknown }).position !== undefined &&
      Number.isFinite(Number((payload as { position: unknown }).position))
        ? Number((payload as { position: unknown }).position)
        : undefined
    const sourceDeckId = runtime.getActiveDeckId()
    // ponytail: check existence BEFORE calling navigateToDeck so we never mutate
    // nav state for a missing target. deckExists is the runtime's public check.
    if (!runtime.deckExists(deckId) && sourcePosition !== undefined) {
      pubSub.publish("runtime:buttonError", {
        deckId: sourceDeckId,
        position: sourcePosition,
        durationMs: 5000,
        details: `missing-navigation-target: ${deckId}`,
      })
      return
    }
    runtime.navigateToDeck(deckId, { addToHistory })
  })
}
