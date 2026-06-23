export type Payload = unknown;

export type Unsubscribe = () => void;

export type FlushCallback = (snapshot: Readonly<Record<string, Payload>>) => void;

export interface PubSub {
  publish<T extends Payload>(channel: string, payload: T): void;
  subscribe<T extends Payload>(channel: string, cb: (payload: T) => void): Unsubscribe;
  last<T extends Payload>(channel: string): T | undefined;
  snapshot(): Readonly<Record<string, Payload>>;
  setFlushCallback(cb: FlushCallback | null): void;
  flush(): void;
  dispose(): void;
}

const DEFAULT_DEBOUNCE_MS = 100;

export interface CreatePubSubOptions {
  debounceMs?: number;
}

export const createPubSub = (options: CreatePubSubOptions = {}): PubSub => {
  const { debounceMs = DEFAULT_DEBOUNCE_MS } = options;

  const lastPayloads = new Map<string, Payload>();
  const subscribers = new Map<string, Set<(payload: Payload) => void>>();
  let flushCallback: FlushCallback | null = null;
  let timer: NodeJS.Timeout | null = null;
  let disposed = false;

  const ensureNotDisposed = (): void => {
    if (disposed) throw new Error("PubSub: cannot use after dispose()");
  };

  const scheduleFlush = (): void => {
    if (timer !== null) return;
    timer = setTimeout(() => {
      timer = null;
      pubSub.flush();
    }, debounceMs);
  };

  const flush = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    const result: Record<string, Payload> = {};
    for (const [key, value] of lastPayloads) result[key] = value;
    const snapshot = Object.freeze(result);
    if (flushCallback !== null) flushCallback(snapshot);
  };

  const publish = <T extends Payload>(channel: string, payload: T): void => {
    ensureNotDisposed();
    lastPayloads.set(channel, payload);
    const set = subscribers.get(channel);
    if (set !== undefined) {
      for (const cb of set) cb(payload);
    }
    scheduleFlush();
  };

  const subscribe = <T extends Payload>(channel: string, cb: (payload: T) => void): Unsubscribe => {
    ensureNotDisposed();
    let set = subscribers.get(channel);
    if (set === undefined) {
      set = new Set();
      subscribers.set(channel, set);
    }
    set.add(cb as (payload: Payload) => void);
    return () => {
      const current = subscribers.get(channel);
      if (current === undefined) return;
      current.delete(cb as (payload: Payload) => void);
      if (current.size === 0) subscribers.delete(channel);
    };
  };

  const last = <T extends Payload>(channel: string): T | undefined => {
    return lastPayloads.get(channel) as T | undefined;
  };

  const snapshot = (): Readonly<Record<string, Payload>> => {
    const result: Record<string, Payload> = {};
    for (const [key, value] of lastPayloads) result[key] = value;
    return Object.freeze(result);
  };

  const setFlushCallback = (cb: FlushCallback | null): void => {
    flushCallback = cb;
  };

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    subscribers.clear();
    lastPayloads.clear();
    flushCallback = null;
  };

  const pubSub: PubSub = {
    publish,
    subscribe,
    last,
    snapshot,
    setFlushCallback,
    flush,
    dispose,
  };

  return pubSub;
};
