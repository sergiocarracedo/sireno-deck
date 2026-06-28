import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  WS_BACKOFF_DELAYS_MS,
  WS_MAX_ATTEMPTS,
  computeNextBackoff,
  createWsClient,
  serializeHello,
} from "./bridge.ts";
import type { WebSocketLike } from "./bridge.ts";

class MockWebSocket implements WebSocketLike {
  public static instances: MockWebSocket[] = [];
  public sent: string[] = [];
  public closed = false;
  public listeners = new Map<string, Set<(event: unknown) => void>>();

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.closed = true;
    for (const cb of this.listeners.get("close") ?? []) cb({});
  }

  addEventListener(name: string, cb: (event: unknown) => void): void {
    let set = this.listeners.get(name);
    if (!set) {
      set = new Set();
      this.listeners.set(name, set);
    }
    set.add(cb);
  }

  removeEventListener(name: string, cb: (event: unknown) => void): void {
    this.listeners.get(name)?.delete(cb);
  }
}

describe("bridge (emulator)", () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("computeNextBackoff uses the schedule and caps at last", () => {
    for (let i = 0; i < WS_BACKOFF_DELAYS_MS.length; i++) {
      expect(computeNextBackoff(i)).toBe(WS_BACKOFF_DELAYS_MS[i]);
    }
    expect(computeNextBackoff(99)).toBe(WS_BACKOFF_DELAYS_MS[WS_BACKOFF_DELAYS_MS.length - 1]);
  });

  it("serializeHello includes version and token", () => {
    expect(serializeHello()).toBe('{"type":"hello","version":3}');
    expect(serializeHello("abc")).toBe('{"type":"hello","version":3,"token":"abc"}');
  });

  it("createWsClient opens one connection on construction", () => {
    const client = createWsClient({ url: "ws://x", wsFactory: (u) => new MockWebSocket(u) });
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(client.status()).toBe("connecting");
    client.close();
  });

  it("createWsClient schedules reconnect with exponential backoff after close", () => {
    const client = createWsClient({ url: "ws://x", wsFactory: (u) => new MockWebSocket(u) });
    expect(MockWebSocket.instances).toHaveLength(1);
    const first = MockWebSocket.instances[0]!;
    expect(first.listeners.get("close")?.size ?? 0).toBeGreaterThan(0);
    first.close();
    expect(MockWebSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(WS_BACKOFF_DELAYS_MS[0]! + 100);
    expect(MockWebSocket.instances.length).toBeGreaterThanOrEqual(2);
    client.close();
  });

  it("createWsClient marks failed after max attempts", () => {
    const client = createWsClient({ url: "ws://x", wsFactory: (u) => new MockWebSocket(u) });
    for (let i = 0; i < WS_MAX_ATTEMPTS; i++) {
      const idx = MockWebSocket.instances.length - 1;
      const mock = MockWebSocket.instances[idx];
      expect(mock, `instance at idx=${idx}`).toBeDefined();
      mock!.close();
      vi.advanceTimersByTime(
        WS_BACKOFF_DELAYS_MS[Math.min(i, WS_BACKOFF_DELAYS_MS.length - 1)]! + 100,
      );
    }
    expect(client.status()).toBe("failed");
    client.close();
  });
});
