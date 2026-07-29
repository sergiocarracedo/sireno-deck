import type { AddonServiceContext, AddonGlobalService } from "@/addon/api"

import {
  TOGGLE_DEFAULT_INTERVAL_MS,
  TOGGLE_DEFAULT_TIMEOUT_MS,
  type StatusToggleConfig,
} from "./config"

export const TOGGLE_STATES_CHANNEL = "core:toggle:states"
export const TOGGLE_POLL_TICK_MS = 1000

export interface ToggleState {
  readonly raw: string
  readonly state: string | undefined
  readonly error?: string
  readonly at: number
}

export interface ToggleStatesPayload {
  readonly byButton: Readonly<Record<string, ToggleState | null>>
}

interface ButtonEntry {
  readonly config: StatusToggleConfig
  lastRaw: string | undefined
  lastState: string | undefined
  lastError: string | undefined
  lastAt: number
  lastPolledAt: number
}

const registry = new Map<string, ButtonEntry>()
let ctxRef: AddonServiceContext | undefined

const trim = (value: string): string => value.replace(/\s+$/, "").trim()

const pollButton = async (
  entry: ButtonEntry,
  ctx: AddonServiceContext,
): Promise<ToggleState> => {
  // ponytail: defaults are merged here so the global poller can use the
  // per-button override without the schema forcing an `.default()` (which
  // would erase the override path inside the union).
  const timeoutMs = entry.config.timeoutMs ?? TOGGLE_DEFAULT_TIMEOUT_MS
  try {
    const res = await ctx.executor.run(entry.config.statusCommand, {
      timeoutMs,
    } as Parameters<typeof ctx.executor.run>[1])
    const raw = trim(res.stdout ?? "")
    const matchedState =
      raw.length > 0 && entry.config.states[raw] !== undefined ? raw : undefined
    return {
      raw,
      state: matchedState,
      at: Date.now(),
    }
  } catch (err) {
    return {
      raw: "",
      state: undefined,
      error: err instanceof Error ? err.message : String(err),
      at: Date.now(),
    }
  }
}

export const globalService: AddonGlobalService = {
  methods: {
    register: (buttonId: unknown, config: unknown): void => {
      const id = String(buttonId)
      const cfg = config as StatusToggleConfig
      const existing = registry.get(id)
      registry.set(id, {
        config: cfg,
        lastRaw: existing?.lastRaw,
        lastState: existing?.lastState,
        lastError: existing?.lastError,
        lastAt: existing?.lastAt ?? 0,
        lastPolledAt: existing?.lastPolledAt ?? 0,
      })
      void ctxRef?.poll("states")
    },
    unregister: (buttonId: unknown): void => {
      registry.delete(String(buttonId))
    },
    // ponytail: tap side-channel. The per-button `onTap` calls this so the
    // next poll happens before the global tick interval — keeps the deck in
    // sync with the new state immediately after a user action.
    // When buttonId is provided, resets that specific entry's lastPolledAt so
    // the next global tick forces a fresh statusCommand run.
    republish: (buttonId?: unknown): void => {
      if (buttonId !== undefined) {
        const entry = registry.get(String(buttonId))
        if (entry !== undefined) {
          entry.lastPolledAt = 0
        }
      }
      void ctxRef?.poll("states")
    },
    // ponytail: used by the per-button tap to look up the matched state's
    // `onTap` command without round-tripping through the registry copy. The
    // poller keeps `lastState` fresh, so a stale read only happens on the
    // first tap before the first poll completes.
    lookup: (buttonId: unknown): ToggleState | null => {
      const entry = registry.get(String(buttonId))
      if (entry === undefined) return null
      if (entry.lastAt === 0) return null
      const out: ToggleState = {
        raw: entry.lastRaw ?? "",
        state: entry.lastState,
        at: entry.lastAt,
      }
      return entry.lastError !== undefined
        ? { ...out, error: entry.lastError }
        : out
    },
  },
  pollers: [
    {
      id: "states",
      channel: TOGGLE_STATES_CHANNEL,
      // ponytail: the global tick is bounded at 1s. Per-button cadence lives
      // in `intervalMs` and is honored by `lastPolledAt`. Adding a longer
      // global tick would just slow the first poll.
      intervalMs: TOGGLE_POLL_TICK_MS,
      poll: async (ctx: AddonServiceContext): Promise<ToggleStatesPayload> => {
        const byButton: Record<string, ToggleState | null> = {}
        if (registry.size === 0) return { byButton }
        const now = Date.now()
        await Promise.all(
          [...registry.entries()].map(async ([buttonId, entry]) => {
            const intervalMs =
              entry.config.intervalMs ?? TOGGLE_DEFAULT_INTERVAL_MS
            const due =
              entry.lastPolledAt === 0 || now - entry.lastPolledAt >= intervalMs
            if (!due) {
              byButton[buttonId] =
                entry.lastAt === 0
                  ? null
                  : entry.lastError !== undefined
                    ? {
                        raw: entry.lastRaw ?? "",
                        state: entry.lastState,
                        error: entry.lastError,
                        at: entry.lastAt,
                      }
                    : {
                        raw: entry.lastRaw ?? "",
                        state: entry.lastState,
                        at: entry.lastAt,
                      }
              return
            }
            const next = await pollButton(entry, ctx)
            entry.lastPolledAt = now
            entry.lastAt = next.at
            entry.lastRaw = next.raw
            entry.lastState = next.state
            entry.lastError = next.error
            byButton[buttonId] = next
          }),
        )
        return { byButton }
      },
    },
  ],
  onLoad: (ctx: AddonServiceContext) => {
    ctxRef = ctx
  },
  onUnload: () => {
    ctxRef = undefined
    registry.clear()
  },
}
