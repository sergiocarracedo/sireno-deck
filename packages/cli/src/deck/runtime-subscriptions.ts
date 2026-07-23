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
    const buttonId =
      "buttonId" in payload
        ? String((payload as { buttonId: unknown }).buttonId)
        : undefined
    // ponytail: missing nav target is a button-level error, not a deck-level
    // one — never mutate navigation state. Capture source position so we can
    // publish the error to the correct slot if the target does not exist.
    const sourceDeckId = runtime.getActiveDeckId()
    const sourcePosition =
      buttonId !== undefined && Number.isFinite(Number(buttonId))
        ? Number(buttonId)
        : undefined
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
