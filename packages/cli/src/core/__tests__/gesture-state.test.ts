import { describe, expect, it } from "vitest";

import { DOUBLE_TAP_DELAY_MS, HOLD_ACTION_DELAY_MS, nextGesture } from "../gesture-state";

const down = (timestamp: number, keyIndex?: number) => ({
  type: "down" as const,
  timestamp,
  keyIndex,
});
const up = (timestamp: number, keyIndex?: number) => ({ type: "up" as const, timestamp, keyIndex });

describe("nextGesture", () => {
  it("empty events returns null", () => {
    expect(nextGesture([])).toBeNull();
  });

  it("single down only returns null", () => {
    expect(nextGesture([down(0)])).toBeNull();
  });

  it("single up only returns null", () => {
    expect(nextGesture([up(0)])).toBeNull();
  });

  it("down-up within DOUBLE_TAP_DELAY_MS is a tap", () => {
    const result = nextGesture([down(0), up(50)]);
    expect(result?.kind).toBe("tap");
    expect(result?.durationMs).toBe(50);
    expect(result?.timestamps).toEqual([0, 50]);
  });

  it("down-up after HOLD threshold is a hold", () => {
    const result = nextGesture([down(0), up(HOLD_ACTION_DELAY_MS + 100)]);
    expect(result?.kind).toBe("hold");
    expect(result?.durationMs).toBe(HOLD_ACTION_DELAY_MS + 100);
  });

  it("down-up boundary at HOLD threshold is a hold", () => {
    const result = nextGesture([down(0), up(HOLD_ACTION_DELAY_MS)]);
    expect(result?.kind).toBe("hold");
  });

  it("two taps within DOUBLE_TAP_DELAY_MS is a dbl-tap", () => {
    const result = nextGesture([
      down(0),
      up(50),
      down(DOUBLE_TAP_DELAY_MS),
      up(DOUBLE_TAP_DELAY_MS + 50),
    ]);
    expect(result?.kind).toBe("dbl-tap");
    expect(result?.timestamps).toEqual([0, 50, DOUBLE_TAP_DELAY_MS, DOUBLE_TAP_DELAY_MS + 50]);
  });

  it("two taps separated by > DOUBLE_TAP_DELAY_MS is two taps", () => {
    const first = nextGesture([down(0), up(50)]);
    expect(first?.kind).toBe("tap");
    const second = nextGesture([down(DOUBLE_TAP_DELAY_MS + 100), up(DOUBLE_TAP_DELAY_MS + 150)]);
    expect(second?.kind).toBe("tap");
  });

  it("tap gesture carries keyIndex", () => {
    const result = nextGesture([down(0, 7), up(50, 7)]);
    expect(result?.keyIndex).toBe(7);
  });

  it("hold gesture carries keyIndex and duration", () => {
    const result = nextGesture([down(100, 3), up(800, 3)]);
    expect(result?.kind).toBe("hold");
    expect(result?.keyIndex).toBe(3);
    expect(result?.durationMs).toBe(700);
  });

  it("dbl-tap carries two timestamps and total duration", () => {
    const result = nextGesture([down(0, 2), up(50, 2), down(150, 2), up(200, 2)]);
    expect(result?.kind).toBe("dbl-tap");
    expect(result?.keyIndex).toBe(2);
    expect(result?.durationMs).toBe(200);
  });
});
