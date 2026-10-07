import type pino from "pino"
import type { WebSocket } from "ws"

import type { PubSub } from "@/core/pub-sub"
import type { WsBridge } from "@/render/ws-bridge"

import {
  buildDeckConfigMessage,
  type AddonFrontendRef,
  type AssetLookup,
} from "./deck-config"
import type { Runtime } from "./runtime"
import type { ResolveIconPathOptions } from "@/render/icon-source-resolver"

export interface DeckPresentationPublisher {
  start(): void
  refresh(options?: { force?: boolean }): void
  sendInitial(socket: WebSocket): void
  updateResolverOptions(options: ResolveIconPathOptions): void
  dispose(): void
}

export interface CreateDeckPresentationPublisherOptions {
  readonly runtime: Pick<
    Runtime,
    | "getActiveDeck"
    | "getAvailableOverlayDeckIcon"
    | "getAvailableOverlayDeckName"
    | "getOverlay"
    | "hasOverlayDeckAvailable"
    | "isLockActive"
    | "navStackDepth"
  >
  readonly pubSub: Pick<PubSub, "subscribe">
  readonly bridge: Pick<WsBridge, "broadcast" | "onConnection" | "sendToCaller">
  readonly addonByType: Map<string, AddonFrontendRef>
  readonly resolverOptions: ResolveIconPathOptions
  readonly keyCount: number
  readonly isCompact: boolean
  readonly assetLookup: AssetLookup
  readonly logger: pino.Logger
}

export const createDeckPresentationPublisher = (
  options: CreateDeckPresentationPublisherOptions,
): DeckPresentationPublisher => {
  const logger = options.logger.child({ component: "deck-presentation" })
  let resolverOptions = options.resolverOptions
  let lastPayload: string | null = null
  let unsubscribers: Array<() => void> = []

  const message = () => {
    const activeDeck = options.runtime.getActiveDeck()
    return buildDeckConfigMessage(
      activeDeck,
      options.addonByType,
      resolverOptions,
      {
        navStackDepth: options.runtime.navStackDepth(),
        hasOverlayDeckAvailable: options.runtime.hasOverlayDeckAvailable(),
        inOverlayMode: options.runtime.getOverlay() !== null,
      },
      options.keyCount,
      options.isCompact,
      options.assetLookup,
      options.runtime.getAvailableOverlayDeckIcon(),
      options.runtime.getAvailableOverlayDeckName(),
      { lockActive: options.runtime.isLockActive() },
    )
  }

  const refresh = ({ force = false }: { force?: boolean } = {}): void => {
    const next = message()
    const payload = JSON.stringify(next)
    if (!force && payload === lastPayload) return
    lastPayload = payload
    options.bridge.broadcast(next)
    logger.debug({ deckId: next.deckId, force }, "published deck-config")
  }

  const sendInitial = (socket: WebSocket): void => {
    const next = message()
    if (options.bridge.sendToCaller !== undefined) {
      options.bridge.sendToCaller(socket, next)
    } else if (socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify(next))
    }
    logger.debug({ deckId: next.deckId }, "sent initial deck-config")
  }

  return {
    start(): void {
      if (unsubscribers.length > 0) return
      unsubscribers = [
        options.pubSub.subscribe("runtime:activeDeck", () => refresh()),
        options.pubSub.subscribe("runtime:overlay-available", () => refresh()),
        options.pubSub.subscribe("runtime:invalidate", () =>
          refresh({ force: true }),
        ),
        options.pubSub.subscribe("runtime:lock-mode", () =>
          refresh({ force: true }),
        ),
      ]
      options.bridge.onConnection(sendInitial)
    },
    refresh,
    sendInitial,
    updateResolverOptions: (next) => {
      resolverOptions = next
    },
    dispose(): void {
      for (const unsubscribe of unsubscribers) unsubscribe()
      unsubscribers = []
    },
  }
}
