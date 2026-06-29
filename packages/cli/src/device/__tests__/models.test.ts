import { describe, expect, it } from "vitest";

import {
  DEFAULT_DEVICE_MODEL_ID,
  DEFAULT_KEY_COUNT,
  DEVICE_MODELS,
  getDeviceModel,
  gridForKeyCount,
  isKnownDeviceModel,
  resolveKeyCount,
} from "../models";

describe("DEVICE_MODELS", () => {
  it("includes mk2=15, plus=32, mini=6, xl=32", () => {
    const ids = DEVICE_MODELS.map((m) => m.id);
    expect(ids).toContain("mk2");
    expect(ids).toContain("plus");
    expect(ids).toContain("mini");
    expect(ids).toContain("xl");
    const mk2 = DEVICE_MODELS.find((m) => m.id === "mk2")!;
    expect(mk2.keyCount).toBe(15);
    expect(mk2.columns).toBe(5);
    expect(mk2.rows).toBe(3);
  });

  it("DEFAULT_DEVICE_MODEL_ID is mk2", () => {
    expect(DEFAULT_DEVICE_MODEL_ID).toBe("mk2");
  });

  it("DEFAULT_KEY_COUNT is 15", () => {
    expect(DEFAULT_KEY_COUNT).toBe(15);
  });
});

describe("isKnownDeviceModel", () => {
  it("accepts known ids", () => {
    expect(isKnownDeviceModel("mk2")).toBe(true);
    expect(isKnownDeviceModel("plus")).toBe(true);
  });

  it("rejects unknown ids", () => {
    expect(isKnownDeviceModel("unknown")).toBe(false);
    expect(isKnownDeviceModel("")).toBe(false);
  });
});

describe("getDeviceModel", () => {
  it("returns spec for known id", () => {
    const spec = getDeviceModel("mk2");
    expect(spec.keyCount).toBe(15);
  });

  it("throws for unknown id", () => {
    expect(() => getDeviceModel("nope")).toThrow(/Unknown device model/);
  });
});

describe("resolveKeyCount", () => {
  it("returns keyCount for known model id", () => {
    expect(resolveKeyCount("mk2")).toBe(15);
    expect(resolveKeyCount("plus")).toBe(32);
    expect(resolveKeyCount("mini")).toBe(6);
  });

  it("returns default for undefined", () => {
    expect(resolveKeyCount(undefined)).toBe(DEFAULT_KEY_COUNT);
  });

  it("throws for unknown model id", () => {
    expect(() => resolveKeyCount("unknown")).toThrow(/Unknown device model/);
  });
});

describe("gridForKeyCount", () => {
  it("returns canonical grids for known keyCounts", () => {
    expect(gridForKeyCount(15)).toEqual({ columns: 5, rows: 3 });
    expect(gridForKeyCount(32)).toEqual({ columns: 8, rows: 4 });
    expect(gridForKeyCount(6)).toEqual({ columns: 3, rows: 2 });
    expect(gridForKeyCount(8)).toEqual({ columns: 4, rows: 2 });
    expect(gridForKeyCount(3)).toEqual({ columns: 3, rows: 1 });
    expect(gridForKeyCount(2)).toEqual({ columns: 2, rows: 1 });
    expect(gridForKeyCount(1)).toEqual({ columns: 1, rows: 1 });
  });

  it("computes grid for arbitrary keyCount", () => {
    expect(gridForKeyCount(10)).toEqual({ columns: 4, rows: 3 });
  });
});
