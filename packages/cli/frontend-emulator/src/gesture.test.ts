import { describe, expect, it } from "vitest";

import { dispatchMouseEvent, gestureKindToWsMessage } from "./gesture.ts";

describe("gesture (emulator)", () => {
  it("returns tap on quick down-up", () => {
    const r1 = dispatchMouseEvent([], { kind: "down", keyIndex: 0, timestamp: 0 });
    expect(r1.result).toBeNull();
    const r2 = dispatchMouseEvent(r1.buffer, { kind: "up", keyIndex: 0, timestamp: 50 });
    expect(r2.result?.kind).toBe("tap");
  });

  it("returns hold on long down-up", () => {
    const r1 = dispatchMouseEvent([], { kind: "down", keyIndex: 3, timestamp: 0 });
    const r2 = dispatchMouseEvent(r1.buffer, { kind: "up", keyIndex: 3, timestamp: 800 });
    expect(r2.result?.kind).toBe("hold");
  });

  it("returns dbl-tap on two quick sequences", () => {
    const r1 = dispatchMouseEvent([], { kind: "down", keyIndex: 1, timestamp: 0 });
    const r2 = dispatchMouseEvent(r1.buffer, { kind: "up", keyIndex: 1, timestamp: 50 });
    expect(r2.result?.kind).toBe("tap");
    const r3 = dispatchMouseEvent(r2.buffer, { kind: "down", keyIndex: 1, timestamp: 200 });
    const r4 = dispatchMouseEvent(r3.buffer, { kind: "up", keyIndex: 1, timestamp: 250 });
    expect(r4.result?.kind).toBe("dbl-tap");
  });

  it("gestureKindToWsMessage carries deckId, position, gesture", () => {
    const r1 = dispatchMouseEvent([], { kind: "down", keyIndex: 7, timestamp: 0 });
    const r2 = dispatchMouseEvent(r1.buffer, { kind: "up", keyIndex: 7, timestamp: 50 });
    const msg = gestureKindToWsMessage(r2.result!, "media");
    expect(msg).toEqual({ type: "button-action", deckId: "media", position: 7, gesture: "tap" });
  });
});
