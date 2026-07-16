import type pino from "pino"

import type { PubSub } from "@/core/pub-sub"
import type { Store } from "@/core/store"
import type { GestureKind } from "@/core/gesture-state"
import type { ActiveAppProvider } from "@/system/providers/active-app"
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
  navigateToDeck(id: string, options?: { addToHistory?: boolean }): void
  goBack(): void
  setOverlay(deckId: string | null): void
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
  stopActiveAppPolling(): Promise<void>
  navStackDepth(): number
  hasOverlayDeckAvailable(): boolean
}

export const createRuntime = (options: CreateRuntimeOptions): Runtime => {
  const { decks, pubSub, store, logger, getMethods } = options
  let gestureListener: GestureListener | null = null
  const mainDeck = decks.find((d) => d.isMain) ?? decks[0]
  if (mainDeck === undefined) {
    throw new Error("createRuntime: at least one deck is required")
  }

  const handlers = new Map<string, RuntimeButtonHandler>()
  const navStack: string[] = [mainDeck.id]
  let transientDeckId: string | null = null
  let overlayDeckId: string | null = null
  let overlayPreviousActiveId: string | null = null

  const deckById = (id: string): RuntimeDeck | undefined =>
    decks.find((d) => d.id === id)

  const findButton = (
    id: string,
  ): { deckId: string; button: RuntimeDeck["buttons"][number] } | null => {
    const colonIdx = id.indexOf(":")
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

  const getActiveDeck = (): RuntimeDeck => {
    const id = transientDeckId ?? navStack[navStack.length - 1] ?? mainDeck.id
    const deck = deckById(id)
    if (deck === undefined) throw new Error(`Active deck '${id}' not found`)
    return deck
  }

  const getActiveDeckId = (): string => {
    return (
      overlayDeckId ??
      transientDeckId ??
      navStack[navStack.length - 1] ??
      mainDeck.id
    )
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
    if (navOptions?.addToHistory === false) {
      transientDeckId = id
    } else {
      navStack.push(id)
      transientDeckId = null
    }
    pubSub.publish("runtime:deck-inactive", { deckId: previousActiveId })
    pubSub.publish("runtime:activeDeck", { deckId: id })
  }

  const goBack = (): void => {
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

  const setOverlay = (deckId: string | null): void => {
    if (deckId !== null && deckById(deckId) === undefined) {
      logger.warn({ deckId }, "setOverlay: deck not found")
      return
    }
    const previousActiveId = getActiveDeckId()
    const previousOverlayId = overlayDeckId
    overlayPreviousActiveId = previousActiveId
    overlayDeckId = deckId
    pubSub.publish("runtime:overlay", { deckId })
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

  const invokeAction = async (
    buttonId: string,
    gesture: GestureKind,
  ): Promise<void> => {
    const found = findButton(buttonId)
    if (found === null) {
      logger.warn({ buttonId }, "invokeAction: button not found")
      return
    }
    if (found.deckId !== getActiveDeckId()) {
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
          getMethods().showTemporaryError(found.deckId, position)
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
          getMethods().showTemporaryError(found.deckId, position)
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
  }> => {
    const result: Array<{
      deck: RuntimeDeck
      matcher: ReturnType<typeof compileDeckMatcher>
    }> = []
    for (const deck of decks) {
      if (!deck.processNames || deck.processNames.length === 0) continue
      result.push({ deck, matcher: compileDeckMatcher(deck.processNames) })
    }
    return result
  }

  let activeAppPoll: ReturnType<typeof setInterval> | null = null
  let activeAppProvider: ActiveAppProviderLike | null = null
  let lastOverlayDeckId: string | null = overlayDeckId
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let pendingOverlayDeckId: string | null = null

  const applyOverlay = (deckId: string | null): void => {
    if (deckId === lastOverlayDeckId) return
    if (deckId !== null && deckById(deckId) === undefined) {
      logger.warn({ deckId }, "active-app: overlay deck not found")
      return
    }
    const previousOverlayId = overlayDeckId
    lastOverlayDeckId = deckId
    overlayDeckId = deckId
    pubSub.publish("runtime:overlay", { deckId })
    if (deckId !== null) {
      pubSub.publish("runtime:deck-inactive", {
        deckId: previousOverlayId ?? mainDeck.id,
      })
      pubSub.publish("runtime:activeDeck", { deckId })
    } else {
      if (previousOverlayId !== null) {
        pubSub.publish("runtime:deck-inactive", { deckId: previousOverlayId })
      }
      pubSub.publish("runtime:activeDeck", { deckId: mainDeck.id })
    }
  }

  const computeOverlayFor = (snapshot: {
    name: string
    windowTitle: string | null
    processId: number | null
  }): string | null => {
    for (const { deck, matcher } of overlayDecks()) {
      if (matcher(snapshot)) return deck.id
    }
    return null
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
    activeAppPoll = setInterval(() => {
      void provider.getActive().then((snapshot) => {
        if (snapshot === null) {
          scheduleOverlay(null)
          return
        }
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
    stopActiveAppPolling,
    navStackDepth: () => navStack.length,
    hasOverlayDeckAvailable: () =>
      overlayDeckId !== null || pendingOverlayDeckId !== null,
  }

  return runtime
}
