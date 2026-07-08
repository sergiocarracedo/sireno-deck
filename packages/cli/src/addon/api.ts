import type { ComponentType } from "react";

import type { z } from "zod";

import type { ActionExecutor } from "@/action/executor";
import type { Store } from "@/core/store";
import type { GestureKind } from "@/core/gesture-state";

/** The runtime manifest API version (`AddonManifestV1`). */
export const SIRENO_ADDON_API_VERSION = 1 as const;

export type AddonKind = "runtime" | "theme";
export type AddonManifestKind = "addon" | "theme";

/**
 * Per-button gesture stream delivered to addon renderers. `null` when no
 * gesture has fired since the last handoff. See `AddonFrontendButtonProps.gesture`.
 */
export interface AddonGestureEvent {
  readonly gesture: GestureKind;
  readonly at: number;
}

export interface AddonButtonTypeRenderContext {
  config: unknown;
  pressed: boolean;
  addonName: string;
  frameState: unknown;
}

export interface AddonButtonTypeActionContext {
  config: unknown;
  pressed: boolean;
  addonName: string;
  hostContext: Record<string, unknown>;
  methods: Record<string, (...args: unknown[]) => unknown>;
}

export interface AddonAssets {
  styles?: string[];
}

export interface AddonFrontend {
  main: string;
  styles?: string[];
}

export interface AddonManifest {
  apiVersion: number;
  kind?: AddonKind;
  main?: string;
  frontend?: AddonFrontend;
  css?: string;
  name?: string;
  version?: string;
  description?: string;
  publishIntervalMs?: number;
}

export interface LoadedTheme {
  name: string;
  apiVersion: number;
  source: { kind: "builtin" | "local" | "npm"; resolvedPath: string };
  manifestPath: string;
  uiOverridesPath: string | null;
  cssPath: string;
}

export interface AddonLoadIssue {
  level: "error" | "warning" | "info";
  source: string;
  message: string;
}

export interface AddonFrontendButtonProps<Config> {
  readonly config: Config;
  readonly state: unknown;
  readonly addonName: string;
  readonly buttonType: string;
  readonly buttonId: string;
  /**
   * Latest gesture delivered to this specific button since the previous
   * commit. `null` when no gesture is pending. The renderer is expected to
   * react in a `useEffect([gesture])` and the parent (Deck) will clear the
   * value in a post-commit pass so unrelated re-renders do not re-fire it.
   *
   * Source: hardware + emulator only — never emitted for frontend-emulated
   * clicks (those arrive via the WS `button-action` path which calls
   * `runtime.invokeAction`, bypassing the gesture listener).
   */
  readonly gesture: AddonGestureEvent | null;
}

export type AddonFrontendButton<Config> = ComponentType<AddonFrontendButtonProps<Config>>;

export interface AddonButtonTypeService<Config = unknown> {
  readonly configSchema?: unknown;
  readonly defaultRenderIntervalMs?: number;
  readonly internal?: boolean;
  readonly full?: boolean;
  /**
   * Opt-in gesture allowlist. If the service declares onTap/onDblTap/onHold
   * but this field is missing, the runtime logs a warning and strips the
   * undeclared handlers (default-deny). If present, only listed gestures fire.
   */
  readonly gestureHandlers?: ReadonlyArray<GestureKind>;
  readonly onMount?: (ctx: AddonButtonServiceContext<Config>) => void | Promise<void>;
  readonly onTap?: (ctx: AddonButtonServiceContext<Config>) => void | Promise<void>;
  readonly onDblTap?: (ctx: AddonButtonServiceContext<Config>) => void | Promise<void>;
  readonly onHold?: (ctx: AddonButtonServiceContext<Config>) => void | Promise<void>;
  readonly dispose?: (ctx: AddonButtonServiceContext<Config>) => void | Promise<void>;
}

export interface AddonButtonTypeDef<Config = unknown> {
  readonly frontend: AddonFrontendButton<Config>;
  readonly service: AddonButtonTypeService<Config>;
}

export interface AddonButtonTypeDefAny {
  readonly frontend: AddonFrontendButton<any>;
  readonly service: AddonButtonTypeService<any>;
}

export type AddonDeckFactory = (page: number) => AddonGeneratedDeck;

export interface AddonDeckDefinition {
  type: string;
  configSchema?: unknown;
  createDecks: (ctx: {
    config: unknown;
    deck: { id: string };
  }) => Record<string, AddonGeneratedDeck>;
  internal?: boolean;
}

export interface AddonGeneratedDeck {
  name?: string;
  icon?: string;
  background?: string;
  buttons?: unknown[];
  paginated?: boolean;
  trigger?: unknown;
  autoShow?: boolean;
}

/**
 * Runtime addon manifest. Both builtin and third-party addons export this from
 * their entry file (`index.ts` in dev, `index.js` in prod).
 *
 * The `entry` field on `AddonJsonManifest` points at the file that exports this;
 * the runtime loads it via dynamic `import()` and passes it to `AddonRegistry.load()`.
 *
 * `defaultButton` declares one of this addon's button types as the default. When
 * set, users may write `type: <addonName>` in `config.yml` as a shorthand for
 * `<defaultButton>` (e.g. `type: emoji-selector` resolves to
 * `emoji-selector:launcher`). The value must be a key of `buttonTypes`.
 */
export interface AddonManifestV1 {
  readonly apiVersion: 1;
  readonly name: string;
  readonly kind?: AddonKind;
  readonly buttonTypes: Readonly<Record<string, AddonButtonTypeDefAny>>;
  readonly defaultButton?: string;
  readonly decks?: Readonly<Record<string, AddonDeckFactory | AddonDeckDefinition>>;
  readonly frontend?: AddonFrontend;
  readonly poller?: {
    readonly channels: ReadonlyArray<{
      readonly channel: string;
      readonly intervalMs: number;
      readonly poll: () => unknown | Promise<unknown>;
    }>;
  };
  readonly publishIntervalMs?: number;
  readonly globalService?: AddonGlobalService;
}

let domAssetPathResolver: ((assetReference: string) => string | undefined) | undefined;

export function setDomAssetPathResolver(
  resolver?: (assetReference: string) => string | undefined,
): void {
  domAssetPathResolver = resolver;
}

export function resolveDomAssetSrc(src: string): string {
  if (
    src.startsWith("data:") ||
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("file://") ||
    src.startsWith("/")
  ) {
    return src;
  }

  if (/^(?:addon|builtin):\/\//.test(src)) {
    const resolvedAssetPath = domAssetPathResolver?.(src);
    if (!resolvedAssetPath) {
      return src;
    }

    if (
      /^(?:data:|https?:\/\/|file:\/\/)/.test(resolvedAssetPath) ||
      resolvedAssetPath.startsWith("/")
    ) {
      return resolvedAssetPath;
    }

    return `file://${resolvedAssetPath}`;
  }

  return src;
}

/**
 * Addon-global service. Runs for the lifetime of the addon (while the addon
 * is loaded). Multiple instances of the same button type share this state.
 *
 * - `pollers` are started when the addon activates and stopped when it
 *   deactivates; each publishes on a named channel that frontends consume
 *   via the bridge.
 * - `subscriptions` are push-based sources (file watchers, sockets); they
 *   publish on the same channels.
 * - `methods` is the namespaced API surface available to per-button
 *   services via `ctx.methods.<name>`.
 * - `onLoad`/`onUnload` are the explicit lifecycle hooks; the runtime
 *   passes an `AbortSignal` so cleanup is automatic.
 */
export interface AddonGlobalService {
  readonly pollers?: ReadonlyArray<AddonGlobalPoller>;
  readonly subscriptions?: ReadonlyArray<AddonGlobalSubscription>;
  readonly methods?: Readonly<Record<string, AddonServiceMethod>>;
  readonly onLoad?: (ctx: AddonServiceContext) => void | Promise<void>;
  readonly onUnload?: (ctx: AddonServiceContext) => void | Promise<void>;
}

export type AddonServiceMethod = (...args: readonly unknown[]) => unknown | Promise<unknown>;

export interface AddonGlobalPoller {
  readonly id: string;
  readonly channel: string;
  readonly intervalMs: number;
  readonly poll: (ctx: AddonServiceContext) => unknown | Promise<unknown>;
}

export interface AddonGlobalSubscription {
  readonly channel: string;
  readonly subscribe: (ctx: AddonServiceContext) => { unsubscribe: () => void };
}

export interface AddonServiceContext {
  /** Push data to the channel this poller/subscription is bound to. */
  publish: (data: unknown) => void;
  /**
   * Trigger the poller with the given id (within this addon) immediately and
   * broadcast its result. Useful after a `methods` call to reflect the new
   * state without waiting for the next polling tick. Unknown ids are no-ops;
   * poller errors are logged and swallowed.
   */
  poll: (id: string) => Promise<void>;
  /** Aborted when the addon unloads. */
  signal: AbortSignal;
  /** Run host commands (e.g. `brightness set 80`). */
  executor: ActionExecutor;
  /** Set the clipboard provider for pasteText method. */
  setClipboardProvider: (provider: unknown) => void;
}

/**
 * Per-button service. One instance is created per rendered button of this
 * type; the instance is disposed when the last instance unmounts.
 *
 * The runtime merges the addon-global service's `methods` into the action
 * context so per-button services can call shared APIs without importing
 * the addon's internals.
 */
export interface AddonButtonService<Config = unknown> {
  readonly onMount?: (ctx: AddonButtonServiceContext<Config>) => void | Promise<void>;
  readonly onTap?: (ctx: AddonButtonServiceContext<Config>) => void | Promise<void>;
  readonly onDblTap?: (ctx: AddonButtonServiceContext<Config>) => void | Promise<void>;
  readonly onHold?: (ctx: AddonButtonServiceContext<Config>) => void | Promise<void>;
  readonly dispose?: (ctx: AddonButtonServiceContext<Config>) => void | Promise<void>;
}

export interface AddonButtonServiceContext<Config = unknown> {
  readonly config: Config;
  readonly buttonId: string;
  readonly addonName: string;
  /** Namespaced addon-global methods (`<addonName>:<methodName>` keys). */
  readonly methods: Readonly<Record<string, AddonServiceMethod>>;
  /** Publish on a channel. */
  readonly publish: (channel: string, data: unknown) => void;
  /** Run host commands. */
  readonly executor: ActionExecutor;
  /** Aborted when the button instance unmounts. */
  readonly signal: AbortSignal;
  /**
   * Per-addon persisted state. Use `store.buttonScope(addonName, key)` to
   * scope reads/writes to this addon.
   */
  readonly store: Store;
}

/**
 * JSON metadata manifest. Both builtin and third-party addons ship this file
 * for discovery. Runtime metadata (button types, decks, etc.) lives in the
 * entry file (see `entry`) which exports an `AddonManifestV1` at runtime.
 *
 * Convention:
 * - `name`: unique addon identifier (e.g. `date-time`).
 * - `kind`: `"addon"` selects runtime registration; `"theme"` selects the theme loader.
 * - `apiVersion`: the JSON manifest schema version (currently 1).
 * - `entry`: path (relative to the JSON file) to the runtime entry that exports
 *   an `AddonManifestV1`. In dev this is `index.ts`; in prod this is `index.js`.
 *   The CLI dynamically imports it at startup.
 */
export interface AddonJsonManifest {
  readonly kind: AddonManifestKind;
  readonly apiVersion: 1;
  readonly name: string;
  readonly entry: string;
}

/** Validation schema for `AddonJsonManifest`; usable at scan time. */
export type AddonJsonManifestSchema = z.ZodType<AddonJsonManifest>;

/** The current JSON manifest schema version. */
export const SIRENO_ADDON_JSON_API_VERSION = 1 as const;
