import { describe, expect, it } from "vitest";

import { computeProgress, formatTime } from "../progress";

describe("formatTime", () => {
  it("formats seconds under a minute", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(7)).toBe("0:07");
    expect(formatTime(45)).toBe("0:45");
  });

  it("formats minutes and seconds", () => {
    expect(formatTime(60)).toBe("1:00");
    expect(formatTime(83)).toBe("1:23");
    expect(formatTime(225)).toBe("3:45");
  });

  it("returns 0:00 for negative or non-finite input", () => {
    expect(formatTime(-1)).toBe("0:00");
    expect(formatTime(Number.NaN)).toBe("0:00");
    expect(formatTime(Number.POSITIVE_INFINITY)).toBe("0:00");
  });
});

describe("computeProgress", () => {
  it("returns the percentage when totalTime is positive", () => {
    expect(computeProgress(0, 200)).toBe(0);
    expect(computeProgress(83, 200)).toBe(41.5);
    expect(computeProgress(100, 100)).toBe(100);
  });

  it("clamps to 0-100", () => {
    expect(computeProgress(250, 100)).toBe(100);
    expect(computeProgress(-5, 100)).toBe(0);
  });

  it("returns 0 when totalTime is zero or invalid", () => {
    expect(computeProgress(50, 0)).toBe(0);
    expect(computeProgress(50, -1)).toBe(0);
    expect(computeProgress(50, Number.NaN)).toBe(0);
  });
});
