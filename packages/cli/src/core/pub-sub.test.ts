import { describe, expect, it, vi } from "vitest";

import { createPubSub } from "./pub-sub.ts";

describe("createPubSub", () => {
  it("subscribes and publishes", () => {
    const pubSub = createPubSub();
    const cb = vi.fn();
    pubSub.subscribe<number>("a", cb);
    pubSub.publish("a", 42);
    expect(cb).toHaveBeenCalledWith(42);
    pubSub.dispose();
  });

  it("notifies all subscribers of the same channel", () => {
    const pubSub = createPubSub();
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    pubSub.subscribe<number>("a", cb1);
    pubSub.subscribe<number>("a", cb2);
    pubSub.publish("a", 7);
    expect(cb1).toHaveBeenCalledWith(7);
    expect(cb2).toHaveBeenCalledWith(7);
    pubSub.dispose();
  });

  it("last() returns the most recent payload", () => {
    const pubSub = createPubSub();
    pubSub.publish("a", 1);
    pubSub.publish("a", 2);
    pubSub.publish("a", 3);
    expect(pubSub.last<number>("a")).toBe(3);
    expect(pubSub.last<number>("missing")).toBeUndefined();
    pubSub.dispose();
  });

  it("snapshot() returns all channel payloads as a frozen map", () => {
    const pubSub = createPubSub();
    pubSub.publish("a", 1);
    pubSub.publish("b", "hello");
    const snap = pubSub.snapshot();
    expect(snap).toEqual({ a: 1, b: "hello" });
    expect(Object.isFrozen(snap)).toBe(true);
    pubSub.dispose();
  });

  it("flush callback fires once within debounce window", async () => {
    const pubSub = createPubSub({ debounceMs: 30 });
    const cb = vi.fn();
    pubSub.setFlushCallback(cb);
    pubSub.publish("a", 1);
    pubSub.publish("a", 2);
    pubSub.publish("a", 3);
    expect(cb).not.toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 50));
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith({ a: 3 });
    pubSub.dispose();
  });

  it("manual flush() invokes callback immediately", () => {
    const pubSub = createPubSub({ debounceMs: 1000 });
    const cb = vi.fn();
    pubSub.setFlushCallback(cb);
    pubSub.publish("a", 1);
    pubSub.flush();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith({ a: 1 });
    pubSub.dispose();
  });

  it("dispose() clears timer, subscribers, payloads, callback", async () => {
    const pubSub = createPubSub({ debounceMs: 20 });
    const cb = vi.fn();
    pubSub.setFlushCallback(cb);
    pubSub.subscribe("a", () => {});
    pubSub.publish("a", 1);
    pubSub.dispose();
    expect(pubSub.snapshot()).toEqual({});
    await new Promise((r) => setTimeout(r, 40));
    expect(cb).not.toHaveBeenCalled();
  });
});
