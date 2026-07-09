import type { Unsubscribe } from "@/api/addon"

export type ChannelPayload = unknown

type Listener = (payload: ChannelPayload) => void
type AnnounceSubscribe = (channels: string[]) => void

export class ChannelRegistry {
  private static _instance: ChannelRegistry | null = null
  private static _announceSubscribe: AnnounceSubscribe | null = null
  private readonly lastPayloads = new Map<string, ChannelPayload>()
  private readonly listeners = new Map<string, Set<Listener>>()
  private readonly listenerCounts = new Map<string, number>()
  private pendingChannels: string[] = []
  private flushScheduled = false

  static instance(): ChannelRegistry {
    if (ChannelRegistry._instance === null) {
      ChannelRegistry._instance = new ChannelRegistry()
    }
    return ChannelRegistry._instance
  }

  static resetForTests(): void {
    ChannelRegistry._instance = null
    ChannelRegistry._announceSubscribe = null
  }

  static setAnnounceSubscribe(cb: AnnounceSubscribe | null): void {
    ChannelRegistry._announceSubscribe = cb
  }

  publish<T extends ChannelPayload>(channel: string, payload: T): void {
    this.lastPayloads.set(channel, payload)
    const set = this.listeners.get(channel)
    if (set !== undefined) for (const l of set) l(payload)
  }

  subscribe<T extends ChannelPayload>(
    channel: string,
    cb: (payload: T) => void,
  ): Unsubscribe {
    let set = this.listeners.get(channel)
    if (set === undefined) {
      set = new Set()
      this.listeners.set(channel, set)
    }
    const listener = cb as Listener
    set.add(listener)

    const prevCount = this.listenerCounts.get(channel) ?? 0
    this.listenerCounts.set(channel, prevCount + 1)
    if (prevCount === 0) {
      this.pendingChannels.push(channel)
      if (!this.flushScheduled) {
        this.flushScheduled = true
        queueMicrotask(() => this.flushPendingSubscriptions())
      }
    }

    return () => {
      set?.delete(listener)
      const count = this.listenerCounts.get(channel) ?? 0
      if (count <= 1) {
        this.listenerCounts.delete(channel)
      } else {
        this.listenerCounts.set(channel, count - 1)
      }
    }
  }

  private flushPendingSubscriptions(): void {
    this.flushScheduled = false
    if (this.pendingChannels.length === 0) return
    const channels = [...new Set(this.pendingChannels)]
    this.pendingChannels = []
    ChannelRegistry._announceSubscribe?.(channels)
  }

  last<T extends ChannelPayload>(channel: string): T | undefined {
    return this.lastPayloads.get(channel) as T | undefined
  }

  clear(): void {
    this.lastPayloads.clear()
    this.listeners.clear()
    this.listenerCounts.clear()
    this.pendingChannels = []
    this.flushScheduled = false
  }
}
