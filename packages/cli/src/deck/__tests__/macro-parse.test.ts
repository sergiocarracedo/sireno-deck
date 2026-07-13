import { describe, expect, it } from "vitest"

import { parseMacro } from "../macro-parse"

describe("parseMacro", () => {
  it("parses a single combo", () => {
    expect(parseMacro("ctrl+c")).toEqual([{ kind: "combo", value: "ctrl+c" }])
  })

  it("parses bare key as combo", () => {
    expect(parseMacro("Enter")).toEqual([{ kind: "combo", value: "Return" }])
  })

  it("parses two combos separated by semicolon", () => {
    expect(parseMacro("ctrl+c; ctrl+v")).toEqual([
      { kind: "combo", value: "ctrl+c" },
      { kind: "combo", value: "ctrl+v" },
    ])
  })

  it("parses delay with ms suffix", () => {
    expect(parseMacro("delay(500ms)")).toEqual([{ kind: "delay", ms: 500 }])
  })

  it("parses delay with s suffix", () => {
    expect(parseMacro("delay(2s)")).toEqual([{ kind: "delay", ms: 2000 }])
  })

  it("parses delay with m suffix", () => {
    expect(parseMacro("delay(1m)")).toEqual([{ kind: "delay", ms: 60_000 }])
  })

  it("parses delay with h suffix", () => {
    expect(parseMacro("delay(1h)")).toEqual([{ kind: "delay", ms: 3_600_000 }])
  })

  it("parses mixed combos and delays", () => {
    expect(parseMacro("ctrl+t;delay(1s);ctrl+v")).toEqual([
      { kind: "combo", value: "ctrl+t" },
      { kind: "delay", ms: 1000 },
      { kind: "combo", value: "ctrl+v" },
    ])
  })

  it("parses plain text as text step", () => {
    expect(parseMacro("hello world")).toEqual([
      { kind: "text", value: "hello world" },
    ])
  })

  it("parses text after delay", () => {
    expect(parseMacro("delay(500ms); hello")).toEqual([
      { kind: "delay", ms: 500 },
      { kind: "text", value: "hello" },
    ])
  })

  it("ignores empty segments", () => {
    expect(parseMacro("ctrl+c;; delay(1s)")).toEqual([
      { kind: "combo", value: "ctrl+c" },
      { kind: "delay", ms: 1000 },
    ])
  })

  it("handles single key with modifier", () => {
    expect(parseMacro("ctrl+a")).toEqual([{ kind: "combo", value: "ctrl+a" }])
  })

  it("returns empty array for empty string", () => {
    expect(parseMacro("")).toEqual([])
  })
})
