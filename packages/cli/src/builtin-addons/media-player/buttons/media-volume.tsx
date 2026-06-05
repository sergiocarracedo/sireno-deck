import { ButtonSurface, defineMountedButton } from '../../../addon/api.js'
import { Bars, Icon, Text } from '../../../ui/index.js'
import {
  createMediaVolumeController,
  createUnavailableMediaVolumeSnapshot,
  type MediaVolumeSnapshot,
} from '../domain/media-volume-controller.js'
import { MediaVolumeButtonSchema } from '../schemas.js'

const STEP = 5
const HOLD_MS = 600

function renderVolumeSurface(
  variant: 'up' | 'down',
  snap: MediaVolumeSnapshot,
) {
  const arrow = variant === 'up' ? '▲' : '▼'
  const isMuted = snap.muted
  const mutedOverlay = isMuted ? ' (Muted)' : ''
  return (
    <ButtonSurface full>
      <div className="flex h-full w-full flex-col items-center justify-center gap-1">
        <Icon
          icon={variant === 'up' ? 'volume-1' : 'volume-1'}
          size={22}
          tone={isMuted ? 'danger' : 'foreground'}
        />
        <Text size="md" tone="primary">
          {arrow} {snap.percentage}%{mutedOverlay}
        </Text>
        <Bars
          className="w-3/4"
          items={[
            {
              color: 'var(--sireno-color-primary)',
              maxValue: 100,
              title: 'vol',
              value: isMuted ? 0 : snap.percentage,
            },
          ]}
        />
      </div>
    </ButtonSurface>
  )
}

type VolumeStoreState = {
  holdStartedAt?: number
  snapshot: MediaVolumeSnapshot
}

function getState(snapshot: unknown): VolumeStoreState {
  return typeof snapshot === 'object' && snapshot !== null
    ? (snapshot as VolumeStoreState)
    : { snapshot: createUnavailableMediaVolumeSnapshot('init') }
}

export const builtinMediaVolumeButton = defineMountedButton({
  configSchema: MediaVolumeButtonSchema,
  defaultIntervalMs: ({ config }) => config.render_interval_ms,
  defaultPollIntervalMs: ({ config }) => config.poll_interval_ms,
  onActivate: async ({ hostContext, store }) => {
    const controller = createMediaVolumeController({ hostContext })
    try {
      const snap = await controller.getSnapshot()
      store.button.set({ snapshot: snap } as VolumeStoreState)
    } catch {
      store.button.set({
        snapshot: createUnavailableMediaVolumeSnapshot('init'),
      } as VolumeStoreState)
    }
  },
  onTap: async ({ config, hostContext, methods, store }) => {
    const controller = createMediaVolumeController({ hostContext })
    const delta = config.variant === 'up' ? STEP : -STEP
    await controller.setVolume(delta)
    const snap = await controller.getSnapshot()
    store.button.set({ snapshot: snap } as VolumeStoreState)
    methods.invalidate()
  },
  onPress: ({ store }) => {
    store.button.update((current) => {
      const state = getState(current)
      return {
        ...state,
        holdStartedAt: Date.now(),
      } as VolumeStoreState
    })
  },
  onRelease: ({ hostContext, methods, store }) => {
    const state = getState(store.button.snapshot)
    const startedAt = state.holdStartedAt
    if (startedAt && Date.now() - startedAt >= HOLD_MS) {
      const controller = createMediaVolumeController({ hostContext })
      void controller.getMuted().then(async (currentMuted) => {
        await controller.setMuted(!currentMuted)
        const snap = await controller.getSnapshot()
        store.button.set({ snapshot: snap } as VolumeStoreState)
        methods.invalidate()
      })
    }
  },
  poll: async ({ hostContext, store }) => {
    const controller = createMediaVolumeController({ hostContext })
    try {
      const snap = await controller.getSnapshot()
      store.button.set({ snapshot: snap } as VolumeStoreState)
    } catch {
      // keep last snapshot
    }
  },
  render: ({ config, store }) => {
    const state = getState(store.button.snapshot)
    return renderVolumeSurface(config.variant, state.snapshot)
  },
  type: 'media-volume',
})
