import { ButtonSurface, defineMountedButton } from '../../addon/api.js'
import { Text } from '../../ui/index.js'
import { MediaStatusIcon } from './components/MediaStatus.js'
import { ProgressBar } from './components/ProgressBar.js'
import {
  createMediaController,
  createUnavailableMediaSnapshot,
  type MediaController,
  type MediaControllerSnapshot,
  type MediaPlaybackStatus,
} from './domain/media-controller.js'
import { MediaPlayerButtonSchema } from './schemas.js'

const HOLD_ACTION_DELAY_MS = 600

type MediaPlayerButtonStoreState = {
  controller?: MediaController
  holdTimer?: ReturnType<typeof globalThis.setTimeout>
  holdTriggered?: boolean
  snapshot?: MediaControllerSnapshot
}

interface MediaPlayerPollPayload {
  snapshot: MediaControllerSnapshot
}

function getButtonStoreState(snapshot: unknown): MediaPlayerButtonStoreState {
  return typeof snapshot === 'object' && snapshot !== null
    ? (snapshot as MediaPlayerButtonStoreState)
    : {}
}

function clearHoldTimer(snapshot: unknown): MediaPlayerButtonStoreState {
  const state = getButtonStoreState(snapshot)
  if (state.holdTimer) {
    globalThis.clearTimeout(state.holdTimer)
  }

  return {
    ...state,
    holdTimer: undefined,
  }
}

function getStatusLabel(
  status: MediaPlaybackStatus | undefined,
  available: boolean,
): string {
  if (!available) {
    return 'OFFLINE'
  }

  switch (status) {
    case 'pause':
      return 'PAUSED'
    case 'play':
      return 'PLAYING'
    case 'stop':
      return 'STOPPED'
    default:
      return 'OFFLINE'
  }
}

function getProgressColor(
  status: MediaPlaybackStatus | undefined,
  available: boolean,
): string {
  if (!available) {
    return '#6b7280'
  }

  switch (status) {
    case 'pause':
      return '#cdb4db'
    case 'play':
      return '#8ecae6'
    case 'stop':
      return '#94a3b8'
    default:
      return '#6b7280'
  }
}

async function refreshSnapshot(
  controller: MediaController,
  store: {
    button: { update: (updater: (snapshot: unknown) => unknown) => void }
  },
): Promise<MediaControllerSnapshot> {
  const snapshot = await controller.getSnapshot()
  store.button.update((currentSnapshot) => ({
    ...getButtonStoreState(currentSnapshot),
    snapshot,
  }))

  return snapshot
}

function getOrCreateController(
  snapshot: unknown,
  hostContext: Parameters<typeof createMediaController>[0]['hostContext'],
): MediaController {
  return (
    getButtonStoreState(snapshot).controller ??
    createMediaController({ hostContext })
  )
}

const builtinMediaPlayerButton = defineMountedButton({
  configSchema: MediaPlayerButtonSchema,
  defaultPollIntervalMs: ({ config }) => config.poll_interval_ms,
  defaultRenderIntervalMs: ({ config }) => config.render_interval_ms,
  dispose: ({ store }) => {
    store.button.set(clearHoldTimer(store.button.snapshot))
  },
  onActivate: async ({ hostContext, store }) => {
    const controller = getOrCreateController(store.button.snapshot, hostContext)
    const snapshot = await controller.getSnapshot()

    store.button.update((currentSnapshot) => ({
      ...getButtonStoreState(currentSnapshot),
      controller,
      snapshot,
    }))
  },
  onPress: ({ config, methods, store }) => {
    if (!config.hold_command) {
      return
    }

    store.button.update((snapshot) => {
      const nextState = clearHoldTimer(snapshot)
      const holdTimer = globalThis.setTimeout(() => {
        void methods.runCommand(config.hold_command!)
        store.button.update((currentSnapshot) => ({
          ...clearHoldTimer(currentSnapshot),
          holdTriggered: true,
        }))
        methods.invalidate()
      }, HOLD_ACTION_DELAY_MS)

      return {
        ...nextState,
        holdTimer,
        holdTriggered: false,
      }
    })
  },
  onRelease: ({ store }) => {
    store.button.set(clearHoldTimer(store.button.snapshot))
  },
  onTap: async ({ hostContext, methods, store }) => {
    const state = getButtonStoreState(store.button.snapshot)
    if (state.holdTriggered) {
      store.button.update((snapshot) => ({
        ...clearHoldTimer(snapshot),
        holdTriggered: false,
      }))
      return
    }

    const controller = getOrCreateController(store.button.snapshot, hostContext)
    await controller.togglePlayPause()
    await refreshSnapshot(controller, store)
    methods.invalidate()
  },
  poll: async ({ hostContext, store }): Promise<MediaPlayerPollPayload> => {
    const controller = getOrCreateController(store.button.snapshot, hostContext)
    const snapshot = await refreshSnapshot(controller, store)

    return { snapshot }
  },
  render: ({ config, payload, store }) => {
    const state = getButtonStoreState(store.button.snapshot)
    const snapshot =
      payload?.snapshot ??
      state.snapshot ??
      createUnavailableMediaSnapshot('media-controller-unavailable')
    const title = snapshot.title ?? config.unavailable_label ?? 'Unavailable'
    const artist =
      snapshot.artist ??
      (snapshot.available ? 'Unknown artist' : 'No active player')
    const source = snapshot.app ?? snapshot.source
    const progress = snapshot.available ? (snapshot.percentage ?? 0) : 0

    const localStatus = snapshot.available ? snapshot.status : 'unavailable'

    return (
      <ButtonSurface>
        <div className="flex h-full w-full flex-col gap-0.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <MediaStatusIcon status={localStatus} />
            </div>
            <Text align="right" fit="ellipsis" size="xs" tone="foreground">
              {source}
            </Text>
          </div>

          <div className="flex min-w-0 flex-col gap-0.5">
            <Text align="left" fit="marquee" size="md" tone="primary">
              {title}
            </Text>
            <Text align="left" fit="marquee" size="sm" tone="foreground">
              {artist}
            </Text>
          </div>

          <ProgressBar
            className="absolute bottom-1 left-0 right-0"
            status={localStatus}
            value={progress}
          />
        </div>
      </ButtonSurface>
    )
  },
  type: 'media-player',
})

export { builtinMediaPlayerButton }
