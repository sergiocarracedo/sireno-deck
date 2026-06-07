import { ButtonSurface, defineMountedButton } from '@/addon/api'
import { Icon, Text } from '@/ui/index'
import {
  createMediaVolumeController,
  createUnavailableMediaVolumeSnapshot,
  type MediaVolumeSnapshot,
} from '../domain/media-volume-controller'
import { MediaMuteButtonSchema } from '../schemas'

function renderMuteSurface(snap: MediaVolumeSnapshot) {
  return (
    <ButtonSurface full>
      <div className="flex h-full w-full flex-col items-center justify-center gap-1">
        <Icon
          icon={snap.muted ? 'volume-x' : 'volume-2'}
          size={28}
          tone={snap.muted ? 'danger' : 'foreground'}
        />
        <Text size="xs" tone={snap.muted ? 'danger' : 'foreground'}>
          {snap.muted ? 'Muted' : 'Audio'}
        </Text>
      </div>
    </ButtonSurface>
  )
}

type MuteStoreState = {
  snapshot: MediaVolumeSnapshot
}

function getState(snapshot: unknown): MuteStoreState {
  return typeof snapshot === 'object' && snapshot !== null
    ? (snapshot as MuteStoreState)
    : { snapshot: createUnavailableMediaVolumeSnapshot('init') }
}

export const builtinMediaMuteButton = defineMountedButton({
  configSchema: MediaMuteButtonSchema,
  defaultIntervalMs: ({ config }) => config.render_interval_ms,
  defaultPollIntervalMs: ({ config }) => config.poll_interval_ms,
  onActivate: async ({ hostContext, store }) => {
    const controller = createMediaVolumeController({ hostContext })
    try {
      const snap = await controller.getSnapshot()
      store.button.set({ snapshot: snap } as MuteStoreState)
    } catch {
      store.button.set({
        snapshot: createUnavailableMediaVolumeSnapshot('init'),
      } as MuteStoreState)
    }
  },
  onHold: async ({ hostContext, methods, store }) => {
    const controller = createMediaVolumeController({ hostContext })
    const current = getState(store.button.snapshot).snapshot
    await controller.setMuted(!current.muted)
    const snap = await controller.getSnapshot()
    store.button.set({ snapshot: snap } as MuteStoreState)
    methods.invalidate()
  },
  onTap: async ({ hostContext, methods, store }) => {
    const controller = createMediaVolumeController({ hostContext })
    const current = getState(store.button.snapshot).snapshot
    const ok = await controller.setMuted(!current.muted)
    if (ok) {
      const snap = await controller.getSnapshot()
      store.button.set({ snapshot: snap } as MuteStoreState)
    }
    methods.invalidate()
  },
  poll: async ({ hostContext, store }) => {
    const controller = createMediaVolumeController({ hostContext })
    try {
      const snap = await controller.getSnapshot()
      store.button.set({ snapshot: snap } as MuteStoreState)
    } catch {
      // keep last snapshot
    }
  },
  render: ({ store }) => {
    const state = getState(store.button.snapshot)
    return renderMuteSurface(state.snapshot)
  },
  type: 'media-mute',
})
