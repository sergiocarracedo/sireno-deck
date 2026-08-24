// ponytail: locally declared subset of the runtime AddonManifestV1 surface
// that addons are allowed to depend on. Matches the cli `addon/api.ts`
// shape — declared as `unknown`-returning functions so the addon can call
// any of them without pulling in the runtime's TS types.

// ponytail: addons use covariance over their concrete config type, but the
// registry stores them as `AddonButtonTypeDefAny<unknown>`. We mark the
// context parameter as `unknown` in the registry shape so per-button
// services with concrete config types still satisfy it. Mirrors how the
// host's `AddonButtonTypeService` is structured — see packages/cli/src/addon/api.ts.

export interface AddonButtonServiceContext<Config = unknown> {
  readonly config: Config
  readonly buttonId: string
  readonly addonName: string
  readonly position?: number
  readonly methods: Readonly<Record<string, (...args: unknown[]) => unknown>>
  readonly coreMethods: unknown
  readonly publish: (channel: string, data: unknown) => void
  readonly executor: { run: (...args: unknown[]) => Promise<unknown> }
  readonly signal: AbortSignal
  readonly store: unknown
}

export type GestureKind = "tap" | "dbl-tap" | "hold"

export interface AddonButtonTypeService<Config = unknown> {
  readonly configSchema?: unknown
  readonly defaultRenderIntervalMs?: number
  readonly internal?: boolean
  readonly full?: boolean
  readonly gestureHandlers?: ReadonlyArray<GestureKind>
  readonly onMount?: (
    ctx: AddonButtonServiceContext<Config>,
  ) => void | Promise<void>
  readonly onTap?: (
    ctx: AddonButtonServiceContext<Config>,
  ) => void | Promise<void>
  readonly onDblTap?: (
    ctx: AddonButtonServiceContext<Config>,
  ) => void | Promise<void>
  readonly onHold?: (
    ctx: AddonButtonServiceContext<Config>,
  ) => void | Promise<void>
  readonly dispose?: (
    ctx: AddonButtonServiceContext<Config>,
  ) => void | Promise<void>
}

export interface AddonFrontendButtonProps<Config = unknown> {
  readonly config: Config
  readonly state: unknown
  readonly addonName: string
  readonly buttonType: string
  readonly buttonId: string
  readonly gesture: { gesture: GestureKind; at: number } | null
}

export type AddonFrontendButton<Config> = React.ComponentType<
  AddonFrontendButtonProps<Config>
>

export interface AddonButtonTypeDefAny {
  readonly frontend: AddonFrontendButton<unknown>
  readonly service: AddonButtonTypeService<unknown>
  readonly name?: string
  readonly internal?: boolean
}

export interface AddonGeneratedDeck {
  readonly name?: string
  readonly icon?: string
  readonly background?: string
  readonly buttonColor?:
    | "blue"
    | "green"
    | "purple"
    | "cyan"
    | "magenta"
    | "amber"
    | "lime"
  readonly buttons?: ReadonlyArray<unknown>
  readonly paginated?: boolean
  readonly trigger?: unknown
  readonly autoShow?: boolean
  readonly isOverlay?: boolean
}

export interface AddonDeckEntryCtx {
  readonly config: unknown
  readonly deck: { readonly id: string }
  readonly keyCount: number
}

export type AddonDeckEntry =
  | (AddonGeneratedDeck & {
      readonly id: string
      readonly createDeck?: never
      readonly createDecks?: never
      readonly internal?: boolean
    })
  | {
      readonly id: string
      readonly createDeck: (ctx: AddonDeckEntryCtx) => AddonGeneratedDeck
      readonly createDecks?: never
      readonly internal?: boolean
    }
  | {
      readonly id?: undefined
      readonly createDeck?: never
      readonly createDecks: (
        ctx: AddonDeckEntryCtx,
      ) => Readonly<Record<string, AddonGeneratedDeck>>
      readonly internal?: boolean
    }

export type AddonServiceMethod = (
  ...args: readonly unknown[]
) => unknown | Promise<unknown>

export interface AddonGlobalPoller {
  readonly id: string
  readonly channel: string
  readonly intervalMs: number
  readonly poll: (ctx: AddonServiceContext) => unknown | Promise<unknown>
}

export interface AddonGlobalSubscription {
  readonly channel: string
  readonly subscribe: (ctx: AddonServiceContext) => {
    readonly unsubscribe: () => void
  }
}

export interface AddonServiceContext {
  publish: (data: unknown) => void
  poll: (id: string) => Promise<void>
  signal: AbortSignal
  executor: { run: (...args: unknown[]) => Promise<unknown> }
  notify: (args: {
    title: string
    body: string
    sound?: boolean
  }) => Promise<void>
}

export interface AddonGlobalService {
  readonly pollers?: ReadonlyArray<AddonGlobalPoller>
  readonly subscriptions?: ReadonlyArray<AddonGlobalSubscription>
  readonly methods?: Readonly<Record<string, AddonServiceMethod>>
  readonly onLoad?: (
    ctx: AddonServiceContext,
    config?: unknown,
  ) => void | Promise<void>
  readonly onUnload?: (ctx?: AddonServiceContext) => void | Promise<void>
}

export interface AddonCheckResult {
  readonly available: boolean
  readonly reason?: string
}

export interface AddonCheck {
  readonly name: string
  readonly check: () => Promise<AddonCheckResult>
}

export interface AddonManifestV1 {
  readonly apiVersion: 1
  readonly name: string
  readonly kind?: "runtime" | "theme"
  readonly buttonTypes: Readonly<Record<string, AddonButtonTypeDefAny>>
  readonly defaultButton?: string
  readonly decks?: ReadonlyArray<AddonDeckEntry>
  readonly frontend?: { readonly main: string; readonly styles?: string[] }
  readonly poller?: {
    readonly channels: ReadonlyArray<{
      readonly channel: string
      readonly intervalMs: number
      readonly poll: () => unknown | Promise<unknown>
    }>
  }
  readonly publishIntervalMs?: number
  readonly globalService?: AddonGlobalService
  readonly checks?: ReadonlyArray<AddonCheck>
}
