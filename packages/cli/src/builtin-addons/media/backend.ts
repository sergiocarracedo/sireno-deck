import {
  AddonServiceContext,
  AddonServiceMethod,
  AddonGlobalService,
} from "@/addon"
import { computeProgress } from "./progress"
import { createMediaProvider, MediaStatusProvider } from "./providers"
import type { MediaPlayerState } from "./state"

const shellQuote = (arg: string): string => `'${arg.replace(/'/g, "'\\''")}'`

const FALLBACK_STATE: MediaPlayerState = {
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
}

let provider: MediaStatusProvider | null = null
let ctxRef: AddonServiceContext | null = null

const mapStatus = (
  playStatus: Awaited<
    ReturnType<MediaStatusProvider["getStatus"]>
  >["playStatus"],
): MediaPlayerState["status"] => {
  if (
    playStatus === "play" ||
    playStatus === "pause" ||
    playStatus === "stop"
  ) {
    return playStatus
  }
  // 'unavailable' (provider reachable but no data) → 'notAvailable'.
  return "notAvailable"
}

const buildState = (
  status: Awaited<ReturnType<MediaStatusProvider["getStatus"]>>,
): MediaPlayerState => ({
  title: status.track?.name ?? null,
  artist: status.track?.artist ?? null,
  source: status.track?.album ?? null,
  status: mapStatus(status.playStatus),
  isPlaying: status.playStatus === "play",
  volume: Math.round(status.volume * 100),
  progress: computeProgress(status.currentTime, status.totalTime),
  currentTime: status.currentTime,
  totalTime: status.totalTime,
  muted: status.muted,
})

const wrap = (
  action: (...args: readonly unknown[]) => Promise<void>,
): AddonServiceMethod => {
  return async (...args) => {
    try {
      await action(...args)
    } catch (err) {
      console.error("[media] action failed:", err)
    }
    await ctxRef?.poll("state")
  }
}

export const globalService: AddonGlobalService = {
  pollers: [
    {
      id: "state",
      channel: "media:state",
      intervalMs: 1_000,
      poll: async (_ctx: AddonServiceContext): Promise<MediaPlayerState> => {
        if (provider === null) return FALLBACK_STATE
        try {
          return buildState(await provider.getStatus())
        } catch {
          return FALLBACK_STATE
        }
      },
    },
  ],

  methods: {
    play: wrap(async () => {
      await provider?.play()
    }),
    pause: wrap(async () => {
      await provider?.pause()
    }),
    toggle: wrap(async () => {
      await provider?.toggle()
    }),
    next: wrap(async () => {
      await provider?.next()
    }),
    previous: wrap(async () => {
      await provider?.previous()
    }),
    setVolume: wrap(async (...args: readonly unknown[]) => {
      const value = typeof args[0] === "number" ? args[0] : 1
      await provider?.setVolume(value)
    }),
    volumeUp: wrap(async (...args: readonly unknown[]) => {
      const step = typeof args[0] === "number" ? args[0] : 0.05
      await provider?.volumeUp(step)
    }),
    volumeDown: wrap(async (...args: readonly unknown[]) => {
      const step = typeof args[0] === "number" ? args[0] : 0.05
      await provider?.volumeDown(step)
    }),
    toggleMute: wrap(async () => {
      await provider?.toggleMute()
    }),
  },

  onLoad: (ctx: AddonServiceContext) => {
    ctxRef = ctx
    provider = createMediaProvider(process.platform, {
      async run(
        command: string,
        args: readonly string[],
        _options?: { timeoutMs?: number },
      ) {
        const shellCmd =
          args.length === 0
            ? command
            : `${command} ${args.map(shellQuote).join(" ")}`
        return ctx.executor.run(shellCmd)
      },
    })
  },

  onUnload: () => {
    ctxRef = null
    provider = null
  },
}
