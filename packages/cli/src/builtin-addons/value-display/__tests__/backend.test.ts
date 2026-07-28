import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { AddonServiceContext } from "@/addon/api"

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

const defaultCtx = (): AddonServiceContext => ({
  publish: vi.fn(),
  poll: vi.fn(async () => undefined),
  signal: new AbortController().signal,
  executor: {
    run: vi.fn(async () => ({ exitCode: 0, stdout: "", stderr: "" })),
  } as unknown as AddonServiceContext["executor"],
})

const execCtx = (runMock: ReturnType<typeof vi.fn>): AddonServiceContext => ({
  publish: vi.fn(),
  poll: vi.fn(async () => undefined),
  signal: new AbortController().signal,
  executor: { run: runMock } as unknown as AddonServiceContext["executor"],
})

describe("value-display backend", () => {
  beforeEach(async () => {
    const { globalService } = await import("../backend")
    ;(globalService as unknown as BackendGlobalBackend).onUnload?.(defaultCtx())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("registerValues adds config to registry and includes it in poll output", async () => {
    const { globalService } = await import("../backend")
    const backend = globalService as unknown as BackendGlobalBackend

    backend.methods?.["registerValues"]?.("btn-1", {
      values: [{ label: "CPU", command: "nproc", formatter: "raw" }],
      timeout_ms: 5000,
    })

    const run = vi.fn(async () => ({ exitCode: 0, stdout: "8", stderr: "" }))
    const result = (await backend.pollers![0]!.poll(execCtx(run))) as {
      byButton: Record<
        string,
        Array<{ label: string; value: string; units?: string }>
      >
    }

    expect(result.byButton["btn-1"]).toHaveLength(1)
    expect(result.byButton["btn-1"][0].value).toBe("8")
    expect(run).toHaveBeenCalledWith("nproc", { timeoutMs: 5000 })
  })

  it("supports multiple buttons", async () => {
    const { globalService } = await import("../backend")
    const backend = globalService as unknown as BackendGlobalBackend

    backend.methods?.["registerValues"]?.("btn-1", {
      values: [{ label: "A", command: "echo a", formatter: "raw" }],
      timeout_ms: 1000,
    })
    backend.methods?.["registerValues"]?.("btn-2", {
      values: [{ label: "B", command: "echo b", formatter: "raw" }],
      timeout_ms: 1000,
    })

    const run = vi.fn(async () => ({ exitCode: 0, stdout: "x", stderr: "" }))
    const result = (await backend.pollers![0]!.poll(execCtx(run))) as {
      byButton: Record<string, unknown>
    }

    expect(Object.keys(result.byButton)).toHaveLength(2)
  })

  it("unregisterValues removes config from registry", async () => {
    const { globalService } = await import("../backend")
    const backend = globalService as unknown as BackendGlobalBackend

    backend.methods?.["registerValues"]?.("btn-1", {
      values: [{ label: "CPU", command: "nproc" }],
    })
    backend.methods?.["unregisterValues"]?.("btn-1")

    const result = (await backend.pollers![0]!.poll(defaultCtx())) as {
      byButton: Record<string, unknown>
    }

    expect(result.byButton).toEqual({})
  })

  it("onUnload clears the registry", async () => {
    const { globalService } = await import("../backend")
    const backend = globalService as unknown as BackendGlobalBackend

    backend.methods?.["registerValues"]?.("btn-1", {
      values: [{ label: "CPU", command: "nproc" }],
    })
    backend.onUnload?.(defaultCtx())

    const result = (await backend.pollers![0]!.poll(defaultCtx())) as {
      byButton: Record<string, unknown>
    }

    expect(result.byButton).toEqual({})
  })

  it("returns empty byButton when no buttons registered", async () => {
    const { globalService } = await import("../backend")
    const backend = globalService as unknown as BackendGlobalBackend

    const result = (await backend.pollers![0]!.poll(defaultCtx())) as {
      byButton: Record<string, unknown>
    }

    expect(result.byButton).toEqual({})
  })

  it("executor throw produces value 'err' for that entry", async () => {
    const { globalService } = await import("../backend")
    const backend = globalService as unknown as BackendGlobalBackend

    backend.methods?.["registerValues"]?.("btn-1", {
      values: [
        { label: "OK", command: "ok-cmd", formatter: "raw" },
        { label: "FAIL", command: "fail-cmd", formatter: "raw" },
      ],
      timeout_ms: 1000,
    })

    let callCount = 0
    const run = vi.fn(async () => {
      callCount++
      if (callCount === 2) throw new Error("command failed")
      return { exitCode: 0, stdout: "42", stderr: "" }
    })

    const result = (await backend.pollers![0]!.poll(execCtx(run))) as {
      byButton: Record<string, Array<{ label: string; value: string }>>
    }

    expect(result.byButton["btn-1"]).toHaveLength(2)
    expect(result.byButton["btn-1"][0].value).toBe("42")
    expect(result.byButton["btn-1"][1].value).toBe("err")
  })
})
