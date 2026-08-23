import { describe, it, expect, vi } from "vitest"
import { validateButton } from "@/config/validation"
import type { AddonRegistry } from "@/addon/registry"
import type { RawButtonDef } from "@/config/schemas"
import type { RuntimeDeck } from "@/deck/runtime"
import { applyConfigErrorReplacements } from "@/cli/commands/run"
import pino from "pino"

const silentLogger = pino({ level: "silent" })

vi.mock("@/addon/registry")

const makeMockRegistry = (validTypes: Set<string>) => {
  const r = {
    hasButtonType: vi.fn().mockImplementation((t: string) => validTypes.has(t)),
    getButtonType: vi.fn().mockImplementation((t: string) => {
      if (!validTypes.has(t)) return undefined
      return {
        def: {
          service: {
            configSchema: undefined,
            internal: false,
          },
        },
      }
    }),
  } as unknown as AddonRegistry
  return r
}

describe("validateButton issues include deckId/position", () => {
  it("unknown type issues include deckId, position, and reason", () => {
    const mockRegistry = makeMockRegistry(new Set())
    const btn: RawButtonDef = { type: "unknown:thing", position: 3 }
    const result = validateButton(
      btn,
      mockRegistry,
      "decks.main.buttons[0]",
      "main",
      3,
    )
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0]!.deckId).toBe("main")
    expect(result.issues[0]!.position).toBe(3)
    expect(result.issues[0]!.reason).toBe("unknown-type")
    expect(result.issues[0]!.message).toContain("Unknown button type")
  })

  it("malformed config issues include reason='malformed-config'", () => {
    const mockRegistry = {
      hasButtonType: vi.fn().mockReturnValue(true),
      getButtonType: vi.fn().mockReturnValue({
        def: {
          service: {
            configSchema: {
              safeParse: () => ({
                success: false,
                error: {
                  issues: [{ path: ["nested"], message: "expected string" }],
                },
              }),
            },
            internal: false,
          },
        },
      }),
    } as unknown as AddonRegistry
    const btn: RawButtonDef = { type: "ok:type", position: 0 }
    const result = validateButton(
      btn,
      mockRegistry,
      "decks.main.buttons[0]",
      "main",
      0,
    )
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0]!.reason).toBe("malformed-config")
    expect(result.issues[0]!.deckId).toBe("main")
    expect(result.issues[0]!.position).toBe(0)
  })

  it("valid button returns no issues", () => {
    const mockRegistry = makeMockRegistry(new Set(["valid:button"]))
    const btn: RawButtonDef = { type: "valid:button", position: 7 }
    const result = validateButton(
      btn,
      mockRegistry,
      "decks.deck2.buttons[5]",
      "deck2",
      7,
    )
    expect(result.issues).toHaveLength(0)
  })
})

describe("error clears on rebuild", () => {
  it("invalid button replaced by core:temporary-error; corrected config restores button", () => {
    const invalidRegistry = makeMockRegistry(new Set(["valid:button"]))
    const validRegistry = makeMockRegistry(new Set(["valid:button"]))

    const invalidConfig = {
      type: "unknown:bad" as unknown as string,
      position: 0,
    }
    const validConfig = {
      type: "valid:button",
      position: 0,
    }

    const decks: ReadonlyArray<RuntimeDeck> = [
      {
        id: "main",
        name: "Main",
        buttons: [
          { id: "0", type: "unknown:bad", position: 0, config: invalidConfig },
        ],
      },
    ]
    const correctedDecks: ReadonlyArray<RuntimeDeck> = [
      {
        id: "main",
        name: "Main",
        buttons: [
          { id: "0", type: "valid:button", position: 0, config: validConfig },
        ],
      },
    ]

    const { decks: patched1 } = applyConfigErrorReplacements(
      decks,
      { decks: {} } as import("@/config/schemas").RawConfig,
      invalidRegistry,
      silentLogger,
    )
    expect(patched1[0]!.buttons[0]!.type).toBe("core:temporary-error")

    const { decks: patched2 } = applyConfigErrorReplacements(
      correctedDecks,
      { decks: {} } as import("@/config/schemas").RawConfig,
      validRegistry,
      silentLogger,
    )
    expect(patched2[0]!.buttons[0]!.type).toBe("valid:button")
  })
})
