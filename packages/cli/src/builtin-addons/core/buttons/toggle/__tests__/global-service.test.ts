import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { AddonServiceContext } from "@/addon/api"

import { globalService } from "../global-service"
import type { StatusToggleConfig } from "../config"

interface BackendGlobalBackend {
  readonly methods?: Readonly<Record<string, (...args: unknown[]) => unknown>>
  readonly pollers?: ReadonlyArray<{
    readonly id: string
    readonly channel: string
    readonly intervalMs: number
    readonly poll: (ctx: AddonServiceContext) => Promise<unknown>
  }>
  readonly onLoad?: (ctx: AddonServiceContext) => void | Promise<void>
  readonly onUnload?: (ctx: AddonServiceContext) => void | Promise<void>
}

const PLAYING_CONFIG: StatusToggleConfig = {
  statusCommand: "playerctl status",
  states: {
    Playing: {
      label: "Playing",
      icon: "icon://play",
      onTap: "playerctl pause",
    },
    Paused: { label: "Paused", icon: "icon://pause", onTap: "playerctl play" },
  },
}

const makeCtx = (
  runMock: ReturnType<typeof vi.fn>,
): AddonServiceContext & { poll: ReturnType<typeof vi.fn> } => {
  const poll = vi.fn(async () => undefined)
  return {
    publish: vi.fn(),
    poll,
    signal: new AbortController().signal,
    executor: { run: runMock } as unknown as AddonServiceContext["executor"],
  }
}

const baseCtx = (): AddonServiceContext => ({
  publish: vi.fn(),
  poll: vi.fn(async () => undefined),
  signal: new AbortController().signal,
  executor: {
    run: vi.fn(async () => ({ exitCode: 0, stdout: "", stderr: "" })),
  } as unknown as AddonServiceContext["executor"],
})

describe("core:toggle global service", () => {
  beforeEach(async () => {
    const backend = globalService as unknown as BackendGlobalBackend
    backend.onUnload?.(baseCtx())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("register adds the button to the registry and triggers a repoll", async () => {
    const backend = globalService as unknown as BackendGlobalBackend
    const ctx = makeCtx(
      vi.fn(async () => ({ exitCode: 0, stdout: "Playing", stderr: "" })),
    )
    backend.onLoad?.(ctx)

    backend.methods?.["register"]?.("btn-1", PLAYING_CONFIG)
    expect(ctx.poll).toHaveBeenCalledWith("states")

    const result = (await backend.pollers![0]!.poll(ctx)) as {
      byButton: Record<
        string,
        { raw: string; state: string | undefined } | null
      >
    }
    expect(result.byButton["btn-1"]?.raw).toBe("Playing")
    expect(result.byButton["btn-1"]?.state).toBe("Playing")
  })

  it("matches the raw command output against the states map", async () => {
    const backend = globalService as unknown as BackendGlobalBackend
    const run = vi.fn(async () => ({
      exitCode: 0,
      stdout: "Paused\n",
      stderr: "",
    }))
    const ctx = makeCtx(run)
    backend.onLoad?.(ctx)
    backend.methods?.["register"]?.("btn-1", PLAYING_CONFIG)

    const result = (await backend.pollers![0]!.poll(ctx)) as {
      byButton: Record<string, { state: string | undefined } | null>
    }
    expect(result.byButton["btn-1"]?.state).toBe("Paused")
  })

  it("returns raw text but no matched state when the value is undeclared", async () => {
    const backend = globalService as unknown as BackendGlobalBackend
    const run = vi.fn(async () => ({
      exitCode: 0,
      stdout: "unknown-state",
      stderr: "",
    }))
    const ctx = makeCtx(run)
    backend.onLoad?.(ctx)
    backend.methods?.["register"]?.("btn-1", PLAYING_CONFIG)

    const result = (await backend.pollers![0]!.poll(ctx)) as {
      byButton: Record<
        string,
        { raw: string; state: string | undefined } | null
      >
    }
    expect(result.byButton["btn-1"]?.raw).toBe("unknown-state")
    expect(result.byButton["btn-1"]?.state).toBeUndefined()
  })

  it("captures executor errors on the toggle state", async () => {
    const backend = globalService as unknown as BackendGlobalBackend
    const run = vi.fn(async () => {
      throw new Error("playerctl not found")
    })
    const ctx = makeCtx(run)
    backend.onLoad?.(ctx)
    backend.methods?.["register"]?.("btn-1", PLAYING_CONFIG)

    const result = (await backend.pollers![0]!.poll(ctx)) as {
      byButton: Record<
        string,
        { raw: string; state: string | undefined; error?: string } | null
      >
    }
    expect(result.byButton["btn-1"]?.error).toBe("playerctl not found")
    expect(result.byButton["btn-1"]?.state).toBeUndefined()
  })

  it("unregister removes the button from the registry", async () => {
    const backend = globalService as unknown as BackendGlobalBackend
    const ctx = makeCtx(
      vi.fn(async () => ({ exitCode: 0, stdout: "Playing", stderr: "" })),
    )
    backend.onLoad?.(ctx)
    backend.methods?.["register"]?.("btn-1", PLAYING_CONFIG)
    backend.methods?.["unregister"]?.("btn-1")

    const result = (await backend.pollers![0]!.poll(ctx)) as {
      byButton: Record<string, unknown>
    }
    expect(result.byButton).toEqual({})
  })

  it("republish triggers an immediate repoll on the global service", async () => {
    const backend = globalService as unknown as BackendGlobalBackend
    const ctx = makeCtx(
      vi.fn(async () => ({ exitCode: 0, stdout: "Playing", stderr: "" })),
    )
    backend.onLoad?.(ctx)
    backend.methods?.["register"]?.("btn-1", PLAYING_CONFIG)
    ctx.poll.mockClear()

    backend.methods?.["republish"]?.()
    expect(ctx.poll).toHaveBeenCalledWith("states")
  })

  it("lookup returns null when the button has never been polled", async () => {
    const backend = globalService as unknown as BackendGlobalBackend
    const ctx = makeCtx(
      vi.fn(async () => ({ exitCode: 0, stdout: "Playing", stderr: "" })),
    )
    backend.onLoad?.(ctx)
    backend.methods?.["register"]?.("btn-1", PLAYING_CONFIG)

    expect(backend.methods?.["lookup"]?.("btn-1")).toBeNull()
  })

  it("lookup returns the last polled state for a registered button", async () => {
    const backend = globalService as unknown as BackendGlobalBackend
    const run = vi.fn(async () => ({
      exitCode: 0,
      stdout: "Paused",
      stderr: "",
    }))
    const ctx = makeCtx(run)
    backend.onLoad?.(ctx)
    backend.methods?.["register"]?.("btn-1", PLAYING_CONFIG)
    await backend.pollers![0]!.poll(ctx)

    const looked = backend.methods?.["lookup"]?.("btn-1") as {
      raw: string
      state: string | undefined
    }
    expect(looked.raw).toBe("Paused")
    expect(looked.state).toBe("Paused")
  })

  it("honors per-button intervalMs between polls", async () => {
    const backend = globalService as unknown as BackendGlobalBackend
    let calls = 0
    const run = vi.fn(async () => {
      calls++
      return { exitCode: 0, stdout: "Playing", stderr: "" }
    })
    const ctx = makeCtx(run)
    backend.onLoad?.(ctx)
    backend.methods?.["register"]?.("btn-1", {
      ...PLAYING_CONFIG,
      intervalMs: 60_000,
    })

    await backend.pollers![0]!.poll(ctx)
    expect(calls).toBe(1)

    // ponytail: the scheduled tick reuses cached state when the per-button
    // interval hasn't elapsed. We assert by checking the cached state survives.
    const cached = (await backend.pollers![0]!.poll(ctx)) as {
      byButton: Record<string, { raw: string } | null>
    }
    expect(cached.byButton["btn-1"]?.raw).toBe("Playing")
    expect(calls).toBe(1)
  })

  it("onUnload clears the registry", async () => {
    const backend = globalService as unknown as BackendGlobalBackend
    const ctx = makeCtx(
      vi.fn(async () => ({ exitCode: 0, stdout: "Playing", stderr: "" })),
    )
    backend.onLoad?.(ctx)
    backend.methods?.["register"]?.("btn-1", PLAYING_CONFIG)
    backend.onUnload?.(ctx)

    const result = (await backend.pollers![0]!.poll(ctx)) as {
      byButton: Record<string, unknown>
    }
    expect(result.byButton).toEqual({})
  })

  it("exposes a stable channel name", () => {
    expect(globalService.pollers?.[0]?.channel).toBe("core:toggle:states")
  })
})
