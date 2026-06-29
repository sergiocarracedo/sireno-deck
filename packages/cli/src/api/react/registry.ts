import type { Unsubscribe } from "@/api/addon";

export type ChannelPayload = unknown;

type Listener = (payload: ChannelPayload) => void;

export class ChannelRegistry {
  private static _instance: ChannelRegistry | null = null;
  private readonly lastPayloads = new Map<string, ChannelPayload>();
  private readonly listeners = new Map<string, Set<Listener>>();

  static instance(): ChannelRegistry {
    if (ChannelRegistry._instance === null) {
      ChannelRegistry._instance = new ChannelRegistry();
    }
    return ChannelRegistry._instance;
  }

  static resetForTests(): void {
    ChannelRegistry._instance = null;
  }

  publish<T extends ChannelPayload>(channel: string, payload: T): void {
    this.lastPayloads.set(channel, payload);
    const set = this.listeners.get(channel);
    if (set !== undefined) for (const l of set) l(payload);
  }

  subscribe<T extends ChannelPayload>(channel: string, cb: (payload: T) => void): Unsubscribe {
    let set = this.listeners.get(channel);
    if (set === undefined) {
      set = new Set();
      this.listeners.set(channel, set);
    }
    const listener = cb as Listener;
    set.add(listener);
    return () => {
      set?.delete(listener);
    };
  }

  last<T extends ChannelPayload>(channel: string): T | undefined {
    return this.lastPayloads.get(channel) as T | undefined;
  }

  clear(): void {
    this.lastPayloads.clear();
    this.listeners.clear();
  }
}
