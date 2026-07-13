/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"

import { Icon, _testHelpers } from "../Icon"
import {
  AssetCacheContext,
  type AssetCache,
} from "../../contexts/AssetCacheContext"

const renderWithCache = (
  ui: React.ReactNode,
  cache: AssetCache = new Map(),
): ReturnType<typeof render> =>
  render(
    <AssetCacheContext.Provider value={cache}>{ui}</AssetCacheContext.Provider>,
  )

beforeEach(() => {
  // Reset the warnedSources module-level Set so each test is independent.
  // We can't access it directly; tests rely on isolation of console.warn.
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("isIconSource", () => {
  const { isIconSource } = _testHelpers

  it("accepts icon://<name>", () => {
    expect(isIconSource("icon://arrow-left")).toBe(true)
    expect(isIconSource("icon://settings")).toBe(true)
    expect(isIconSource("icon://alert-circle")).toBe(true)
  })

  it("accepts asset://<id>", () => {
    expect(isIconSource("asset://abc123")).toBe(true)
  })

  it("accepts a single emoji (Presentation or base+VS16)", () => {
    expect(isIconSource("🔥")).toBe(true)
    expect(isIconSource("🎉")).toBe(true)
    expect(isIconSource("✈️")).toBe(true) // base + VS16
    expect(isIconSource("⌚")).toBe(true) // \p{Emoji_Presentation}
  })

  it("rejects invalid sources", () => {
    expect(isIconSource("")).toBe(false)
    expect(isIconSource(undefined)).toBe(false)
    expect(isIconSource(null)).toBe(false)
    expect(isIconSource(42)).toBe(false)
    expect(isIconSource("%")).toBe(false)
    expect(isIconSource("abc")).toBe(false)
    expect(isIconSource("icon://")).toBe(false) // empty name
    expect(isIconSource("asset://")).toBe(false) // empty id
    expect(isIconSource("data:image/png;base64,AAAA")).toBe(false)
    expect(isIconSource("http://example.com/x.png")).toBe(false)
    expect(isIconSource("🔥🔥")).toBe(false) // multi-char
  })

  it("accepts runtime-resolvable paths", () => {
    // The runtime's resolveIconSource handles these paths against
    // baseDirs (relative) or as-is (absolute). The frontend Icon
    // primitive renders them as fallback (since the frontend doesn't
    // have file IO), but the validator accepts them so config-load
    // doesn't reject valid runtime sources.
    expect(isIconSource("./foo.svg")).toBe(true)
    expect(isIconSource("../shared/icon.svg")).toBe(true)
    expect(isIconSource("/abs/foo.svg")).toBe(true)
    expect(isIconSource("addon://demo/icon.svg")).toBe(true)
    expect(isIconSource("builtin://core/foo.png")).toBe(true)
    // Windows-style absolute paths (drive letter).
    expect(isIconSource("C:\\Windows\\foo.png")).toBe(true)
    expect(isIconSource("C:/Windows/foo.png")).toBe(true)
  })
})

describe("resolveLucideIcon", () => {
  it("resolves kebab-case names", () => {
    expect(_testHelpers.resolveLucideIcon("arrow-left")).toBeDefined()
    expect(_testHelpers.resolveLucideIcon("alert-circle")).toBeDefined()
  })

  it("returns undefined for unknown icons", () => {
    expect(
      _testHelpers.resolveLucideIcon("not-a-real-icon-name"),
    ).toBeUndefined()
  })

  it("returns undefined for empty / whitespace", () => {
    expect(_testHelpers.resolveLucideIcon("")).toBeUndefined()
    expect(_testHelpers.resolveLucideIcon("  ")).toBeUndefined()
  })
})

describe("Icon render", () => {
  it("renders emoji as a span with data-sireno-icon-source=emoji", () => {
    const { container } = renderWithCache(<Icon source="🔥" size={32} />)
    const span = container.querySelector('[data-sireno-icon-source="emoji"]')
    expect(span).not.toBeNull()
    expect(span?.textContent).toBe("🔥")
    expect(span?.getAttribute("style")).toContain("font-size: 32px")
  })

  it("renders icon:// as Lucide component", () => {
    const { container } = renderWithCache(<Icon source="icon://arrow-left" />)
    const svg = container.querySelector('[data-sireno-icon-source="generic"]')
    expect(svg).not.toBeNull()
    expect(svg?.tagName.toLowerCase()).toBe("svg")
  })

  it("renders asset:// as <img> when the asset is in the cache", () => {
    const cache: AssetCache = new Map([
      ["abc123", "data:image/svg+xml;base64,XYZ"],
    ])
    const { container } = renderWithCache(
      <Icon source="asset://abc123" size={48} />,
      cache,
    )
    const img = container.querySelector("img")
    expect(img).not.toBeNull()
    expect(img?.getAttribute("src")).toBe("data:image/svg+xml;base64,XYZ")
    expect(img?.getAttribute("data-sireno-icon-source")).toBe("asset")
    expect(img?.getAttribute("style")).toContain("48px")
  })

  it("renders fallback when asset:// id is missing from the cache", () => {
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined)
    const { container } = renderWithCache(<Icon source="asset://missing" />)
    const fallback = container.querySelector(
      '[data-sireno-icon-source="generic"]',
    )
    expect(fallback).not.toBeNull()
    expect(warnSpy).toHaveBeenCalledOnce()
    expect(warnSpy.mock.calls[0]?.[0]).toContain("invalid icon source")
  })

  it("renders fallback for unknown icon:// name", () => {
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined)
    const { container } = renderWithCache(
      <Icon source="icon://not-a-real-icon" />,
    )
    const fallback = container.querySelector(
      '[data-sireno-icon-source="generic"]',
    )
    expect(fallback).not.toBeNull()
    expect(warnSpy).toHaveBeenCalledOnce()
  })

  it("renders fallback (no throw) for invalid source", () => {
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined)
    for (const bad of ["%", "abc", "./foo.svg", ""]) {
      const { container } = renderWithCache(<Icon source={bad} />)
      const fallback = container.querySelector(
        '[data-sireno-icon-source="generic"]',
      )
      expect(fallback, `fallback for "${bad}"`).not.toBeNull()
    }
    expect(warnSpy).toHaveBeenCalled()
  })

  it("renders fallback when source is undefined", () => {
    const { container } = renderWithCache(<Icon />)
    const fallback = container.querySelector(
      '[data-sireno-icon-source="generic"]',
    )
    expect(fallback).not.toBeNull()
  })

  it("warns once per distinct invalid source", () => {
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined)
    // Use a unique source string that no other test used, to verify the
    // dedupe semantics in isolation.
    const unique = `__test_${Math.random().toString(36).slice(2)}__`
    renderWithCache(<Icon source={unique} />)
    renderWithCache(<Icon source={unique} />)
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })
})
