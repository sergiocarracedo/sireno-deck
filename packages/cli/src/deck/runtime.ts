import type pino from "pino"

import type { PubSub } from "@/core/pub-sub"
import type { Store } from "@/core/store"
import type { GestureKind } from "@/core/gesture-state"
import type { ActiveAppProvider } from "@/system/providers/active-app"
import type { SessionProvider, SessionState } from "@/system/providers/session"
import { getRequiredCapability } from "@/system/requirements"
import { compileDeckMatcher } from "@/system/glob-match"
import type { Methods } from "./methods"

type ActiveAppProviderLike = Pick<ActiveAppProvider, "getActive" | "stop">

export interface RuntimeButton {
  id: string
  type: string
  position?: number
  config?: unknown
  actions?: {
    tap?: string
    dbltap?: string
    hold?: string
  }
  full?: boolean
}

export interface RuntimeDeck {
  id: string
  name: string
  buttons: ReadonlyArray<RuntimeButton>
  isMain?: boolean
  isOverlay?: boolean
  processNames?: ReadonlyArray<string>
  windowNames?: ReadonlyArray<string>
  autoShow?: boolean
  isOverlayDeck?: boolean
  icon?: string
}

export interface RuntimeButtonHandler {
  onTap?: (ctx: ButtonActionContext) => void | Promise<void>
  onDblTap?: (ctx: ButtonActionContext) => void | Promise<void>
  onHold?: (ctx: ButtonActionContext) => void | Promise<void>
  dispose?: () => void | Promise<void>
}

export interface ButtonActionContext {
  buttonId: string
  deckId: string
  config: unknown
  gesture: GestureKind
}

export interface GestureEvent {
  readonly gesture: GestureKind
  readonly at: number
}

export type GestureListener = (buttonId: string, event: GestureEvent) => void

export interface MountedButton {
  addonName: string
  buttonId: string
  type: string
  config: unknown
}

export interface CreateRuntimeOptions {
  decks: ReadonlyArray<RuntimeDeck>
  pubSub: PubSub
  store: Store
  logger: pino.Logger
  getMethods: () => Methods
}

export interface Runtime {
  getActiveDeck(): RuntimeDeck
  getActiveDeckId(): string
  setDecks(decks: ReadonlyArray<RuntimeDeck>): void
  navigateToDeck(id: string, options?: { addToHistory?: boolean }): void
  goBack(): void
  setOverlay(deckId: string | null, opts?: { source?: "autoShow" | "manual" }): void
  getOverlay(): RuntimeDeck | null
  registerButtonHandler(buttonId: string, handler: RuntimeButtonHandler): void
  mountAddonButtons(
    addonName: string,
    buttons: ReadonlyArray<MountedButton>,
  ): void
  dispatchGesture(buttonId: string, gesture: GestureKind): Promise<void>
  invokeAction(buttonId: string, gesture: GestureKind): Promise<void>
  setGestureListener(listener: GestureListener | null): void
  invalidate(): void
  setActiveAppProvider(provider: ActiveAppProviderLike): void
  setSessionProvider(provider: SessionProvider): void
  isLockActive(): boolean
  stopActiveAppPolling(): Promise<void>
  navStackDepth(): number
  hasOverlayDeckAvailable(): boolean
  getAvailableOverlayDeckIcon(): string | null
  getBrightness(): number
  setBrightness(value: number): void
}

export const createRuntime = (options: CreateRuntimeOptions): Runtime => {
  const { pubSub, store, logger, getMethods } = options
  let { decks } = options
  let gestureListener: GestureListener | null = null
  const mainDeck = decks.find((d) => d.isMain) ?? decks[0]
  if (mainDeck === undefined) {
    throw new Error("createRuntime: at least one deck is required")
  }

  const handlers = new Map<string, RuntimeButtonHandler>()
  const navStack: string[] = [mainDeck.id]
  let transientDeckId: string | null = null
  let overlayDeckId: string | null = null
  let availableOverlayDeckId: string | null = null
  let overlayPreviousActiveId: string | null = null
  const overlayNavStacks = new Map<string, string[]>()
  let brightness = 50
  let lockActive = false
  let preLockActiveDeckId: string | null = null
  let preLockOverlayDeckId: string | null = null
  let sessionUnsubscribe: (() => void) | null = null

  const deckById = (id: string): RuntimeDeck | undefined =>
    decks.find((d) => d.id === id)

  const setDecks = (next: ReadonlyArray<RuntimeDeck>): void => {
    decks = next
    // Clear any navigation/overlay state that pointed at decks we no longer have.
    const currentActive = transientDeckId ?? navStack[navStack.length - 1]
    if (currentActive !== undefined && deckById(currentActive) === undefined) {
      navStack.length = 0
      const fallback = decks.find((d) => d.isMain) ?? decks[0]
      if (fallback !== undefined) navStack.push(fallback.id)
      transientDeckId = null
    }
    if (
      overlayDeckId !== null &&
      deckById(overlayDeckId) === undefined
    ) {
      overlayDeckId = null
    }
    pubSub.publish("runtime:activeDeck", { deckId: getActiveDeckId() })
  }

  const findButton = (
    id: string,
  ): { deckId: string; button: RuntimeDeck["buttons"][number] } | null => {
    const colonIdx = id.lastIndexOf(":")
    if (colonIdx === -1) {
      for (const deck of decks) {
        const button = deck.buttons.find((b) => b.id === id)
        if (button !== undefined) return { deckId: deck.id, button }
      }
      return null
    }
    const deckId = id.slice(0, colonIdx)
    const buttonId = id.slice(colonIdx + 1)
    const deck = deckById(deckId)
    if (deck === undefined) return null
    const button = deck.buttons.find((b) => b.id === buttonId)
    if (button === undefined) return null
    return { deckId: deck.id, button }
  }

  // ponytail: lock-mode escape hatch — only these button types can navigate out of lock mode
const LOCK_FOLDER_NAV_TYPES: ReadonlySet<string> = new Set([
  "core:change-deck",
  "core:page-nav",
])

  const getActiveDeck = (): RuntimeDeck => {
    const id = getActiveDeckId()
    const deck = deckById(id)
    if (deck === undefined) throw new Error(`Active deck '${id}' not found`)
    return deck
  }

  const getActiveDeckId = (): string => {
    if (lockActive) return "core:lock"
    if (overlayDeckId !== null) {
      const stack = overlayNavStacks.get(overlayDeckId)
      if (stack !== undefined && stack.length > 0) {
        return stack[stack.length - 1] ?? overlayDeckId
      }
      return overlayDeckId
    }
    return transientDeckId ?? navStack[navStack.length - 1] ?? mainDeck.id
  }

  const snapshotRegularActiveDeckId = (): string =>
        overlayPreviousActiveId ??
        transientDeckId ??
        navStack[navStack.length - 1] ??
        mainDeck.id

const enterLockMode = (): void => {
    if (lockActive) return
    preLockActiveDeckId = snapshotRegularActiveDeckId()
    preLockOverlayDeckId = overlayDeckId
    lockActive = true
    logger.info(
      { preLockActiveDeckId, preLockOverlayDeckId },
      "runtime: lock active",
    )
    pubSub.publish("runtime:lock-mode", { active: true, reason: "session-locked" })
    pubSub.publish("runtime:invalidate", undefined)
  }

const navigateToDeck = (
    id: string,
    navOptions?: { addToHistory?: boolean },
  ): void => {
    if (id === getActiveDeckId()) return
    const target = deckById(id)
    if (target === undefined) {
      logger.warn({ deckId: id }, "navigateToDeck: deck not found")
      return
    }
    const previousActiveId = getActiveDeckId()
    if (overlayDeckId !== null) {
      if (navOptions?.addToHistory === false) {
        transientDeckId = id
      } else {
        const stack = overlayNavStacks.get(overlayDeckId)
        if (stack === undefined) {
          overlayNavStacks.set(overlayDeckId, [overlayDeckId])
        }
        const current = overlayNavStacks.get(overlayDeckId)!
        if (current[current.length - 1] !== id) {
          current.push(id)
        }
        transientDeckId = null
      }
    } else if (navOptions?.addToHistory === false) {
      transientDeckId = id
    } else {
      navStack.push(id)
      transientDeckId = null
    }
    pubSub.publish("runtime:deck-inactive", { deckId: previousActiveId })
    pubSub.publish("runtime:activeDeck", { deckId: id })
  }

  const goBack = (): void => {
    if (overlayDeckId !== null) {
      const stack = overlayNavStacks.get(overlayDeckId)
      if (stack !== undefined && stack.length > 1) {
        const popped = stack.pop()
        const prev = stack[stack.length - 1]
        if (popped !== undefined) {
          pubSub.publish("runtime:deck-inactive", { deckId: popped })
        }
        if (prev !== undefined) {
          pubSub.publish("runtime:activeDeck", { deckId: prev })
        }
      }
      return
    }
    if (transientDeckId !== null) {
      pubSub.publish("runtime:deck-inactive", { deckId: transientDeckId })
      const pageMatch = /^(.*)-p\d+$/.exec(transientDeckId)
      if (pageMatch !== null) {
        const basePageId = `${pageMatch[1]}-p1`
        if (navStack[navStack.length - 1] === basePageId) {
          navStack.pop()
          pubSub.publish("runtime:deck-inactive", { deckId: basePageId })
        }
      }
      transientDeckId = null
      const prev = navStack[navStack.length - 1] ?? mainDeck.id
      pubSub.publish("runtime:activeDeck", { deckId: prev })
      return
    }
    if (navStack.length <= 1) {
      logger.warn("goBack: at root deck; nothing to pop")
      return
    }
    const popped = navStack[navStack.length - 1]
    navStack.pop()
    const prev = navStack[navStack.length - 1]
    if (prev === undefined) return
    if (popped !== undefined) {
      pubSub.publish("runtime:deck-inactive", { deckId: popped })
    }
    pubSub.publish("runtime:activeDeck", { deckId: prev })
  }

  const setOverlay = (
    deckId: string | null,
    opts?: { source?: "autoShow" | "manual" },
  ): void => {
    if (deckId !== null && deckById(deckId) === undefined) {
      logger.warn({ deckId }, "setOverlay: deck not found")
      return
    }
    if (deckId !== null && !overlayNavStacks.has(deckId)) {
      overlayNavStacks.set(deckId, [deckId])
    }
    const previousActiveId = getActiveDeckId()
    const previousOverlayId = overlayDeckId
    if (previousOverlayId === null && deckId !== null) {
      overlayPreviousActiveId = previousActiveId
    }
    overlayDeckId = deckId
    pubSub.publish(
      "runtime:overlay",
      opts?.source !== undefined ? { deckId, source: opts.source } : { deckId },
    )
    if (deckId !== null) {
      if (previousOverlayId !== null) {
        pubSub.publish("runtime:deck-inactive", { deckId: previousOverlayId })
      } else {
        pubSub.publish("runtime:deck-inactive", { deckId: previousActiveId })
      }
      pubSub.publish("runtime:activeDeck", { deckId })
    } else {
      if (previousOverlayId !== null) {
        pubSub.publish("runtime:deck-inactive", { deckId: previousOverlayId })
      }
      const restoreId = overlayPreviousActiveId ?? mainDeck.id
      overlayPreviousActiveId = null
      pubSub.publish("runtime:activeDeck", { deckId: restoreId })
    }
  }

  const getOverlay = (): RuntimeDeck | null => {
    if (overlayDeckId === null) return null
    return deckById(overlayDeckId) ?? null
  }

  const registerButtonHandler = (
    buttonId: string,
    handler: RuntimeButtonHandler,
  ): void => {
    handlers.set(buttonId, handler)
  }

  const mountAddonButtons = (
    addonName: string,
    buttons: ReadonlyArray<MountedButton>,
  ): void => {
    for (const btn of buttons) {
      logger.debug(
        { addonName, buttonId: btn.buttonId, type: btn.type },
        "mounted addon button",
      )
    }
  }

  const handleSystemButton = (
    type: string,
    gesture: GestureKind,
  ): boolean => {
    if (type === "core:back") {
      if (gesture === "tap") {
        goBack()
        return true
      }
      if (gesture === "hold") {
        if (overlayDeckId !== null) {
          navStack.length = 0
          navStack.push(mainDeck.id)
          setOverlay(null)
          return true
        }
        if (availableOverlayDeckId !== null) {
          setOverlay(availableOverlayDeckId)
          return true
        }
        navStack.length = 0
        navStack.push(mainDeck.id)
        const prevTransient = transientDeckId
        transientDeckId = null
        if (prevTransient !== null) {
          pubSub.publish("runtime:deck-inactive", { deckId: prevTransient })
        }
        pubSub.publish("runtime:activeDeck", { deckId: mainDeck.id })
        return true
      }
      if (gesture === "dbl-tap") {
        if (overlayDeckId !== null) {
          setOverlay(null)
        } else if (availableOverlayDeckId !== null) {
          setOverlay(availableOverlayDeckId)
        }
        return true
      }
      return true
    }
    if (type === "core:settings-entry" && gesture === "tap") {
      navigateToDeck("internal-settings:settings", { addToHistory: true })
      return true
    }
    if (
      (type === "core:overlay-toggle" || type === "core:settings-entry") &&
      gesture === "dbl-tap"
    ) {
      if (overlayDeckId !== null) {
        setOverlay(null)
      } else if (availableOverlayDeckId !== null) {
        setOverlay(availableOverlayDeckId)
      }
      return true
    }
    return false
  }

  const invokeAction = async (
    buttonId: string,
    gesture: GestureKind,
  ): Promise<void> => {
    const found = findButton(buttonId)
    if (found === null) {
      logger.warn({ buttonId }, "invokeAction: button not found")
      return
    }

    if (handleSystemButton(found.button.type, gesture)) {
      return
    }

    if (lockActive && found.deckId === "core:lock") {
      if (LOCK_FOLDER_NAV_TYPES.has(found.button.type)) {
        lockActive = false
        preLockActiveDeckId = null
        preLockOverlayDeckId = null
        if (overlayDeckId !== null) setOverlay(null)
        pubSub.publish("runtime:lock-mode", {
          active: false,
          reason: "escape",
        })
        logger.info(
          { buttonId, gesture, buttonType: found.button.type },
          "runtime: lock escaped via folder-nav button",
        )
      } else {
        logger.debug(
          { buttonId, gesture, buttonType: found.button.type },
          "runtime: lock-mode gesture suppressed",
        )
        return
      }
    }

    if (found.deckId !== getActiveDeckId() && found.deckId !== "core:lock") {
      logger.debug(
        { buttonId, deckId: found.deckId, activeDeckId: getActiveDeckId() },
        "invokeAction: gesture on inactive deck, dropping",
      )
      return
    }

    const userAction =
      gesture === "tap"
        ? found.button.actions?.tap
        : gesture === "dbl-tap"
          ? found.button.actions?.dbltap
          : found.button.actions?.hold

    logger.info(
      {
        buttonId,
        deckId: found.deckId,
        gesture,
        buttonType: found.button.type,
        buttonActions: found.button.actions,
        userAction,
      },
      "[runtime] invokeAction resolved",
    )

    const deck = deckById(found.deckId)
    const position =
      found.button.position ??
      (deck !== undefined
        ? deck.buttons.findIndex((b) => b.id === found.button.id)
        : -1)

    if (userAction !== undefined) {
      logger.info(
        { buttonId, gesture, action: userAction },
        "[addon:sireno-deck] user action",
      )
      const capability = getRequiredCapability(userAction)
      if (capability !== null && !getMethods().checkRequirement(capability)) {
        logger.warn(
          { buttonId, gesture, action: userAction, capability },
          "[runtime] action skipped: missing system requirement",
        )
        if (position >= 0) {
          getMethods().showTemporaryError(found.deckId, position, undefined, found.button.id)
        }
        return
      }
      try {
        await getMethods().dispatch(userAction)
      } catch (err) {
        logger.error(
          { buttonId, gesture, err },
          "[addon:sireno-deck] user action failed",
        )
        if (position >= 0) {
          getMethods().showTemporaryError(found.deckId, position, undefined, found.button.id)
        }
      }
      return
    }

    const handlerKey = `${found.deckId}:${found.button.id}`
    const handler = handlers.get(handlerKey)
    if (handler === undefined) {
      return
    }
    const ctx: ButtonActionContext = {
      buttonId,
      deckId: found.deckId,
      config: found.button.config,
      gesture,
    }
    const fn =
      gesture === "tap"
        ? handler.onTap
        : gesture === "dbl-tap"
          ? handler.onDblTap
          : handler.onHold
    if (fn === undefined) {
      return
    }
    await fn(ctx)
  }

  const dispatchGesture = async (
    buttonId: string,
    gesture: GestureKind,
  ): Promise<void> => {
    const found = findButton(buttonId)
    if (found === null) {
      logger.warn({ buttonId }, "dispatchGesture: button not found")
      return
    }
    gestureListener?.(found.button.id, { gesture, at: Date.now() })
    await invokeAction(buttonId, gesture)
  }

  const setGestureListener = (listener: GestureListener | null): void => {
    gestureListener = listener
  }

  const invalidate = (): void => {
    pubSub.publish("runtime:invalidate", { activeDeckId: getActiveDeckId() })
  }

  void store

  const overlayDecks = (): Array<{
    deck: RuntimeDeck
    matcher: ReturnType<typeof compileDeckMatcher>
    specificity: number
  }> => {
    const result: Array<{
      deck: RuntimeDeck
      matcher: ReturnType<typeof compileDeckMatcher>
      specificity: number
    }> = []
    for (const deck of decks) {
      const hasProcess =
        deck.processNames !== undefined && deck.processNames.length > 0
      const hasWindow =
        deck.windowNames !== undefined && deck.windowNames.length > 0
      if (!hasProcess && !hasWindow) continue
      result.push({
        deck,
        matcher: compileDeckMatcher({
          processNames: deck.processNames,
          windowNames: deck.windowNames,
        }),
        specificity: (hasProcess ? 1 : 0) + (hasWindow ? 1 : 0),
      })
    }
    return result
  }

  let activeAppPoll: ReturnType<typeof setInterval> | null = null
  let activeAppProvider: ActiveAppProviderLike | null = null
  let lastOverlayDeckId: string | null = overlayDeckId
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let pendingOverlayDeckId: string | null = null
  let latestActiveAppSnapshot: {
    name: string
    windowTitle: string | null
    processId: number | null
  } | null = null

  const applyOverlay = (deckId: string | null): void => {
    if (deckId !== null && deckById(deckId) === undefined) {
      logger.warn({ deckId }, "active-app: overlay deck not found")
      return
    }
    if (overlayDeckId !== null && deckId !== overlayDeckId) {
      logger.info(
        { prevOverlayId: overlayDeckId, newMatch: deckId },
        "active-app: dismissing previous overlay (trigger no longer applies)",
      )
      setOverlay(null, { source: "autoShow" })
    }
    if (deckId === null) {
      lastOverlayDeckId = null
      return
    }
    if (deckId === lastOverlayDeckId) return
    const deck = deckById(deckId)
    if (deck === undefined) return
    logger.info(
      { deckId, autoShow: deck.autoShow === true },
      "active-app: applying overlay",
    )
    if (deck.autoShow !== true) {
      lastOverlayDeckId = deckId
      return
    }
    lastOverlayDeckId = deckId
    setOverlay(deckId, { source: "autoShow" })
  }

  const computeOverlayFor = (snapshot: {
    name: string
    windowTitle: string | null
    processId: number | null
  }): string | null => {
    let bestId: string | null = null
    let bestSpecificity = -1
    for (const { deck, matcher, specificity } of overlayDecks()) {
      if (!matcher(snapshot)) continue
      if (specificity > bestSpecificity) {
        bestId = deck.id
        bestSpecificity = specificity
      }
    }
    if (availableOverlayDeckId !== bestId) {
      const prev = availableOverlayDeckId
      availableOverlayDeckId = bestId
      if (bestId !== null) {
        logger.info(
          { from: prev, to: bestId, snapshot: { name: snapshot.name, windowTitle: snapshot.windowTitle } },
          "active-app: overlay deck available",
        )
      } else if (prev !== null) {
        logger.info({ from: prev }, "active-app: no overlay deck matches")
      }
      pubSub.publish("runtime:overlay-available", { deckId: bestId })
    }
    return bestId
  }

  const scheduleOverlay = (deckId: string | null): void => {
    pendingOverlayDeckId = deckId
    if (debounceTimer !== null) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      const next = pendingOverlayDeckId
      pendingOverlayDeckId = null
      applyOverlay(next)
    }, 200)
  }

  const startActiveAppLoop = (provider: ActiveAppProviderLike): void => {
    if (activeAppPoll !== null) return
    logger.info("active-app: poll loop started")
    activeAppPoll = setInterval(() => {
      void provider.getActive().then((snapshot) => {
        if (snapshot === null) {
          latestActiveAppSnapshot = null
          scheduleOverlay(null)
          return
        }
        latestActiveAppSnapshot = snapshot
        logger.debug(
          { snapshot: { name: snapshot.name, windowTitle: snapshot.windowTitle } },
          "active-app: snapshot",
        )
        scheduleOverlay(computeOverlayFor(snapshot))
      })
    }, 1000)
  }

  const stopActiveAppLoop = (): void => {
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    pendingOverlayDeckId = null
    if (activeAppPoll !== null) {
      clearInterval(activeAppPoll)
      activeAppPoll = null
    }
  }

  const setActiveAppProvider = (provider: ActiveAppProviderLike): void => {
    activeAppProvider = provider
    startActiveAppLoop(provider)
  }

  const setSessionProvider = (provider: SessionProvider): void => {
    if (sessionUnsubscribe !== null) {
      sessionUnsubscribe()
      sessionUnsubscribe = null
    }
    const handle = (state: SessionState): void => {
      if (state === "locked" && !lockActive) {
        enterLockMode()
        return
      }
      if (state === "locked" && lockActive) {
        preLockActiveDeckId = snapshotRegularActiveDeckId()
        preLockOverlayDeckId = overlayDeckId
        logger.info("runtime: lock snapshot refreshed on re-lock")
        return
      }
      if (state === "unlocked" && lockActive) {
        lockActive = false
        const overlaySnapshot = preLockOverlayDeckId
        const activeSnapshot = preLockActiveDeckId
        preLockActiveDeckId = null
        preLockOverlayDeckId = null
        if (
          overlaySnapshot !== null &&
          latestActiveAppSnapshot !== null &&
          computeOverlayFor(latestActiveAppSnapshot) === overlaySnapshot
        ) {
          logger.info(
            { overlayId: overlaySnapshot },
            "runtime: overlay auto-resumed on unlock (trigger still matches)",
          )
          setOverlay(overlaySnapshot, { source: "autoShow" })
        } else {
          if (overlayDeckId !== null) setOverlay(null)
          const restoreId = activeSnapshot ?? mainDeck.id
          logger.info(
            { restoreId, overlayWas: overlaySnapshot, triggerMatches: false },
            "runtime: lock cleared, restoring previous deck",
          )
          navigateToDeck(restoreId, { addToHistory: false })
        }
        pubSub.publish("runtime:lock-mode", { active: false, reason: "session-unlocked" })
        pubSub.publish("runtime:invalidate", undefined)
      }
    }
    sessionUnsubscribe = provider.subscribe(handle)
  }

  const stopActiveAppPolling = async (): Promise<void> => {
    stopActiveAppLoop()
    if (activeAppProvider !== null) {
      try {
        await activeAppProvider.stop()
      } catch (err) {
        logger.warn({ err }, "active-app: provider stop() failed")
      }
      activeAppProvider = null
    }
  }

  const runtime: Runtime = {
    getActiveDeck,
    getActiveDeckId,
    setDecks,
    navigateToDeck,
    goBack,
    setOverlay,
    getOverlay,
    registerButtonHandler,
    mountAddonButtons,
    dispatchGesture,
    invokeAction,
    setGestureListener,
    invalidate,
    setActiveAppProvider,
    setSessionProvider,
    isLockActive: () => lockActive,
    stopActiveAppPolling,
    navStackDepth: () => navStack.length,
    hasOverlayDeckAvailable: () =>
      availableOverlayDeckId !== null || pendingOverlayDeckId !== null,
    getAvailableOverlayDeckIcon: (): string | null => {
      const id = availableOverlayDeckId ?? pendingOverlayDeckId
      if (id === null) return null
      const deck = deckById(id)
      return deck?.icon ?? null
    },
    getBrightness: () => brightness,
    setBrightness: (value: number) => {
      const clamped = Math.max(10, Math.min(100, Math.round(value)))
      if (clamped === brightness) return
      brightness = clamped
      pubSub.publish("sireno:settings:brightness", { value: clamped })
    },
  }

  return runtime
}
