import type pino from "pino"

import { compileDeckMatcher } from "@/system/glob-match"
import type { ActiveAppProvider } from "@/system/providers/active-app"
import type { SessionProvider } from "@/system/providers/session"

import type { Runtime, RuntimeDeck } from "./runtime"

const DEFAULT_POLL_MS = 1000
const DEFAULT_DEBOUNCE_MS = 200

type ActiveAppProviderLike = Pick<ActiveAppProvider, "getActive" | "stop">

export interface HostPolicyCoordinator {
  start(): void
  updateDecks(decks: ReadonlyArray<RuntimeDeck>): void
  dispose(): Promise<void>
}

export interface CreateHostPolicyCoordinatorOptions {
  readonly runtime: Pick<
    Runtime,
    | "enterLock"
    | "getOverlay"
    | "restoreFromLock"
    | "setAvailableOverlayDeck"
    | "setOverlay"
  >
  readonly activeApp: ActiveAppProviderLike
  readonly session: SessionProvider
  readonly decks: ReadonlyArray<RuntimeDeck>
  readonly logger: pino.Logger
  readonly pollIntervalMs?: number
  readonly debounceMs?: number
}

export const createHostPolicyCoordinator = (
  options: CreateHostPolicyCoordinatorOptions,
): HostPolicyCoordinator => {
  const logger = options.logger.child({ component: "host-policy" })
  let decks = options.decks
  let poll: ReturnType<typeof setInterval> | null = null
  let debounce: ReturnType<typeof setTimeout> | null = null
  let pendingDeckId: string | null = null
  let latestSnapshot: Awaited<ReturnType<ActiveAppProviderLike["getActive"]>> =
    null
  let hasObservedActiveApp = false
  let lastMatchedDeckId: string | null = null
  let lockSnapshot: ReturnType<Runtime["enterLock"]> | null = null
  let unsubscribeSession: (() => void) | null = null

  const match = (
    snapshot: NonNullable<typeof latestSnapshot>,
  ): RuntimeDeck | null => {
    let result: RuntimeDeck | null = null
    let specificity = -1
    for (const deck of decks) {
      const hasProcess = (deck.processNames?.length ?? 0) > 0
      const hasWindow = (deck.windowNames?.length ?? 0) > 0
      if (!hasProcess && !hasWindow) continue
      const matcher = compileDeckMatcher({
        processNames: deck.processNames,
        windowNames: deck.windowNames,
      })
      const nextSpecificity = Number(hasProcess) + Number(hasWindow)
      if (matcher(snapshot) && nextSpecificity > specificity) {
        result = deck
        specificity = nextSpecificity
      }
    }
    return result
  }

  const apply = (deckId: string | null): void => {
    const deck =
      deckId === null ? null : decks.find((item) => item.id === deckId)
    const currentOverlayId = options.runtime.getOverlay()?.id ?? null
    if (deck === null) {
      options.runtime.setAvailableOverlayDeck(null)
      if (currentOverlayId !== null)
        options.runtime.setOverlay(null, { source: "autoShow" })
      lastMatchedDeckId = null
      return
    }
    if (deck === undefined) return
    options.runtime.setAvailableOverlayDeck(deck.id)
    if (currentOverlayId !== null && currentOverlayId !== deck.id) {
      options.runtime.setOverlay(deck.autoShow === true ? deck.id : null, {
        source: "autoShow",
      })
      lastMatchedDeckId = deck.id
      return
    }
    if (deck.id !== lastMatchedDeckId && deck.autoShow === true) {
      options.runtime.setOverlay(deck.id, { source: "autoShow" })
    }
    lastMatchedDeckId = deck.id
  }

  const schedule = (deckId: string | null): void => {
    pendingDeckId = deckId
    if (debounce !== null) clearTimeout(debounce)
    debounce = setTimeout(() => {
      debounce = null
      apply(pendingDeckId)
      pendingDeckId = null
    }, options.debounceMs ?? DEFAULT_DEBOUNCE_MS)
  }

  const pollActiveApp = (): void => {
    void options.activeApp.getActive().then((snapshot) => {
      latestSnapshot = snapshot
      hasObservedActiveApp = true
      const matchedDeck = snapshot === null ? null : match(snapshot)
      logger.debug(
        { snapshot, matchedDeckId: matchedDeck?.id ?? null },
        "active-app: focus snapshot",
      )
      schedule(matchedDeck?.id ?? null)
    })
  }

  const handleSession = (
    state: ReturnType<SessionProvider["getState"]>,
  ): void => {
    if (state === "locked") {
      lockSnapshot = options.runtime.enterLock()
      return
    }
    if (state !== "unlocked" || lockSnapshot === null) return
    const matchingId =
      latestSnapshot === null ? null : (match(latestSnapshot)?.id ?? null)
    options.runtime.restoreFromLock({
      activeDeckId: lockSnapshot.activeDeckId,
      overlayDeckId:
        !hasObservedActiveApp || lockSnapshot.overlayDeckId === matchingId
          ? lockSnapshot.overlayDeckId
          : null,
    })
    lockSnapshot = null
  }

  return {
    start(): void {
      if (poll !== null) return
      unsubscribeSession = options.session.subscribe(handleSession)
      if (options.session.getState() === "locked") handleSession("locked")
      poll = setInterval(
        pollActiveApp,
        options.pollIntervalMs ?? DEFAULT_POLL_MS,
      )
      pollActiveApp()
    },
    updateDecks(nextDecks): void {
      decks = nextDecks
      if (latestSnapshot !== null) schedule(match(latestSnapshot)?.id ?? null)
    },
    async dispose(): Promise<void> {
      if (poll !== null) clearInterval(poll)
      poll = null
      if (debounce !== null) clearTimeout(debounce)
      debounce = null
      unsubscribeSession?.()
      unsubscribeSession = null
      await options.activeApp.stop()
    },
  }
}
