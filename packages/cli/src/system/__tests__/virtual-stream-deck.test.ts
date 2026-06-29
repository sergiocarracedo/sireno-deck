import { describe, expect, it, vi } from "vitest";

import { createVirtualStreamDeckLifecycle } from "../virtual-stream-deck.ts";

describe("createVirtualStreamDeckLifecycle", () => {
  it("getKeyCount returns configured count", () => {
    const v = createVirtualStreamDeckLifecycle({ keyCount: 15 });
    expect(v.getKeyCount()).toBe(15);
  });

  it("onKeyEvent receives injected events", () => {
    const v = createVirtualStreamDeckLifecycle({ keyCount: 6 });
    const handler = vi.fn();
    v.onKeyEvent(handler);
    v.injectKey("down", 0);
    v.injectKey("up", 0);
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: "down", keyIndex: 0 }),
    );
    expect(handler).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: "up", keyIndex: 0 }),
    );
  });

  it("injectKeyEvent carries a timestamp (auto)", () => {
    const v = createVirtualStreamDeckLifecycle({ keyCount: 1 });
    let received = 0;
    v.onKeyEvent((e) => {
      received = e.timestamp;
    });
    const before = Date.now();
    v.injectKey("down", 0);
    const after = Date.now();
    expect(received).toBeGreaterThanOrEqual(before);
    expect(received).toBeLessThanOrEqual(after);
  });

  it("injectKeyEvent without autoTimestamp uses 0", () => {
    const v = createVirtualStreamDeckLifecycle({ keyCount: 1, autoTimestamp: false });
    let received = -1;
    v.onKeyEvent((e) => {
      received = e.timestamp;
    });
    v.injectKey("down", 0);
    expect(received).toBe(0);
  });

  it("rejects keyIndex out of range", () => {
    const v = createVirtualStreamDeckLifecycle({ keyCount: 6 });
    expect(() => v.injectKey("down", -1)).toThrow(/out of range/);
    expect(() => v.injectKey("down", 6)).toThrow(/out of range/);
  });

  it("unsubscribe stops receiving events", () => {
    const v = createVirtualStreamDeckLifecycle({ keyCount: 2 });
    const handler = vi.fn();
    const off = v.onKeyEvent(handler);
    v.injectKey("down", 0);
    off();
    v.injectKey("down", 1);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("clear removes all handlers", () => {
    const v = createVirtualStreamDeckLifecycle({ keyCount: 2 });
    const h1 = vi.fn();
    const h2 = vi.fn();
    v.onKeyEvent(h1);
    v.onKeyEvent(h2);
    v.clear();
    v.injectKey("down", 0);
    expect(h1).not.toHaveBeenCalled();
    expect(h2).not.toHaveBeenCalled();
  });
});
