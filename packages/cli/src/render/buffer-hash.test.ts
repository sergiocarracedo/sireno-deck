import { describe, expect, it } from "vitest";

import { BufferChangeTracker, hashBuffer } from "./buffer-hash.ts";

const buf = (s: string) => Buffer.from(s);

describe("hashBuffer", () => {
  it("returns 16-char hex for same input (deterministic)", () => {
    const a = hashBuffer(buf("hello"));
    const b = hashBuffer(buf("hello"));
    expect(a).toBe(b);
    expect(a).toHaveLength(16);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
  });

  it("different inputs produce different hashes", () => {
    expect(hashBuffer(buf("hello"))).not.toBe(hashBuffer(buf("world")));
  });

  it("empty buffer hash is a valid string", () => {
    const h = hashBuffer(buf(""));
    expect(h).toHaveLength(16);
    expect(h).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe("BufferChangeTracker", () => {
  it("returns true on first call for a key", () => {
    const t = new BufferChangeTracker();
    expect(t.update(0, buf("a"))).toBe(true);
  });

  it("returns false on second call with same buffer; true with different buffer", () => {
    const t = new BufferChangeTracker();
    expect(t.update(1, buf("x"))).toBe(true);
    expect(t.update(1, buf("x"))).toBe(false);
    expect(t.update(1, buf("y"))).toBe(true);
    expect(t.update(1, buf("y"))).toBe(false);
  });
});
