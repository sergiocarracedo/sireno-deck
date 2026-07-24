import { describe, expect, it } from "vitest"

import { compileDeckMatcher, matchesPattern } from "../glob-match"

const snap = (name: string, windowTitle: string | null = null) => ({
  name,
  windowTitle,
  processId: 1,
})

describe("matchesPattern", () => {
  it("literal substring matches case-insensitively", () => {
    expect(matchesPattern("Google Chrome", "chrome")).toBe(true)
    expect(matchesPattern("Google Chrome Helper", "chrome")).toBe(true)
    expect(matchesPattern("chrome", "chrome")).toBe(true)
  })

  it("literal substring does not match unrelated names", () => {
    expect(matchesPattern("Firefox", "chrome")).toBe(false)
  })

  it("empty pattern matches anything", () => {
    expect(matchesPattern("Anything", "")).toBe(true)
  })

  it("wildcard patterns", () => {
    expect(matchesPattern("Google Chrome Helper", "*chrome*")).toBe(true)
    expect(matchesPattern("Firefox", "*chrome*")).toBe(false)
  })

  it("alternation", () => {
    expect(matchesPattern("Spotify", "spotify|*apple music*")).toBe(true)
    expect(matchesPattern("Apple Music.app", "spotify|*apple music*")).toBe(
      true,
    )
    expect(matchesPattern("Firefox", "spotify|*apple music*")).toBe(false)
  })
})

describe("compileDeckMatcher — AND across field groups", () => {
  it("returns false for empty fields", () => {
    const matcher = compileDeckMatcher({})
    expect(matcher(snap("Anything"))).toBe(false)
  })

  it("matches on process name only", () => {
    const matcher = compileDeckMatcher({ processNames: ["chrome"] })
    expect(matcher(snap("Google Chrome"))).toBe(true)
    expect(matcher(snap("Google Chrome", "GitHub"))).toBe(true)
  })

  it("matches on window title only", () => {
    const matcher = compileDeckMatcher({ windowNames: ["GitHub"] })
    expect(matcher(snap("Google Chrome", "GitHub - Sireno"))).toBe(true)
    expect(matcher(snap("Other", "GitHub - Sireno"))).toBe(true)
  })

  it("both fields match — AND semantics", () => {
    const matcher = compileDeckMatcher({
      processNames: ["chrome"],
      windowNames: ["github"],
    })
    expect(matcher(snap("Google Chrome", "GitHub - Sireno"))).toBe(true)
    expect(matcher(snap("Google Chrome", "Random Page"))).toBe(false)
    expect(matcher(snap("Firefox", "GitHub - Sireno"))).toBe(false)
  })

  it("no match when neither field matches", () => {
    const matcher = compileDeckMatcher({
      processNames: ["chrome"],
      windowNames: ["github"],
    })
    expect(matcher(snap("Spotify", "Apple Music"))).toBe(false)
  })

  it("OR within each field group", () => {
    const matcher = compileDeckMatcher({
      processNames: ["chrome", "firefox"],
      windowNames: ["github", "gitlab"],
    })
    expect(matcher(snap("Firefox", "GitLab"))).toBe(true)
    expect(matcher(snap("Chrome", "GitLab"))).toBe(true)
    expect(matcher(snap("Chrome", "GitHub"))).toBe(true)
    expect(matcher(snap("Safari", "Bitbucket"))).toBe(false)
  })

  it("empty process group passes — only windowName matters", () => {
    const matcher = compileDeckMatcher({ windowNames: ["github"] })
    expect(matcher(snap("Anything", "GitHub - Sireno"))).toBe(true)
    expect(matcher(snap("Anything", "Other"))).toBe(false)
    expect(matcher(snap("Anything", null))).toBe(false)
  })

  it("empty window group passes — only processName matters", () => {
    const matcher = compileDeckMatcher({ processNames: ["chrome"] })
    expect(matcher(snap("Google Chrome"))).toBe(true)
    expect(matcher(snap("Google Chrome", null))).toBe(true)
    expect(matcher(snap("Firefox", null))).toBe(false)
  })

  it("null windowTitle + windowName group set → does not match", () => {
    const matcher = compileDeckMatcher({
      processNames: ["chrome"],
      windowNames: ["github"],
    })
    expect(matcher(snap("Chrome", null))).toBe(false)
  })
})
