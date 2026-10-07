import type pino from "pino"

import type { ActionExecutor } from "@/action/executor"
import type {
  AddonServiceContext,
  AddonServiceMethod,
  AddonButtonService,
  AddonButtonServiceContext,
  AddonButtonTypeService,
  AddonGlobalService,
  AddonGlobalPoller,
} from "@/addon/api"
import type { ScannedAddon } from "@/cli/commands/addon-registry"
import { BUILTIN_MANIFESTS } from "@/builtin-addons/register-builtins"
import { BUILTIN_GLOBAL_SERVICES } from "@/builtin-addons/global-services"
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
  /** Optional host callback that re-materializes addon decks (dynamic decks). */
  readonly requestDeckRebuild?: () => void
}

type AddonModule = {
  readonly default?: unknown
  readonly manifest?: unknown
}

const namespacedKey = (addonName: string, methodName: string): string =>
  `${addonName}:${methodName}`

/**
 * A builtin's module without going through the filesystem.
 *
 * ponytail: importing a builtin by path is the one thing that cannot work in a
 * published install — the path points at TypeScript source that uses `@/`
 * aliases, so plain node refuses it and every builtin button loses its backend.
 * The manifests are compiled into the bundle already, so prefer the object.
 * A third-party addon is still loaded from disk, which is correct: it is not
 * part of this package and has a real, loadable entry file.
 */
const staticAddonModule = (addonName: string): AddonModule | null => {
  const manifest = BUILTIN_MANIFESTS.get(addonName)
  return manifest === undefined ? null : ({ manifest } as AddonModule)
}

/**
 * The module carrying a builtin's global service, without touching the disk.
 *
 * ponytail: taking the manifest for this unconditionally was wrong and broke
 * `coding-agents`, whose manifest mentions `globalService` only in a comment —
 * the service itself lives in `global-entry.ts`. The bridge found no service on
 * the manifest, skipped the addon, and never fell back to the import, so the
 * agents deck and summary button went empty and the persisted snapshot stopped
 * being refreshed. Only stand in for the import when there is genuinely a
 * service to hand over.
 */
const staticGlobalServiceModule = (addonName: string): AddonModule | null => {
  const direct = BUILTIN_GLOBAL_SERVICES.get(addonName)
  if (direct !== undefined)
    return { globalService: direct } as unknown as AddonModule
  const fromManifest = staticAddonModule(addonName)
  if (fromManifest === null) return null
  const manifest = fromManifest.manifest as
    | { globalService?: unknown }
    | undefined
  return manifest?.globalService === undefined ? null : fromManifest
}

export interface AddonBridgeHandle {
  reconcile(decks: ReadonlyArray<RuntimeDeck>): Promise<void>
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
    requestDeckRebuild,
  } = params
  const logger = params.logger.child({ component: "addon-handler" })

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
      const mod =
        staticGlobalServiceModule(addon.name) ??
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((await import(addon.globalServiceEntry)) as AddonModule)
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
    } catch (err) {
      // ponytail: this used to swallow the error silently. When run.ts handed
      // the daemon an addon's BROWSER bundle, every import here threw on an
      // unresolvable host-UI specifier and the addon simply vanished — no
      // global service, no handlers, no log line, and a deck button that did
      // nothing when tapped. Whatever the cause, say so.
      logger.error(
        { addonName: addon.name, entry: addon.globalServiceEntry, err },
        "addon global service failed to load",
      )
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
          pubSub.publish("runtime:invalidate", undefined)
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
      notify: methods.notify,
      ...(requestDeckRebuild !== undefined ? { requestDeckRebuild } : {}),
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

    // ponytail: `subscriptions` has been part of the addon API since it was
    // written (api.ts documents them as "push-based sources — file watchers,
    // sockets") but nothing ever invoked them. coding-agents declares one, and
    // its ClaudeCodeProvider fills its agent map ONLY inside subscribe() — so
    // the provider reported zero Claude Code sessions forever, on a machine
    // with eight of them open. Pollers were wired; subscriptions never were.
    for (const subscription of globalService.subscriptions ?? []) {
      try {
        const handle = subscription.subscribe(ctx)
        trackedCleanup.push(() => {
          try {
            handle.unsubscribe()
          } catch (err) {
            logger.error(
              { addonName, channel: subscription.channel, err },
              `addon subscription unsubscribe failed`,
            )
          }
        })
      } catch (err) {
        logger.error(
          { addonName, channel: subscription.channel, err },
          `addon subscription failed to start`,
        )
      }
    }
  }

  const deckButtonCleanup = new Map<
    string,
    Array<{
      handlerId: string
      buttonAbort: AbortController
      buttonService: AddonButtonService
      wrappedCtx: AddonButtonServiceContext<unknown>
    }>
  >()
  const mountedButtonSignatures = new Map<string, string>()

  const mountButtons = async (
    nextDecks: ReadonlyArray<RuntimeDeck>,
  ): Promise<void> => {
    for (const deck of nextDecks) {
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
          if (
            typeof addon.defaultButton === "string" &&
            addon.name === buttonType
          ) {
            addonName = addon.name
            resolvedButtonType = addon.defaultButton
            break
          }
        }

        if (addonName === null || resolvedButtonType === null) continue
        const handlerId = `${deck.id}:${button.id}`
        const signature = JSON.stringify([
          button.type,
          button.config ?? null,
          button.position ?? null,
        ])
        if (mountedButtonSignatures.get(handlerId) === signature) continue

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
            addonMod =
              staticAddonModule(addon.name) ??
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ((await import(addon.frontendEntry)) as AddonModule)
          } catch (err) {
            // ponytail: silence here meant a failed import surfaced only as a
            // button that ignored taps. See the matching catch above.
            logger.error(
              { addonName, entry: addon.frontendEntry, err },
              "addon button handlers failed to load",
            )
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
            {
              readonly service?: AddonButtonTypeService & AddonButtonService
            }
          >
        }

        const buttonTypeEntry = manifest.buttonTypes?.[resolvedButtonType]
        if (buttonTypeEntry?.service === undefined) continue

        const buttonService = buttonTypeEntry.service
        const buttonCtx: AddonButtonServiceContext<unknown> = {
          config: button.config ?? {},
          buttonId: button.id,
          ...(button.position !== undefined
            ? { position: button.position }
            : {}),
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
        existing.push({ handlerId, buttonAbort, buttonService, wrappedCtx })
        deckButtonCleanup.set(deck.id, existing)

        try {
          buttonService.onMount?.(wrappedCtx)
        } catch (err) {
          logger.error({ addonName, buttonType, err }, `addon onMount threw`)
        }

        const allowedGestures = buttonService.gestureHandlers
        const handler = {
          ...(allowedGestures?.includes("tap") && buttonService.onTap
            ? {
                async onTap() {
                  try {
                    await buttonService.onTap?.(wrappedCtx)
                  } catch (err) {
                    logger.error(
                      { addonName, buttonType: resolvedButtonType, err },
                      `addon onTap failed`,
                    )
                  }
                },
              }
            : {}),
          ...(allowedGestures?.includes("dbl-tap") && buttonService.onDblTap
            ? {
                async onDblTap() {
                  try {
                    await buttonService.onDblTap?.(wrappedCtx)
                  } catch (err) {
                    logger.error(
                      { addonName, buttonType: resolvedButtonType, err },
                      `addon onDblTap failed`,
                    )
                  }
                },
              }
            : {}),
          ...(allowedGestures?.includes("hold") && buttonService.onHold
            ? {
                async onHold() {
                  try {
                    await buttonService.onHold?.(wrappedCtx)
                  } catch (err) {
                    logger.error(
                      { addonName, buttonType: resolvedButtonType, err },
                      `addon onHold failed`,
                    )
                  }
                },
              }
            : {}),
          dispose() {
            buttonAbort.abort()
            try {
              buttonService.dispose?.(wrappedCtx)
            } catch (err) {
              logger.error(
                { addonName, buttonType, err },
                `addon dispose failed`,
              )
            }
          },
        }

        runtime.registerButtonHandler(handlerId, handler)
        registeredHandlerIds.add(handlerId)
        mountedButtonSignatures.set(handlerId, signature)
      }
    }
  }

  await mountButtons(decks)

  const unmountHandler = (handlerId: string): void => {
    runtime.unregisterButtonHandler(handlerId)
    registeredHandlerIds.delete(handlerId)
    mountedButtonSignatures.delete(handlerId)
    for (const [deckId, tracked] of deckButtonCleanup) {
      const remaining = []
      for (const entry of tracked) {
        if (entry.handlerId !== handlerId) {
          remaining.push(entry)
          continue
        }
        try {
          entry.buttonService.onUnmount?.(entry.wrappedCtx)
        } catch (err) {
          logger.error({ err }, "bridge onUnmount failed")
        }
        entry.buttonAbort.abort()
      }
      if (remaining.length === 0) deckButtonCleanup.delete(deckId)
      else deckButtonCleanup.set(deckId, remaining)
    }
  }

  const unmountButtons = (): void => {
    for (const handlerId of [...registeredHandlerIds]) unmountHandler(handlerId)
    deckButtonCleanup.clear()
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
          notify: methods.notify,
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
    unmountButtons()
    for (const [addonName, globalService] of addonGlobalServices) {
      try {
        const ctx: AddonServiceContext = {
          publish: () => {},
          poll: async () => {},
          signal: abortController.signal,
          executor,
          notify: methods.notify,
        }
        globalService.onUnload?.(ctx)
      } catch (err) {
        logger.error({ addonName, err }, `addon onUnload failed`)
      }
    }
    abortController.abort()
  }

  return {
    reconcile: async (nextDecks) => {
      const nextSignatures = new Map<string, string>()
      for (const deck of nextDecks) {
        for (const button of deck.buttons) {
          nextSignatures.set(
            `${deck.id}:${button.id}`,
            JSON.stringify([
              button.type,
              button.config ?? null,
              button.position ?? null,
            ]),
          )
        }
      }
      for (const [handlerId, signature] of mountedButtonSignatures) {
        if (nextSignatures.get(handlerId) !== signature)
          unmountHandler(handlerId)
      }
      await mountButtons(nextDecks)
    },
    dispose,
  }
}
