import { describe, expect, it } from "vitest"

import { parseMacro, resolvePlatformMacro } from "../macro-parse"

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

describe("parsePlatformMacro / resolvePlatformMacro", () => {
  it("keeps a plain macro working unchanged on every platform", () => {
    for (const platform of ["darwin", "linux", "win32"]) {
      expect(resolvePlatformMacro("ctrl+c", platform)).toBe("ctrl+c")
    }
  })

  it("applies the override for the current OS and the default elsewhere", () => {
    const macro = "[macos:cmd+c]ctrl+c"
    expect(resolvePlatformMacro(macro, "darwin")).toBe("cmd+c")
    expect(resolvePlatformMacro(macro, "linux")).toBe("ctrl+c")
    expect(resolvePlatformMacro(macro, "win32")).toBe("ctrl+c")
  })

  it("supports several overrides in one macro", () => {
    const macro = "[macos:cmd+x][linux:ctrl+shift+x]ctrl+x"
    expect(resolvePlatformMacro(macro, "darwin")).toBe("cmd+x")
    expect(resolvePlatformMacro(macro, "linux")).toBe("ctrl+shift+x")
    // windows has no override, so it takes the default
    expect(resolvePlatformMacro(macro, "win32")).toBe("ctrl+x")
  })

  it("treats a lone override as an override, not a replacement", () => {
    // From the spec: [windows:A]B means A on Windows, B on macOS and Linux.
    const macro = "[windows:MACROKEYSW]MACROKEYS2"
    expect(resolvePlatformMacro(macro, "win32")).toBe("MACROKEYSW")
    expect(resolvePlatformMacro(macro, "darwin")).toBe("MACROKEYS2")
    expect(resolvePlatformMacro(macro, "linux")).toBe("MACROKEYS2")
  })

  it("accepts the common spellings of each platform", () => {
    expect(resolvePlatformMacro("[mac:a]z", "darwin")).toBe("a")
    expect(resolvePlatformMacro("[osx:a]z", "darwin")).toBe("a")
    expect(resolvePlatformMacro("[darwin:a]z", "darwin")).toBe("a")
    expect(resolvePlatformMacro("[MacOS:a]z", "darwin")).toBe("a")
    expect(resolvePlatformMacro("[win:a]z", "win32")).toBe("a")
    expect(resolvePlatformMacro("[windows:a]z", "win32")).toBe("a")
  })

  it("requires a default", () => {
    expect(() => resolvePlatformMacro("[macos:cmd+c]", "darwin")).toThrow(
      /default is required/,
    )
  })

  it("rejects an unterminated or empty override", () => {
    expect(() => resolvePlatformMacro("[macos:cmd+c", "darwin")).toThrow(
      /unterminated/,
    )
    expect(() => resolvePlatformMacro("[macos:]ctrl+c", "darwin")).toThrow(
      /empty/,
    )
  })

  it("rejects a duplicate override for the same OS", () => {
    expect(() =>
      resolvePlatformMacro("[macos:cmd+c][mac:cmd+v]ctrl+c", "darwin"),
    ).toThrow(/duplicate/)
  })

  it("leaves a ']' in the default alone", () => {
    // Bracket parsing only runs while the string starts with '[', so a macro
    // containing ']' is never misread.
    expect(resolvePlatformMacro("ctrl+]", "linux")).toBe("ctrl+]")
    expect(
      resolvePlatformMacro("[macos:cmd+bracketright]ctrl+]", "darwin"),
    ).toBe("cmd+bracketright")
    expect(
      resolvePlatformMacro("[macos:cmd+bracketright]ctrl+]", "linux"),
    ).toBe("ctrl+]")
  })

  it("does not treat an unknown bracket prefix as an override", () => {
    expect(resolvePlatformMacro("[notanos:x]ctrl+c", "linux")).toBe(
      "[notanos:x]ctrl+c",
    )
  })

  it("preserves multi-step macros on both sides", () => {
    const macro = "[macos:cmd+k;cmd+w]ctrl+k;ctrl+w"
    expect(resolvePlatformMacro(macro, "darwin")).toBe("cmd+k;cmd+w")
    expect(resolvePlatformMacro(macro, "linux")).toBe("ctrl+k;ctrl+w")
  })
})
