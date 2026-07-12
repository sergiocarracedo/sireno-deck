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
import type { Runtime, RuntimeDeck } from "@/deck/runtime"
import type { StatePublisher } from "@/render/state-publisher"
import type { WsBridge } from "@/render/ws-bridge"

export interface BridgeAddonServicesParams {
  readonly runtime: Runtime
  readonly decks: ReadonlyArray<RuntimeDeck>
  readonly scanned: ReadonlyArray<ScannedAddon>
  readonly executor: ActionExecutor
  readonly pubSub: PubSub
  readonly store: Store
  readonly signal: AbortSignal
  readonly statePublisher: Pick<StatePublisher, "registerChannel">
  readonly bridge: Pick<WsBridge, "broadcast" | "registerCacheablePoller">
  readonly setClipboardProvider: (provider: unknown) => void
}

type AddonModule = {
  readonly default?: unknown
  readonly manifest?: unknown
}

const namespacedKey = (addonName: string, methodName: string): string =>
  `${addonName}:${methodName}`

export const bridgeAddonServices = async (
  params: BridgeAddonServicesParams,
): Promise<void> => {
  const {
    runtime,
    decks,
    scanned,
    executor,
    pubSub,
    store,
    signal,
    statePublisher,
    bridge,
    setClipboardProvider,
  } = params

  runtime.setGestureListener((buttonId, event) => {
    bridge.broadcast({
      type: "state",
      channels: { [`runtime:gesture:${buttonId}`]: event },
    })
  })

  const abortController = new AbortController()
  signal.addEventListener("abort", () => abortController.abort())

  const addonModules = new Map<string, AddonModule>()
  const addonGlobalServices = new Map<string, AddonGlobalService>()
  const addonMethods = new Map<
    string,
    Readonly<Record<string, AddonServiceMethod>>
  >()

  for (const addon of scanned) {
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
          console.error(`[${addonName}] poll('${id}') failed:`, err)
        }
      },
      signal: abortController.signal,
      executor,
      setClipboardProvider,
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
          console.error(`[${addonName}] onLoad failed:`, err)
        })
      }

      if (globalService.methods !== undefined) {
        addonMethods.set(addonName, globalService.methods)
      }
    } catch (err) {
      console.error(`[${addonName}] onLoad threw:`, err)
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
      for (const addon of scanned) {
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
      for (const addon of scanned) {
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
        console.error(`[${addonName}] ${buttonType} onMount threw:`, err)
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
            console.error(
              `[${addonName}] ${resolvedButtonType} onTap failed:`,
              err,
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
            console.error(
              `[${addonName}] ${resolvedButtonType} onDblTap failed:`,
              err,
            )
          }
        },
        async onHold(ctx: {
          buttonId: string
          config: unknown
          gesture: string
        }) {
          if (allowedGestures === undefined || !allowedGestures.includes("hold"))
            return
          try {
            await buttonService.onHold?.(wrappedCtx)
          } catch (err) {
            console.error(
              `[${addonName}] ${resolvedButtonType} onHold failed:`,
              err,
            )
          }
        },
        dispose() {
          buttonAbort.abort()
          try {
            buttonService.dispose?.(wrappedCtx)
          } catch (err) {
            console.error(`[${addonName}] ${buttonType} dispose failed:`, err)
          }
        },
      }

      runtime.registerButtonHandler(`${deck.id}:${button.id}`, handler)
    }
  }

  pubSub.subscribe(
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
          console.error(
            `[bridge] ${deckId} onUnmount failed:`,
            err,
          )
        }
        buttonAbort.abort()
      }
    },
  )

  abortController.signal.addEventListener("abort", () => {
    for (const [addonName, globalService] of addonGlobalServices) {
      try {
        const ctx: AddonServiceContext = {
          publish: () => {},
          poll: async () => {},
          signal: abortController.signal,
          executor,
          setClipboardProvider,
        }
        globalService.onUnload?.(ctx)
      } catch (err) {
        console.error(`[${addonName}] onUnload failed:`, err)
      }
    }
  })
}
