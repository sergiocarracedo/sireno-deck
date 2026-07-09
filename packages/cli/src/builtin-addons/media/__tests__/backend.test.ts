import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { AddonServiceContext } from "@/addon/api"
import type { MediaStatus, MediaStatusProvider } from "../providers"
import type { MediaPlayerState } from "../state"

interface BackendGlobalBackend {
  readonly pollers?: ReadonlyArray<{
    readonly id: string
    readonly channel: string
    readonly intervalMs: number
    readonly poll: (ctx: AddonServiceContext) => Promise<unknown>
  }>
  readonly methods?: Readonly<
    Record<string, (...args: readonly unknown[]) => unknown>
  >
  readonly onLoad?: (ctx: AddonServiceContext) => void | Promise<void>
  readonly onUnload?: (ctx: AddonServiceContext) => void | Promise<void>
}

vi.mock("../providers", () => ({
  createMediaProvider: vi.fn(),
}))

const providersMod = await import("../providers")
const createMediaProviderMock = (
  providersMod as unknown as { createMediaProvider: ReturnType<typeof vi.fn> }
).createMediaProvider

const makeProvider = (
  getStatusImpl: () => Promise<MediaStatus>,
  overrides: Partial<MediaStatusProvider> = {},
): MediaStatusProvider => ({
  getStatus: getStatusImpl,
  play: vi.fn(async () => undefined),
  pause: vi.fn(async () => undefined),
  toggle: vi.fn(async () => undefined),
  next: vi.fn(async () => undefined),
  previous: vi.fn(async () => undefined),
  setVolume: vi.fn(async () => undefined),
  volumeUp: vi.fn(async () => undefined),
  volumeDown: vi.fn(async () => undefined),
  toggleMute: vi.fn(async () => undefined),
  ...overrides,
})

const makeCtx = (): {
  ctx: AddonServiceContext
  publishSpy: ReturnType<typeof vi.fn>
  pollSpy: ReturnType<typeof vi.fn>
} => {
  const publishSpy = vi.fn()
  const pollSpy = vi.fn(async () => undefined)
  const ctx: AddonServiceContext = {
    publish: publishSpy,
    poll: pollSpy,
    signal: new AbortController().signal,
    executor: {
      run: vi.fn(async () => ({
        exitCode: 0,
        stdout: "",
        stderr: "",
      })) as unknown as AddonServiceContext["executor"]["run"],
    },
  }
  return { ctx, publishSpy, pollSpy }
}

const playing = (currentTime: number, totalTime: number): MediaStatus => ({
  track: { name: "Track", artist: "Artist", album: "Album" },
  totalTime,
  currentTime,
  playStatus: "play",
  volume: 0.5,
  muted: false,
})

const paused = (currentTime: number, totalTime: number): MediaStatus => ({
  ...playing(currentTime, totalTime),
  playStatus: "pause",
})

describe("media backend", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Reset module-level state by calling onUnload, which clears provider/ctxRef.
    void globalThis
  })

  it("poller uses the provider's playStatus directly (no nested mapping)", async () => {
    const provider = makeProvider(async () => playing(30, 200))
    createMediaProviderMock.mockReturnValue(provider)

    const { globalService } = await import("../backend")
    const backend = globalService as unknown as BackendGlobalBackend
    const { ctx } = makeCtx()
    backend.onLoad!(ctx)

    const result = (await backend.pollers![0]!.poll(ctx)) as MediaPlayerState
    expect(result.status).toBe("play")
    expect(result.title).toBe("Track")
    expect(result.progress).toBe(15) // 30/200 * 100
    expect(result.currentTime).toBe(30)
    expect(result.totalTime).toBe(200)

    backend.onUnload!(ctx)
  })

  it("methods call ctx.poll('state') after the action", async () => {
    const provider = makeProvider(async () => playing(0, 0))
    createMediaProviderMock.mockReturnValue(provider)

    const { globalService } = await import("../backend")
    const backend = globalService as unknown as BackendGlobalBackend
    const { ctx, pollSpy } = makeCtx()
    backend.onLoad!(ctx)

    await (backend.methods!.toggle as () => Promise<void>)()

    expect(provider.toggle).toHaveBeenCalledTimes(1)
    expect(pollSpy).toHaveBeenCalledTimes(1)
    expect(pollSpy).toHaveBeenCalledWith("state")

    backend.onUnload!(ctx)
  })

  it("poller returns FALLBACK_STATE when provider is null", async () => {
    createMediaProviderMock.mockReturnValue(
      makeProvider(async () => playing(0, 0)),
    )

    const { globalService } = await import("../backend")
    const backend = globalService as unknown as BackendGlobalBackend
    const { ctx } = makeCtx()
    // Intentionally do not call onLoad so provider stays null.
    const result = (await backend.pollers![0]!.poll(ctx)) as MediaPlayerState
    expect(result).toEqual({
      title: null,
      artist: null,
      source: null,
      status: "notAvailable",
      isPlaying: false,
      volume: 0,
      progress: 0,
      currentTime: 0,
      totalTime: 0,
      muted: false,
    })
  })

  it("poller returns FALLBACK_STATE when provider.getStatus throws", async () => {
    const provider = makeProvider(async () => {
      throw new Error("playerctl not found")
    })
    createMediaProviderMock.mockReturnValue(provider)

    const { globalService } = await import("../backend")
    const backend = globalService as unknown as BackendGlobalBackend
    const { ctx } = makeCtx()
    backend.onLoad!(ctx)

    const result = (await backend.pollers![0]!.poll(ctx)) as MediaPlayerState
    expect(result.status).toBe("notAvailable")
    expect(result.progress).toBe(0)

    backend.onUnload!(ctx)
  })

  it("maps provider's 'unavailable' status to 'notAvailable' on the wire", async () => {
    const unavailableStatus: MediaStatus = {
      track: null,
      totalTime: 0,
      currentTime: 0,
      playStatus: "unavailable",
      volume: 1,
      muted: false,
    }
    const provider = makeProvider(async () => unavailableStatus)
    createMediaProviderMock.mockReturnValue(provider)

    const { globalService } = await import("../backend")
    const backend = globalService as unknown as BackendGlobalBackend
    const { ctx } = makeCtx()
    backend.onLoad!(ctx)

    const result = (await backend.pollers![0]!.poll(ctx)) as MediaPlayerState
    expect(result.status).toBe("notAvailable")
    expect(result.isPlaying).toBe(false)

    backend.onUnload!(ctx)
  })
})
