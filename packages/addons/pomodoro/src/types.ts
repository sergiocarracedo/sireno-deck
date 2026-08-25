export type AddonGeneratedDeck = {
  name?: string
  icon?: string
  background?: string
  buttonColor?:
    | "blue"
    | "green"
    | "purple"
    | "cyan"
    | "magenta"
    | "amber"
    | "lime"
  buttons?: unknown[]
  paginated?: boolean
  autoShow?: boolean
  isOverlay?: boolean
}

export type AddonDeckEntry = AddonGeneratedDeck & {
  id: string
}

export interface AddonButtonTypeDef {
  readonly frontend: unknown
  readonly service?: unknown
}

export interface AddonGlobalServiceShape {
  readonly pollers?: ReadonlyArray<{
    readonly id: string
    readonly channel: string
    readonly intervalMs: number
    readonly poll: (ctx?: unknown) => unknown
  }>
  readonly methods?: Readonly<Record<string, (...args: unknown[]) => unknown>>
  readonly onLoad?: (ctx: unknown) => void | Promise<void>
  readonly onUnload?: (ctx?: unknown) => void | Promise<void>
}

export interface AddonManifestV1 {
  readonly apiVersion: 1
  readonly name: string
  readonly buttonTypes: Readonly<Record<string, AddonButtonTypeDef>>
  readonly decks?: ReadonlyArray<AddonDeckEntry>
  readonly globalService?: AddonGlobalServiceShape
  readonly publishIntervalMs?: number
}

// ponytail: locally declared subset of the runtime Methods surface that
// addons are allowed to call via `coreMethods`. Matches what the cli
// `Methods` interface exposes (notify, runCommand, etc.) — declared as
// `unknown`-returning functions so the addon can call any of them without
// pulling in the runtime's TS types.
export interface CoreMethods {
  notify(args: { title: string; body: string; sound?: boolean }): Promise<void>
  runCommand(
    command: string,
    options?: { timeoutMs?: number },
  ): Promise<unknown>
  adjustBrightness(args: { direction: "up" | "down" }): void
}
