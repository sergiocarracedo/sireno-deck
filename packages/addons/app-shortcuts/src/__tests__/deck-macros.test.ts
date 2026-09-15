import { describe, expect, it } from "vitest"

import { manifest } from "../manifest.js"
import type { AddonDeckEntry } from "../types.js"

const PLATFORMS = ["darwin", "linux", "win32"] as const

/**
 * Re-implements the host's per-OS macro resolution. Duplicated rather than
 * imported because this addon must not depend on the CLI's internals, and the
 * point of the test is to catch a deck whose macro the host would reject.
 */
const PLATFORM_ALIASES: Record<string, string> = {
  macos: "macos",
  mac: "macos",
  osx: "macos",
  darwin: "macos",
  linux: "linux",
  windows: "windows",
  win: "windows",
  win32: "windows",
}

const currentPlatform = (p: string): string =>
  p === "darwin" ? "macos" : p === "win32" ? "windows" : "linux"

const resolve = (value: string, platform: string): string => {
  const overrides = new Map<string, string>()
  let rest = value
  while (rest.startsWith("[")) {
    const colon = rest.indexOf(":")
    if (colon === -1) break
    const name = rest.slice(1, colon).trim().toLowerCase()
    const os = PLATFORM_ALIASES[name]
    if (os === undefined) break
    const close = rest.indexOf("]", colon)
    if (close === -1) throw new Error(`unterminated override in ${value}`)
    expect(overrides.has(os), `duplicate ${os} in ${value}`).toBe(false)
    overrides.set(os, rest.slice(colon + 1, close).trim())
    rest = rest.slice(close + 1)
  }
  const fallback = rest.trim()
  expect(fallback.length, `missing default in ${value}`).toBeGreaterThan(0)
  return overrides.get(currentPlatform(platform)) ?? fallback
}

const macrosOf = (deck: AddonDeckEntry): Array<[string, string]> =>
  (deck.buttons ?? []).flatMap((button) => {
    const actions = (button as { actions?: Record<string, unknown> }).actions
    const label =
      (button as { config?: { label?: string } }).config?.label ?? "?"
    return Object.values(actions ?? {})
      .filter((v): v is string => typeof v === "string")
      .filter((v) => v.startsWith("macro://"))
      .map((v) => [label, v.slice("macro://".length)] as [string, string])
  })

const decks = manifest.decks ?? []

describe("app-shortcuts deck macros", () => {
  it("ships decks to check", () => {
    expect(decks.length).toBeGreaterThan(0)
  })

  for (const deck of decks) {
    describe(deck.id, () => {
      for (const platform of PLATFORMS) {
        it(`every macro resolves on ${platform}`, () => {
          for (const [label, macro] of macrosOf(deck)) {
            const resolved = resolve(macro, platform)
            expect(
              resolved.length,
              `${label}: empty on ${platform}`,
            ).toBeGreaterThan(0)
            // A leftover bracket means the override syntax was mistyped.
            expect(
              resolved,
              `${label}: unparsed override on ${platform}`,
            ).not.toMatch(/^\[/)
          }
        })
      }
    })
  }

  // ponytail: cmd+tab is the macOS application switcher, not a tab action, and
  // cmd+h hides the frontmost app. A deck that sends either has silently
  // hijacked the user's machine, so pin them explicitly.
  it("never sends cmd+tab or a bare cmd+h on macOS", () => {
    for (const deck of decks) {
      for (const [label, macro] of macrosOf(deck)) {
        const mac = resolve(macro, "darwin").toLowerCase()
        for (const step of mac.split(";")) {
          expect(step.trim(), `${deck.id}/${label}`).not.toBe("cmd+tab")
          expect(step.trim(), `${deck.id}/${label}`).not.toBe("cmd+h")
        }
      }
    }
  })

  // Terminal programs take a real Control on macOS; rewriting them to cmd
  // would break every one of their bindings.
  it("leaves terminal-app decks on ctrl for macOS", () => {
    for (const id of ["app-shortcuts:claude-code", "app-shortcuts:opencode"]) {
      const deck = decks.find((d) => d.id === id)
      expect(deck, `${id} missing`).toBeDefined()
      for (const [label, macro] of macrosOf(deck!)) {
        expect(
          resolve(macro, "darwin"),
          `${id}/${label} must stay ctrl on macOS`,
        ).not.toContain("cmd")
      }
    }
  })
})
