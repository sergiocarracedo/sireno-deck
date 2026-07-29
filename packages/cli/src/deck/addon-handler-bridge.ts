import type pino from "pino"

import type { ActionExecutor } from "@/action/executor"
import type {
  AddonServiceContext,
  AddonServiceMethod,
  AddonButtonService,
  AddonButtonServiceContext,
  AddonGlobalService,
  AddonGlobalPoller,
} from "@/addon/api"
import type { ScannedAddon } from "@/cli/commands/addon-registry"
import type { PubSub } from "@/core/pub-sub"
import type { Store } from "@/core/store"
import type { Methods } from "@/deck/methods"
import type { Runtime, RuntimeDeck } from "@/deck/runtime"
import type { StatePublisher } from "@/render/state-publisher"
import type { WsBridge } from "@/render/ws-bridge"

export interface BridgeAddonServicesParams {
  readonly runtime: Runtime
  readonly decks: ReadonlyArray<RuntimeDeck>
  readonly scanned: ReadonlyArray<ScannedAddon>
  // ponytail: third-party (registry-loaded) addons that supply buttonTypes
  // and/or globalService. Wired identically to built-ins; only the module
  // path differs.
  readonly externalAddons: ReadonlyArray<ScannedAddon>
  readonly executor: ActionExecutor
  readonly pubSub: PubSub
  readonly store: Store
  readonly signal: AbortSignal
  readonly logger: pino.Logger
  readonly statePublisher: Pick<StatePublisher, "registerChannel">
  readonly bridge: Pick<WsBridge, "broadcast" | "registerCacheablePoller">
  readonly methods: Methods
}

type AddonModule = {
  readonly default?: unknown
  readonly manifest?: unknown
}

const namespacedKey = (addonName: string, methodName: string): string =>
  `${addonName}:${methodName}`

export interface AddonBridgeHandle {
  dispose(): void
}

export const bridgeAddonServices = async (
  params: BridgeAddonServicesParams,
): Promise<AddonBridgeHandle> => {
  const {
    runtime,
    decks,
    scanned,
    externalAddons,
    executor,
    pubSub,
    store,
    signal,
    statePublisher,
    bridge,
    methods,
  } = params

  // ponytail: built-in and third-party addons wire through the same loop;
  // built-ins come from the static registry, third-parties from the loader.
  const allAddons: ReadonlyArray<ScannedAddon> = [...scanned, ...externalAddons]

  runtime.setGestureListener((buttonId, event) => {
    bridge.broadcast({
      type: "state",
      channels: { [`runtime:gesture:${buttonId}`]: event },
    })
  })

  const abortController = new AbortController()
  signal.addEventListener("abort", () => abortController.abort())

  const registeredHandlerIds = new Set<string>()
  const trackedCleanup: Array<() => void> = []

  const addonModules = new Map<string, AddonModule>()
  const addonGlobalServices = new Map<string, AddonGlobalService>()
  const addonMethods = new Map<
    string,
    Readonly<Record<string, AddonServiceMethod>>
  >()

  for (const addon of allAddons) {
    if (addon.globalServiceEntry === null) continue

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = (await import(addon.globalServiceEntry)) as AddonModule
      let globalService: AddonGlobalService | undefined
      if (
        typeof (mod as unknown as { globalService?: AddonGlobalService })
          .globalService === "object"
      ) {
        globalService = (
          mod as unknown as { globalService: AddonGlobalService }
        ).globalService
      } else {
        const exported =
          mod.manifest ??
          (mod.default && typeof mod.default === "object" ? mod.default : null)
        if (exported === null) continue
        const manifest = exported as {
          readonly name?: string
          readonly globalService?: AddonGlobalService
        }
        globalService = manifest.globalService
      }
      if (globalService === undefined) continue

      addonModules.set(addon.name, mod)
      addonGlobalServices.set(addon.name, globalService)
    } catch {
      // Skip addons whose global backend fails to load.
    }
  }

  for (const [addonName, globalService] of addonGlobalServices) {
    const primaryChannel = globalService.pollers?.[0]?.channel
    const pollersById = new Map<string, AddonGlobalPoller>()
    for (const poller of globalService.pollers ?? []) {
      pollersById.set(poller.id, poller)
    }

    const ctx: AddonServiceContext = {
      publish: (data: unknown) => {
        if (primaryChannel !== undefined) {
          bridge.broadcast({
            type: "state",
            channels: { [primaryChannel]: data },
          })
        } else {
          pubSub.publish(`addon:${addonName}`, data)
        }
      },
      poll: async (id: string) => {
        const poller = pollersById.get(id)
        if (poller === undefined) return
        try {
          const value = await poller.poll(ctx)
          bridge.broadcast({
            type: "state",
            channels: { [poller.channel]: value },
          })
        } catch (err) {
          logger.error({ addonName, id, err }, `addon poll failed`)
        }
      },
      signal: abortController.signal,
      executor,
    }

    if (globalService.pollers !== undefined) {
      for (const poller of globalService.pollers) {
        statePublisher.registerChannel({
          channel: poller.channel,
          addonName,
          intervalMs: poller.intervalMs,
          poll: () => poller.poll(ctx),
        })
        bridge.registerCacheablePoller(poller.channel, () => poller.poll(ctx))
      }
    }

    try {
      const result = globalService.onLoad?.(ctx)
      if (result instanceof Promise) {
        result.catch((err) => {
          logger.error({ addonName, err }, `addon onLoad failed`)
        })
      }

      if (globalService.methods !== undefined) {
        addonMethods.set(addonName, globalService.methods)
      }
    } catch (err) {
      logger.error({ addonName, err }, `addon onLoad threw`)
    }
  }

  const deckButtonCleanup = new Map<
    string,
    Array<{
      buttonAbort: AbortController
      buttonService: AddonButtonService
      wrappedCtx: AddonButtonServiceContext<unknown>
    }>
  >()

  for (const deck of decks) {
    for (const button of deck.buttons) {
      const buttonType = button.type

      let addonName: string | null = null
      let resolvedButtonType: string | null = null
      for (const addon of allAddons) {
        if (addon.types.includes(buttonType)) {
          addonName = addon.name
          resolvedButtonType = buttonType
          break
        }
        if (addon.defaultButton !== null && addon.name === buttonType) {
          addonName = addon.name
          resolvedButtonType = addon.defaultButton
          break
        }
      }

      if (addonName === null || resolvedButtonType === null) continue

      const globalMethods = addonMethods.get(addonName) ?? {}
      const buttonMethods: Record<string, AddonServiceMethod> = {}
      for (const [methodName, method] of Object.entries(globalMethods)) {
        buttonMethods[namespacedKey(addonName, methodName)] = method
      }

      let addonMod: AddonModule | null = null
      for (const addon of allAddons) {
        if (addon.name !== addonName) continue
        if (addon.frontendEntry === null) continue
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          addonMod = (await import(addon.frontendEntry)) as AddonModule
        } catch {
          // Skip.
        }
        break
      }

      const exported = addonMod
        ? (addonMod.manifest ??
          (addonMod.default && typeof addonMod.default === "object"
            ? addonMod.default
            : null))
        : null

      if (exported === null) continue

      const manifest = exported as {
        readonly name?: string
        readonly buttonTypes?: Record<
          string,
          { readonly service?: AddonButtonService }
        >
      }

      const buttonTypeEntry = manifest.buttonTypes?.[resolvedButtonType]
      if (buttonTypeEntry?.service === undefined) continue

      const buttonService = buttonTypeEntry.service
      const buttonCtx: AddonButtonServiceContext<unknown> = {
        config: button.config ?? {},
        buttonId: button.id,
        addonName,
        methods: Object.freeze(buttonMethods),
        coreMethods: methods,
        publish: (channel: string, data: unknown) =>
          pubSub.publish(channel, data),
        executor,
        signal: abortController.signal,
        store,
      }

      const buttonAbort = new AbortController()
      abortController.signal.addEventListener("abort", () =>
        buttonAbort.abort(),
      )

      const wrappedCtx = {
        ...buttonCtx,
        signal: buttonAbort.signal,
      }

      const existing = deckButtonCleanup.get(deck.id) ?? []
      existing.push({ buttonAbort, buttonService, wrappedCtx })
      deckButtonCleanup.set(deck.id, existing)

      try {
        buttonService.onMount?.(wrappedCtx)
      } catch (err) {
        logger.error({ addonName, buttonType, err }, `addon onMount threw`)
      }

      const allowedGestures = buttonService.gestureHandlers
      const handler = {
        async onTap(ctx: {
          buttonId: string
          config: unknown
          gesture: string
        }) {
          if (allowedGestures === undefined || !allowedGestures.includes("tap"))
            return
          try {
            await buttonService.onTap?.(wrappedCtx)
          } catch (err) {
            logger.error(
              { addonName, buttonType: resolvedButtonType, err },
              `addon onTap failed`,
            )
          }
        },
        async onDblTap(ctx: {
          buttonId: string
          config: unknown
          gesture: string
        }) {
          if (
            allowedGestures === undefined ||
            !allowedGestures.includes("dbl-tap")
          )
            return
          try {
            await buttonService.onDblTap?.(wrappedCtx)
          } catch (err) {
            logger.error(
              { addonName, buttonType: resolvedButtonType, err },
              `addon onDblTap failed`,
            )
          }
        },
        async onHold(ctx: {
          buttonId: string
          config: unknown
          gesture: string
        }) {
          if (
            allowedGestures === undefined ||
            !allowedGestures.includes("hold")
          )
            return
          try {
            await buttonService.onHold?.(wrappedCtx)
          } catch (err) {
            logger.error(
              { addonName, buttonType: resolvedButtonType, err },
              `addon onHold failed`,
            )
          }
        },
        dispose() {
          buttonAbort.abort()
          try {
            buttonService.dispose?.(wrappedCtx)
          } catch (err) {
            logger.error({ addonName, buttonType, err }, `addon dispose failed`)
          }
        },
      }

      runtime.registerButtonHandler(`${deck.id}:${button.id}`, handler)
      registeredHandlerIds.add(`${deck.id}:${button.id}`)
    }
  }

  const unsubscribeDeckInactive = pubSub.subscribe(
    "runtime:deck-inactive",
    (payload: unknown) => {
      if (
        typeof payload !== "object" ||
        payload === null ||
        !("deckId" in payload)
      ) {
        return
      }
      const deckId = String((payload as { deckId: unknown }).deckId)
      const tracked = deckButtonCleanup.get(deckId)
      if (tracked === undefined) return
      for (const { buttonAbort, buttonService, wrappedCtx } of tracked) {
        try {
          buttonService.onUnmount?.(wrappedCtx)
        } catch (err) {
          logger.error({ deckId, err }, `bridge onUnmount failed`)
        }
        buttonAbort.abort()
      }
    },
  )
  trackedCleanup.push(unsubscribeDeckInactive)

  abortController.signal.addEventListener("abort", () => {
    for (const [addonName, globalService] of addonGlobalServices) {
      try {
        const ctx: AddonServiceContext = {
          publish: () => {},
          poll: async () => {},
          signal: abortController.signal,
          executor,
        }
        globalService.onUnload?.(ctx)
      } catch (err) {
        logger.error({ addonName, err }, `addon onUnload failed`)
      }
    }
  })

  let disposed = false
  const dispose = (): void => {
    if (disposed) return
    disposed = true
    for (const cleanup of trackedCleanup) cleanup()
    for (const handlerId of registeredHandlerIds) {
      runtime.unregisterButtonHandler(handlerId)
    }
    registeredHandlerIds.clear()
    for (const tracked of deckButtonCleanup.values()) {
      for (const { buttonAbort, buttonService, wrappedCtx } of tracked) {
        try {
          buttonService.onUnmount?.(wrappedCtx)
        } catch (err) {
          logger.error({ err }, `bridge onUnmount failed`)
        }
        buttonAbort.abort()
      }
    }
    deckButtonCleanup.clear()
    for (const [addonName, globalService] of addonGlobalServices) {
      try {
        const ctx: AddonServiceContext = {
          publish: () => {},
          poll: async () => {},
          signal: abortController.signal,
          executor,
        }
        globalService.onUnload?.(ctx)
      } catch (err) {
        logger.error({ addonName, err }, `addon onUnload failed`)
      }
    }
    abortController.abort()
  }

  return { dispose }
}
