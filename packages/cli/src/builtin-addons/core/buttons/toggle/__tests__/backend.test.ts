import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { AddonButtonServiceContext } from "@/addon/api"

import ToggleBackend from "../backend"
import { globalService } from "../global-service"

interface BackendGlobalBackend {
  readonly methods?: Readonly<Record<string, (...args: unknown[]) => unknown>>
  readonly onLoad?: (ctx: unknown) => void | Promise<void>
  readonly onUnload?: (ctx: unknown) => void | Promise<void>
}

type TestCtx = AddonButtonServiceContext<unknown>

const makeCtx = (overrides: {
  config: unknown
  buttonId?: string
  methods?: Record<string, (...args: unknown[]) => unknown>
  coreMethods?: {
    runCommand: ReturnType<typeof vi.fn>
  }
}) => {
  const store = {
    buttonScope: vi.fn(() => ({
      get: vi.fn(() => false),
      set: vi.fn(),
    })),
  }
  const ctx = {
    config: overrides.config,
    buttonId: overrides.buttonId ?? "btn-1",
    addonName: "core",
    methods: Object.freeze(
      overrides.methods ?? {
        "core:register": vi.fn(),
        "core:unregister": vi.fn(),
        "core:republish": vi.fn(),
        "core:lookup": vi.fn(async () => null),
      },
    ) as Readonly<Record<string, (...args: unknown[]) => unknown>>,
    coreMethods: overrides.coreMethods ?? {
      runCommand: vi.fn(async () => ({
        exitCode: 0,
        stdout: "",
        stderr: "",
      })),
    },
    publish: vi.fn(),
    executor: { run: vi.fn() },
    signal: new AbortController().signal,
    store: store as never,
  } as unknown as TestCtx
  return { ctx, store }
}

const resetRegistry = (): void => {
  const backend = globalService as unknown as BackendGlobalBackend
  backend.onUnload?.({})
}

describe("core:toggle backend", () => {
  beforeEach(() => {
    resetRegistry()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("legacy mode (key/default)", () => {
    it("flips the boolean in the store and calls invalidate on tap", async () => {
      const { ctx, store } = makeCtx({ config: { key: "k" } })
      const invalidate = vi.fn()
      const tapCtx = {
        ...ctx,
        methods: { ...ctx.methods, invalidate },
      } as never
      await ToggleBackend.onTap!(tapCtx as never)
      expect(invalidate).toHaveBeenCalled()
      expect(store.buttonScope).toHaveBeenCalledWith("core", "k")
    })

    it("uses the legacy default when the store has no current value", async () => {
      const set = vi.fn()
      const store = {
        buttonScope: vi.fn(() => ({
          get: vi.fn(() => undefined),
          set,
        })),
      }
      const { ctx } = makeCtx({ config: { key: "k", default: true } })
      const tapCtx = {
        ...ctx,
        store: store as never,
        methods: {
          ...ctx.methods,
          invalidate: vi.fn(),
        },
      } as never
      await ToggleBackend.onTap!(tapCtx as never)
      // ponytail: tap flips the boolean — true default → false next state.
      expect(set).toHaveBeenCalledWith("value", false)
    })
  })

  describe("status mode (statusCommand/states)", () => {
    it("registers on mount and unregisters on dispose", () => {
      const register = vi.fn()
      const unregister = vi.fn()
      const { ctx } = makeCtx({
        config: {
          statusCommand: "playerctl status",
          states: { Playing: { label: "Playing" } },
        },
        methods: {
          "core:register": register,
          "core:unregister": unregister,
          "core:republish": vi.fn(),
          "core:lookup": vi.fn(async () => null),
        },
      })
      ToggleBackend.onMount!(ctx as never)
      expect(register).toHaveBeenCalledWith(
        "btn-1",
        expect.objectContaining({ statusCommand: "playerctl status" }),
      )
      ToggleBackend.dispose!(ctx as never)
      expect(unregister).toHaveBeenCalledWith("btn-1")
    })

    it("skips register/unregister for the legacy config shape", () => {
      const register = vi.fn()
      const unregister = vi.fn()
      const { ctx } = makeCtx({
        config: { key: "k" },
        methods: {
          "core:register": register,
          "core:unregister": unregister,
          "core:republish": vi.fn(),
          "core:lookup": vi.fn(async () => null),
        },
      })
      ToggleBackend.onMount!(ctx as never)
      ToggleBackend.dispose!(ctx as never)
      expect(register).not.toHaveBeenCalled()
      expect(unregister).not.toHaveBeenCalled()
    })

    it("onTap runs the matched state's onTap and triggers republish", async () => {
      const runCommand = vi.fn(async () => ({
        exitCode: 0,
        stdout: "",
        stderr: "",
      }))
      const republish = vi.fn()
      const lookup = vi.fn(async () => ({
        raw: "Playing",
        state: "Playing",
        at: 1,
      }))
      const { ctx } = makeCtx({
        config: {
          statusCommand: "playerctl status",
          states: {
            Playing: { label: "Playing", onTap: "playerctl pause" },
            Paused: { label: "Paused", onTap: "playerctl play" },
          },
        },
        methods: {
          "core:register": vi.fn(),
          "core:unregister": vi.fn(),
          "core:republish": republish,
          "core:lookup": lookup,
        },
        coreMethods: { runCommand },
      })
      await ToggleBackend.onTap!(ctx as never)
      expect(runCommand).toHaveBeenCalledWith("playerctl pause", {
        timeoutMs: undefined,
      })
      expect(republish).toHaveBeenCalled()
    })

    it("onTap only triggers republish when the state has no onTap", async () => {
      const runCommand = vi.fn(async () => ({
        exitCode: 0,
        stdout: "",
        stderr: "",
      }))
      const republish = vi.fn()
      const lookup = vi.fn(async () => ({
        raw: "Playing",
        state: "Playing",
        at: 1,
      }))
      const { ctx } = makeCtx({
        config: {
          statusCommand: "playerctl status",
          states: { Playing: { label: "Playing" } },
        },
        methods: {
          "core:register": vi.fn(),
          "core:unregister": vi.fn(),
          "core:republish": republish,
          "core:lookup": lookup,
        },
        coreMethods: { runCommand },
      })
      await ToggleBackend.onTap!(ctx as never)
      expect(runCommand).not.toHaveBeenCalled()
      expect(republish).toHaveBeenCalled()
    })

    it("onTap republishes when the lookup returns no matched state", async () => {
      const runCommand = vi.fn(async () => ({
        exitCode: 0,
        stdout: "",
        stderr: "",
      }))
      const republish = vi.fn()
      const lookup = vi.fn(async () => null)
      const { ctx } = makeCtx({
        config: {
          statusCommand: "playerctl status",
          states: { Playing: { label: "Playing", onTap: "playerctl pause" } },
        },
        methods: {
          "core:register": vi.fn(),
          "core:unregister": vi.fn(),
          "core:republish": republish,
          "core:lookup": lookup,
        },
        coreMethods: { runCommand },
      })
      await ToggleBackend.onTap!(ctx as never)
      expect(runCommand).not.toHaveBeenCalled()
      expect(republish).toHaveBeenCalled()
    })

    it("onTap republishes when the matched state key is undeclared", async () => {
      const runCommand = vi.fn(async () => ({
        exitCode: 0,
        stdout: "",
        stderr: "",
      }))
      const republish = vi.fn()
      const lookup = vi.fn(async () => ({
        raw: "Stopped",
        state: undefined,
        at: 1,
      }))
      const { ctx } = makeCtx({
        config: {
          statusCommand: "playerctl status",
          states: { Playing: { label: "Playing", onTap: "playerctl pause" } },
        },
        methods: {
          "core:register": vi.fn(),
          "core:unregister": vi.fn(),
          "core:republish": republish,
          "core:lookup": lookup,
        },
        coreMethods: { runCommand },
      })
      await ToggleBackend.onTap!(ctx as never)
      expect(runCommand).not.toHaveBeenCalled()
      expect(republish).toHaveBeenCalled()
    })

    it("onTap forwards the configured timeoutMs to the command runner", async () => {
      const runCommand = vi.fn(async () => ({
        exitCode: 0,
        stdout: "",
        stderr: "",
      }))
      const lookup = vi.fn(async () => ({
        raw: "Playing",
        state: "Playing",
        at: 1,
      }))
      const { ctx } = makeCtx({
        config: {
          statusCommand: "playerctl status",
          timeoutMs: 2500,
          states: {
            Playing: { label: "Playing", onTap: "playerctl pause" },
          },
        },
        methods: {
          "core:register": vi.fn(),
          "core:unregister": vi.fn(),
          "core:republish": vi.fn(),
          "core:lookup": lookup,
        },
        coreMethods: { runCommand },
      })
      await ToggleBackend.onTap!(ctx as never)
      expect(runCommand).toHaveBeenCalledWith("playerctl pause", {
        timeoutMs: 2500,
      })
    })
  })
})
