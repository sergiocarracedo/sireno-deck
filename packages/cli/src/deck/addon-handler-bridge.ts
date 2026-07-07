import type { ActionExecutor } from "@/action/executor";
import type {
  AddonBackendContext,
  AddonBackendMethod,
  AddonButtonBackend,
  AddonButtonBackendContext,
  AddonGlobalBackend,
  AddonGlobalPoller,
} from "@/addon/api";
import type { ScannedAddon } from "@/cli/commands/addon-registry";
import type { PubSub } from "@/core/pub-sub";
import type { Store } from "@/core/store";
import type { Runtime, RuntimeDeck } from "@/deck/runtime";
import type { StatePublisher } from "@/render/state-publisher";
import type { WsBridge } from "@/render/ws-bridge";

export interface BridgeAddonBackendsParams {
  readonly runtime: Runtime;
  readonly decks: ReadonlyArray<RuntimeDeck>;
  readonly scanned: ReadonlyArray<ScannedAddon>;
  readonly executor: ActionExecutor;
  readonly pubSub: PubSub;
  readonly store: Store;
  readonly signal: AbortSignal;
  readonly statePublisher: Pick<StatePublisher, "registerChannel">;
  readonly bridge: Pick<WsBridge, "broadcast" | "registerCacheablePoller">;
  readonly setClipboardProvider: (provider: unknown) => void;
}

type AddonModule = {
  readonly default?: unknown;
  readonly manifest?: unknown;
};

const namespacedKey = (addonName: string, methodName: string): string =>
  `${addonName}:${methodName}`;

export const bridgeAddonBackends = async (
  params: BridgeAddonBackendsParams,
): Promise<void> => {
  const { runtime, decks, scanned, executor, pubSub, store, signal, statePublisher, bridge, setClipboardProvider } =
    params;

  runtime.setGestureListener((buttonId, event) => {
    bridge.broadcast({
      type: "state",
      channels: { [`runtime:gesture:${buttonId}`]: event },
    });
  });

  const abortController = new AbortController();
  signal.addEventListener("abort", () => abortController.abort());

  const addonModules = new Map<string, AddonModule>();
  const addonGlobalBackends = new Map<string, AddonGlobalBackend>();
  const addonMethods = new Map<string, Readonly<Record<string, AddonBackendMethod>>>();

  for (const addon of scanned) {
    if (addon.globalBackendEntry === null) continue;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = (await import(addon.globalBackendEntry)) as AddonModule;
      let globalBackend: AddonGlobalBackend | undefined;
      if (typeof (mod as unknown as { globalBackend?: AddonGlobalBackend }).globalBackend === "object") {
        globalBackend = (mod as unknown as { globalBackend: AddonGlobalBackend }).globalBackend;
      } else {
        const exported =
          mod.manifest ??
          (mod.default && typeof mod.default === "object" ? mod.default : null);
        if (exported === null) continue;
        const manifest = exported as { readonly name?: string; readonly globalBackend?: AddonGlobalBackend };
        globalBackend = manifest.globalBackend;
      }
      if (globalBackend === undefined) continue;

      addonModules.set(addon.name, mod);
      addonGlobalBackends.set(addon.name, globalBackend);
    } catch {
      // Skip addons whose global backend fails to load.
    }
  }

  for (const [addonName, globalBackend] of addonGlobalBackends) {
    const primaryChannel = globalBackend.pollers?.[0]?.channel;
    const pollersById = new Map<string, AddonGlobalPoller>();
    for (const poller of globalBackend.pollers ?? []) {
      pollersById.set(poller.id, poller);
    }

    const ctx: AddonBackendContext = {
      publish: (data: unknown) => {
        if (primaryChannel !== undefined) {
          bridge.broadcast({
            type: "state",
            channels: { [primaryChannel]: data },
          });
        } else {
          pubSub.publish(`addon:${addonName}`, data);
        }
      },
      poll: async (id: string) => {
        const poller = pollersById.get(id);
        if (poller === undefined) return;
        try {
          const value = await poller.poll(ctx);
          bridge.broadcast({
            type: "state",
            channels: { [poller.channel]: value },
          });
        } catch (err) {
          console.error(`[${addonName}] poll('${id}') failed:`, err);
        }
      },
      signal: abortController.signal,
      executor,
      setClipboardProvider,
    };

    if (globalBackend.pollers !== undefined) {
      for (const poller of globalBackend.pollers) {
        statePublisher.registerChannel({
          channel: poller.channel,
          addonName,
          intervalMs: poller.intervalMs,
          poll: () => poller.poll(ctx),
        });
        bridge.registerCacheablePoller(poller.channel, () => poller.poll(ctx));
      }
    }

    try {
      const result = globalBackend.onLoad?.(ctx);
      if (result instanceof Promise) {
        result.catch((err) => {
          console.error(`[${addonName}] onLoad failed:`, err);
        });
      }

      if (globalBackend.methods !== undefined) {
        addonMethods.set(addonName, globalBackend.methods);
      }
    } catch (err) {
      console.error(`[${addonName}] onLoad threw:`, err);
    }
  }

  for (const deck of decks) {
    for (const button of deck.buttons) {
      const buttonType = button.type;

      let addonName: string | null = null;
      let resolvedButtonType: string | null = null;
      for (const addon of scanned) {
        if (addon.types.includes(buttonType)) {
          addonName = addon.name;
          resolvedButtonType = buttonType;
          break;
        }
        if (addon.defaultButton !== null && addon.name === buttonType) {
          addonName = addon.name;
          resolvedButtonType = addon.defaultButton;
          break;
        }
      }

      if (addonName === null || resolvedButtonType === null) continue;

      const globalMethods = addonMethods.get(addonName) ?? {};
      const buttonMethods: Record<string, AddonBackendMethod> = {};
      for (const [methodName, method] of Object.entries(globalMethods)) {
        buttonMethods[namespacedKey(addonName, methodName)] = method;
      }

      let addonMod: AddonModule | null = null;
      for (const addon of scanned) {
        if (addon.name !== addonName) continue;
        if (addon.frontendEntry === null) continue;
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          addonMod = (await import(addon.frontendEntry)) as AddonModule;
        } catch {
          // Skip.
        }
        break;
      }

      const exported = addonMod
        ? addonMod.manifest ??
          (addonMod.default && typeof addonMod.default === "object"
            ? addonMod.default
            : null)
        : null;

      if (exported === null) continue;

      const manifest = exported as {
        readonly name?: string;
        readonly buttonTypes?: Record<string, { readonly backend?: AddonButtonBackend }>;
      };

      const buttonTypeEntry = manifest.buttonTypes?.[resolvedButtonType];
      if (buttonTypeEntry?.backend === undefined) continue;

      const buttonBackend = buttonTypeEntry.backend;
      const buttonCtx: AddonButtonBackendContext<unknown> = {
        config: button.config ?? {},
        buttonId: button.id,
        addonName,
        methods: Object.freeze(buttonMethods),
        publish: (channel: string, data: unknown) => pubSub.publish(channel, data),
        executor,
        signal: abortController.signal,
        store,
      };

      const buttonAbort = new AbortController();
      abortController.signal.addEventListener("abort", () => buttonAbort.abort());

      const wrappedCtx = {
        ...buttonCtx,
        signal: buttonAbort.signal,
      };

      try {
        buttonBackend.onMount?.(wrappedCtx);
      } catch (err) {
        console.error(`[${addonName}] ${buttonType} onMount threw:`, err);
      }

      const handler = {
        async onTap(ctx: { buttonId: string; config: unknown; gesture: string }) {
          console.log(`[handler] ${addonName}:${resolvedButtonType} onTap called, buttonBackend.onTap=`, typeof buttonBackend.onTap);
          try {
            await buttonBackend.onTap?.(wrappedCtx);
          } catch (err) {
            console.error(`[${addonName}] ${resolvedButtonType} onTap failed:`, err);
          }
        },
        async onDblTap(ctx: { buttonId: string; config: unknown; gesture: string }) {
          try {
            await buttonBackend.onDblTap?.(wrappedCtx);
          } catch (err) {
            console.error(`[${addonName}] ${resolvedButtonType} onDblTap failed:`, err);
          }
        },
        async onHold(ctx: { buttonId: string; config: unknown; gesture: string }) {
          try {
            await buttonBackend.onHold?.(wrappedCtx);
          } catch (err) {
            console.error(`[${addonName}] ${resolvedButtonType} onHold failed:`, err);
          }
        },
        dispose() {
          buttonAbort.abort();
          try {
            buttonBackend.dispose?.(wrappedCtx);
          } catch (err) {
            console.error(`[${addonName}] ${buttonType} dispose failed:`, err);
          }
        },
      };

      runtime.registerButtonHandler(`${deck.id}:${button.id}`, handler);
    }
  }

  abortController.signal.addEventListener("abort", () => {
    for (const [addonName, globalBackend] of addonGlobalBackends) {
      try {
        const ctx: AddonBackendContext = {
          publish: () => {},
          poll: async () => {},
          signal: abortController.signal,
          executor,
          setClipboardProvider,
        };
        globalBackend.onUnload?.(ctx);
      } catch (err) {
        console.error(`[${addonName}] onUnload failed:`, err);
      }
    }
  });
};
