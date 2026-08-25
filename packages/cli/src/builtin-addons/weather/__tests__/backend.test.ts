import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { AddonServiceContext } from "@/addon/api"

vi.mock("../provider/fetch", () => ({
  fetchWeather: vi.fn(),
}))

const fetchMod = await import("../provider/fetch")
const fetchWeatherMock = (
  fetchMod as unknown as { fetchWeather: ReturnType<typeof vi.fn> }
).fetchWeather

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

const makeCtx = (): { ctx: AddonServiceContext; signal: AbortController } => {
  const signal = new AbortController()
  const ctx = {
    publish: vi.fn(),
    poll: vi.fn(async () => undefined),
    signal: signal.signal,
    executor: {
      run: vi.fn(async () => ({
        exitCode: 0,
        stdout: "",
        stderr: "",
      })),
    } as unknown as AddonServiceContext["executor"],
    setClipboardProvider: () => {},
    notify: async () => undefined,
  } as unknown as AddonServiceContext
  return { ctx, signal }
}

describe("weather backend", () => {
  beforeEach(async () => {
    fetchWeatherMock.mockReset()
    const { globalService } = await import("../backend")
    const backend = globalService as unknown as BackendGlobalBackend
    backend.onUnload?.({
      publish: vi.fn(),
      poll: vi.fn(),
      signal: new AbortController().signal,
      executor: { run: vi.fn() },
    } as unknown as AddonServiceContext)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("registerCity adds a city to the registry", async () => {
    const { globalService } = await import("../backend")
    const backend = globalService as unknown as BackendGlobalBackend

    backend.methods?.["registerCity"]?.(
      "btn-1",
      { latitude: 40.7128, longitude: -74.006, name: "New York" },
      "metric",
    )

    const { ctx } = makeCtx()
    const result = (await backend.pollers![0]!.poll(ctx)) as {
      byCity: Record<string, unknown>
    }

    expect(Object.keys(result.byCity)).toHaveLength(1)
    expect(fetchWeatherMock).toHaveBeenCalledWith(
      { latitude: 40.7128, longitude: -74.006, name: "New York" },
      "metric",
      expect.any(AbortSignal),
    )
  })

  it("unregisterCity removes a city from the registry", async () => {
    const { globalService } = await import("../backend")
    const backend = globalService as unknown as BackendGlobalBackend

    backend.methods?.["registerCity"]?.(
      "btn-1",
      { latitude: 40.7128, longitude: -74.006 },
      "metric",
    )
    backend.methods?.["unregisterCity"]?.("btn-1")

    const { ctx } = makeCtx()
    const result = (await backend.pollers![0]!.poll(ctx)) as {
      byCity: Record<string, unknown>
    }

    expect(result.byCity).toEqual({})
    expect(fetchWeatherMock).not.toHaveBeenCalled()
  })

  it("deduplicates cities with same coordinates", async () => {
    const { globalService } = await import("../backend")
    const backend = globalService as unknown as BackendGlobalBackend

    backend.methods?.["registerCity"]?.(
      "btn-1",
      { latitude: 51.5074, longitude: -0.1278, name: "London" },
      "metric",
    )
    backend.methods?.["registerCity"]?.(
      "btn-2",
      { latitude: 51.5074, longitude: -0.1278, name: "London 2" },
      "metric",
    )

    fetchWeatherMock.mockResolvedValue({
      available: true,
      temperature: 15,
      windSpeed: 8,
      description: "Cloudy",
      wmoCode: 3,
      units: "metric",
    })

    const { ctx } = makeCtx()
    const result = (await backend.pollers![0]!.poll(ctx)) as {
      byCity: Record<string, unknown>
    }

    expect(Object.keys(result.byCity)).toHaveLength(1)
    expect(fetchWeatherMock).toHaveBeenCalledTimes(1)
  })

  it("returns unavailable snapshot when fetchWeather throws", async () => {
    const { globalService } = await import("../backend")
    const backend = globalService as unknown as BackendGlobalBackend

    backend.methods?.["registerCity"]?.(
      "btn-1",
      { latitude: 0, longitude: 0 },
      "metric",
    )
    fetchWeatherMock.mockRejectedValue(new Error("network error"))

    const { ctx } = makeCtx()
    const result = (await backend.pollers![0]!.poll(ctx)) as {
      byCity: Record<string, unknown>
    }

    expect(Object.keys(result.byCity)).toHaveLength(1)
    const entryResult = Object.values(result.byCity)[0] as Record<
      string,
      unknown
    >
    expect(entryResult.available).toBe(false)
    expect(entryResult.description).toBe("network error")
  })

  it("returns empty byCity when no cities registered", async () => {
    const { globalService } = await import("../backend")
    const backend = globalService as unknown as BackendGlobalBackend

    const { ctx } = makeCtx()
    const result = (await backend.pollers![0]!.poll(ctx)) as {
      byCity: Record<string, unknown>
    }

    expect(result.byCity).toEqual({})
  })

  it("uses imperial units when specified", async () => {
    const { globalService } = await import("../backend")
    const backend = globalService as unknown as BackendGlobalBackend

    backend.methods?.["registerCity"]?.(
      "btn-1",
      { latitude: 35.6762, longitude: 139.6503 },
      "imperial",
    )
    fetchWeatherMock.mockResolvedValue({
      available: true,
      temperature: 72,
      windSpeed: 10,
      description: "Clear",
      wmoCode: 0,
      units: "imperial",
    })

    const { ctx } = makeCtx()
    await backend.pollers![0]!.poll(ctx)

    expect(fetchWeatherMock).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 35.6762 }),
      "imperial",
      expect.any(AbortSignal),
    )
  })

  it("onUnload clears the registry", async () => {
    const { globalService } = await import("../backend")
    const backend = globalService as unknown as BackendGlobalBackend

    backend.methods?.["registerCity"]?.(
      "btn-1",
      { latitude: 40.7128, longitude: -74.006 },
      "metric",
    )
    backend.onUnload?.({
      publish: vi.fn(),
      poll: vi.fn(),
      signal: new AbortController().signal,
      executor: { run: vi.fn() },
    } as unknown as AddonServiceContext)

    const { ctx } = makeCtx()
    const result = (await backend.pollers![0]!.poll(ctx)) as {
      byCity: Record<string, unknown>
    }

    expect(result.byCity).toEqual({})
  })
})
