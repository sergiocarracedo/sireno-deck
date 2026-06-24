import { describe, expect, it } from "vitest";

import { compileDeckMatcher, matchesPattern } from "./glob-match.ts";

describe("matchesPattern", () => {
  it("literal substring matches case-insensitively", () => {
    expect(matchesPattern("Google Chrome", "chrome")).toBe(true);
    expect(matchesPattern("Google Chrome Helper", "chrome")).toBe(true);
    expect(matchesPattern("chrome", "chrome")).toBe(true);
  });

  it("literal substring does not match unrelated names", () => {
    expect(matchesPattern("Firefox", "chrome")).toBe(false);
  });

  it("empty pattern matches anything", () => {
    expect(matchesPattern("Anything", "")).toBe(true);
  });

  it("wildcard patterns", () => {
    expect(matchesPattern("Google Chrome Helper", "*chrome*")).toBe(true);
    expect(matchesPattern("Firefox", "*chrome*")).toBe(false);
  });

  it("alternation", () => {
    expect(matchesPattern("Spotify", "spotify|*apple music*")).toBe(true);
    expect(matchesPattern("Apple Music.app", "spotify|*apple music*")).toBe(true);
    expect(matchesPattern("Firefox", "spotify|*apple music*")).toBe(false);
  });
});

describe("compileDeckMatcher", () => {
  it("returns false for empty patterns", () => {
    const matcher = compileDeckMatcher([]);
    expect(matcher({ name: "Anything", windowTitle: null, processId: 1 })).toBe(false);
  });

  it("matches on name", () => {
    const matcher = compileDeckMatcher(["chrome"]);
    expect(matcher({ name: "Google Chrome", windowTitle: null, processId: 1 })).toBe(true);
  });

  it("matches on windowTitle", () => {
    const matcher = compileDeckMatcher(["GitHub"]);
    expect(matcher({ name: "Google Chrome", windowTitle: "GitHub - Sireno", processId: 1 })).toBe(
      true,
    );
  });

  it("any pattern matching returns true", () => {
    const matcher = compileDeckMatcher(["chrome", "firefox"]);
    expect(matcher({ name: "Firefox", windowTitle: null, processId: 1 })).toBe(true);
  });

  it("no match returns false", () => {
    const matcher = compileDeckMatcher(["chrome"]);
    expect(matcher({ name: "Spotify", windowTitle: "Music", processId: 1 })).toBe(false);
  });
});
