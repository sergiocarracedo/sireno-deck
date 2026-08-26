import type { AgentStatus } from "./state.js"

interface NotifierHooks {
  readonly notify: (args: {
    title: string
    body: string
    sound?: boolean
  }) => Promise<void> | void
  readonly now: () => number
}

export class NotificationThrottle {
  readonly #hooks: NotifierHooks
  readonly #last: Map<string, AgentStatus> = new Map<string, AgentStatus>()

  constructor(hooks: Partial<NotifierHooks> = {}) {
    this.#hooks = {
      now: hooks.now ?? (() => Date.now()),
      notify:
        hooks.notify ??
        (() => {
          // ponytail: no-op fallback so tests / null-provider mode don't crash.
        }),
    }
  }

  // ponytail: keys on (providerId, sessionId, status) so the same agent
  // transitioning into the same status twice doesn't re-fire — but a
  // different status for the same agent always notifies.
  evaluate(input: {
    providerId: string
    sessionId: string
    status: AgentStatus
    title: string
    body: string
    sound?: boolean
    attentionOnly?: boolean
  }): boolean {
    const { providerId, sessionId, status, title, body, sound } = input
    if (input.attentionOnly !== false) {
      if (status !== "waiting_for_human" && status !== "error") return false
    }
    const key = `${providerId}:${sessionId}`
    const last = this.#last.get(key)
    if (last === status) return false
    this.#last.set(key, status)
    void this.#hooks.notify({ title, body, sound })
    return true
  }

  forget(providerId: string, sessionId: string): void {
    this.#last.delete(`${providerId}:${sessionId}`)
  }

  reset(): void {
    this.#last.clear()
  }
}
