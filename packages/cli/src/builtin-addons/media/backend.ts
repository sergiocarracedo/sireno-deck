import {
  AddonBackendContext,
  AddonBackendMethod,
  AddonGlobalBackend,
} from '@/addon'
import { computeProgress } from './progress'
import { createMediaProvider, MediaStatusProvider } from './providers'
import type { MediaPlayerState } from './state'

const FALLBACK_STATE: MediaPlayerState = {
  title: null,
  artist: null,
  source: null,
  status: 'notAvailable',
  isPlaying: false,
  volume: 0,
  progress: 0,
  currentTime: 0,
  totalTime: 0,
  muted: false,
}

let provider: MediaStatusProvider | null = null
let ctxRef: AddonBackendContext | null = null

const mapStatus = (
  playStatus: Awaited<
    ReturnType<MediaStatusProvider['getStatus']>
  >['playStatus'],
): MediaPlayerState['status'] => {
  if (playStatus === 'play' || playStatus === 'pause' || playStatus === 'stop') {
    return playStatus
  }
  // 'unavailable' (provider reachable but no data) → 'notAvailable'.
  return 'notAvailable'
}

const buildState = (
  status: Awaited<ReturnType<MediaStatusProvider['getStatus']>>,
): MediaPlayerState => ({
  title: status.track?.name ?? null,
  artist: status.track?.artist ?? null,
  source: status.track?.album ?? null,
  status: mapStatus(status.playStatus),
  isPlaying: status.playStatus === 'play',
  volume: Math.round(status.volume * 100),
  progress: computeProgress(status.currentTime, status.totalTime),
  currentTime: status.currentTime,
  totalTime: status.totalTime,
  muted: status.muted,
})

const wrap = (action: () => Promise<void>): AddonBackendMethod => {
  return async () => {
    await action()
    await ctxRef?.poll('state')
  }
}

export const globalBackend: AddonGlobalBackend = {
  pollers: [
    {
      id: 'state',
      channel: 'media:state',
      intervalMs: 1_000,
      poll: async (_ctx: AddonBackendContext): Promise<MediaPlayerState> => {
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
    setVolume: (() => {
      const fn = wrap(async (...args: readonly unknown[]) => {
        const value = typeof args[0] === 'number' ? args[0] : 1
        await provider?.setVolume(value)
      })
      return fn
    })(),
    volumeUp: (() => {
      const fn = wrap(async (...args: readonly unknown[]) => {
        const step = typeof args[0] === 'number' ? args[0] : 0.05
        await provider?.volumeUp(step)
      })
      return fn
    })(),
    volumeDown: (() => {
      const fn = wrap(async (...args: readonly unknown[]) => {
        const step = typeof args[0] === 'number' ? args[0] : 0.05
        await provider?.volumeDown(step)
      })
      return fn
    })(),
    toggleMute: wrap(async () => {
      await provider?.toggleMute()
    }),
  },

  onLoad: (ctx: AddonBackendContext) => {
    ctxRef = ctx
    provider = createMediaProvider(process.platform, {
      async run(
        command: string,
        args: readonly string[],
        _options?: { timeoutMs?: number },
      ) {
        const fullCommand =
          args.length > 0
            ? `${command} ${args.map((a) => `"${a}"`).join(' ')}`
            : command
        return ctx.executor.run(fullCommand)
      },
    })
  },

onUnload: () => {
    ctxRef = null;
    provider = null;
  },
}
