// ponytail: see packages/addons/app-shortcuts/src/index.ts for context.
import type {
  AddonGlobalPoller,
  AddonGlobalService,
  AddonGlobalSubscription,
  AddonServiceContext,
  AddonServiceMethod,
} from "../types/types.js"
import {
  agentKey,
  CHANNEL,
  EMPTY_SNAPSHOT,
  type Agent,
  type AgentsSnapshot,
  type ProviderId,
} from "../shared/state.js"
import { mergeSnapshot } from "../shared/snapshot.js"
import { NotificationThrottle } from "../shared/notifier.js"
import {
  loadProviders,
  type ProviderRegistryConfig,
} from "../providers/registry.js"

export const POLLER_INTERVAL_MS = 2000

interface GlobalState {
  providers: Map<ProviderId, import("../shared/state.js").AgentProvider>
  spawnedChild: { kill: () => Promise<void> } | null
  unsubscribers: Array<() => void>
  lastSnapshot: AgentsSnapshot
  lastSeenStatus: Map<string, import("../shared/state.js").AgentStatus>
  throttle: NotificationThrottle
  context: AddonServiceContext | null
}

const state: GlobalState = {
  providers: new Map(),
  spawnedChild: null,
  unsubscribers: [],
  lastSnapshot: EMPTY_SNAPSHOT,
  lastSeenStatus: new Map(),
  throttle: new NotificationThrottle(),
  context: null,
}

const setStateFromProviders = async (): Promise<void> => {
  const next: Record<ProviderId, Agent[]> = {
    opencode: [],
    "claude-code": [],
  }
  for (const [id, provider] of state.providers) {
    try {
      const agents = await provider.fetchSnapshot(
        state.context?.signal ?? new AbortController().signal,
      )
      next[id] = [...agents]
    } catch {
      // provider transiently unavailable; keep last-known
    }
  }
  state.lastSnapshot = mergeSnapshot(state.lastSnapshot, next)
}

const fireNotices = (snapshot: AgentsSnapshot): void => {
  for (const list of Object.values(snapshot.byProvider)) {
    for (const a of list) {
      const k = agentKey(a)
      const prev = state.lastSeenStatus.get(k)
      if (prev === a.status) continue
      state.lastSeenStatus.set(k, a.status)
      state.throttle.evaluate({
        providerId: a.providerId,
        sessionId: a.sessionId,
        status: a.status,
        title: `${a.providerId === "opencode" ? "OpenCode" : "Claude Code"}: ${humanStatus(a.status)}`,
        body: a.title,
      })
    }
  }
}

const humanStatus = (s: import("../shared/state.js").AgentStatus): string => {
  switch (s) {
    case "idle":
      return "Idle"
    case "running":
      return "Running"
    case "waiting":
      return "Waiting"
    case "waiting_for_human":
      return "Needs approval"
    case "error":
      return "Error"
    case "compacting":
      return "Compacting"
  }
}

const poller: AddonGlobalPoller = {
  id: "agents",
  channel: CHANNEL,
  intervalMs: POLLER_INTERVAL_MS,
  poll: async (ctx: AddonServiceContext) => {
    state.context = ctx
    await setStateFromProviders()
    fireNotices(state.lastSnapshot)
    ctx.publish(state.lastSnapshot)
  },
}

const subscription: AddonGlobalSubscription = {
  channel: CHANNEL,
  subscribe: (ctx: AddonServiceContext) => {
    state.context = ctx
    const unsubs: Array<() => void> = []
    for (const [id, provider] of state.providers) {
      const unsub = provider.subscribe(ctx.signal, () => {
        void (async () => {
          await setStateFromProviders()
          fireNotices(state.lastSnapshot)
          ctx.publish(state.lastSnapshot)
        })()
      })
      unsubs.push(unsub)
      // record for unbind on addon unload (provider id captured for log only)
      void id
    }
    state.unsubscribers = unsubs
    return {
      unsubscribe: () => {
        for (const u of unsubs) {
          try {
            u()
          } catch {
            // ignore — provider may have already closed
          }
        }
        state.unsubscribers = []
      },
    }
  },
}

export const globalService: AddonGlobalService = {
  pollers: [poller],
  subscriptions: [subscription],
  methods: {
    getSnapshot: (() => state.lastSnapshot) as AddonServiceMethod,
    focus: ((sessionId: unknown) => {
      // ponytail: v1 stub — OS-level window focusing is intentionally
      // out of scope (the deck can't reliably ask X11/Wayland to surface
      // a tmux pane). Wired so future versions can replace this body
      // without changing the per-button backend contract.
      void sessionId
    }) as AddonServiceMethod,
    dismissAttention: ((key: unknown) => {
      if (typeof key !== "string") return
      const [providerId, sessionId] = key.split(":")
      if (!providerId || !sessionId) return
      state.throttle.forget(providerId, sessionId)
      state.lastSeenStatus.delete(key)
    }) as AddonServiceMethod,
  },
  onLoad: async (ctx: AddonServiceContext, config?: unknown): Promise<void> => {
    state.context = ctx
    const cfg: ProviderRegistryConfig = (config as
      | ProviderRegistryConfig
      | undefined) ?? {
      opencodeUrl: "http://127.0.0.1:4096",
      spawnOpencodeIfMissing: true,
    }
    const loaded = await loadProviders(cfg, ctx.signal)
    state.providers = loaded.providers as Map<ProviderId, never>
    state.spawnedChild = loaded.spawnedChild
    await setStateFromProviders()
    ctx.publish(state.lastSnapshot)
  },
  onUnload: (): void => {
    for (const u of state.unsubscribers) {
      try {
        u()
      } catch {
        // ignore
      }
    }
    state.unsubscribers = []
    if (state.spawnedChild) {
      void state.spawnedChild.kill().catch(() => {})
      state.spawnedChild = null
    }
    state.providers.clear()
    state.lastSnapshot = EMPTY_SNAPSHOT
    state.lastSeenStatus.clear()
    state.throttle.reset()
    state.context = null
  },
}
