import { describe, expect, it } from "vitest"

import { isValidKey, knownKeys, parseCombo } from "../parser"

describe("parseCombo", () => {
  it("parses simple ctrl+t", () => {
    expect(parseCombo("ctrl+t")).toEqual({ mods: ["ctrl"], key: "t" })
  })

  it("parses multiple modifiers", () => {
    expect(parseCombo("alt+shift+F4")).toEqual({
      mods: ["alt", "shift"],
      key: "F4",
    })
  })

  it("is case-insensitive on modifiers", () => {
    expect(parseCombo("Ctrl+Tab")).toEqual({ mods: ["ctrl"], key: "Tab" })
  })

  it("parses single key (no modifiers)", () => {
    expect(parseCombo("Return")).toEqual({ mods: [], key: "Return" })
  })

  it("returns null for plain text", () => {
    expect(parseCombo("hello")).toBeNull()
  })

  it("returns null for emoji", () => {
    expect(parseCombo("😀")).toBeNull()
  })

  it("returns null when combo key is emoji", () => {
    expect(parseCombo("ctrl+😀")).toBeNull()
  })

  it("tolerates extra whitespace", () => {
    expect(parseCombo("  ctrl  +  shift  +  a  ")).toEqual({
      mods: ["ctrl", "shift"],
      key: "a",
    })
  })

  it("deduplicates repeated modifiers", () => {
    expect(parseCombo("ctrl+ctrl+t")).toEqual({ mods: ["ctrl"], key: "t" })
  })

  it("returns null for empty string", () => {
    expect(parseCombo("")).toBeNull()
  })

  it("rejects single modifier as the key (not a key)", () => {
    expect(parseCombo("ctrl")).toBeNull()
  })

  it("maps alt alias option", () => {
    expect(parseCombo("option+t")).toEqual({ mods: ["alt"], key: "t" })
  })

  it("maps command to meta", () => {
    expect(parseCombo("cmd+space")).toEqual({ mods: ["meta"], key: "space" })
  })
})

describe("isValidKey", () => {
  it("returns true for known special keys", () => {
    expect(isValidKey("Return")).toBe(true)
    expect(isValidKey("F12")).toBe(true)
    expect(isValidKey("Tab")).toBe(true)
  })

  it("returns true for alpha keys", () => {
    expect(isValidKey("a")).toBe(true)
    expect(isValidKey("Z")).toBe(false)
  })

  it("returns true for digit keys", () => {
    expect(isValidKey("0")).toBe(true)
    expect(isValidKey("9")).toBe(true)
  })

  it("returns false for unknown keys", () => {
    expect(isValidKey("FooBar")).toBe(false)
    expect(isValidKey("")).toBe(false)
  })
})

describe("knownKeys", () => {
  it("contains at least the common control keys", () => {
    for (const key of [
      "Return",
      "Tab",
      "Escape",
      "BackSpace",
      "Up",
      "Down",
      "Left",
      "Right",
    ]) {
      expect(knownKeys.has(key)).toBe(true)
    }
  })
})
