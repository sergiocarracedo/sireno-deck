import { defineMountedButton } from '@/addon/api'
import type { ThemeMediaPlayerSurface } from '@/config/theme/schemas'
import { Surface } from './components/Surface'
import {
  createMediaController,
  createUnavailableMediaSnapshot,
  type MediaController,
  type MediaControllerSnapshot,
} from './domain/media-controller'
import type { MediaButtonStatus } from './internal-types'
import { MediaPlayerButtonSchema } from './schemas'

type MediaPlayerButtonStoreState = {
  controller?: MediaController
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

function formatTimeLabel(snapshot: MediaControllerSnapshot): string {
  if (!snapshot.available || snapshot.positionSeconds === undefined) {
    return ''
  }

  const totalSeconds = Math.max(0, Math.floor(snapshot.positionSeconds))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

interface CreateMediaPlayerButtonOptions {
  surface?: ThemeMediaPlayerSurface
}

function createMediaPlayerButton(options: CreateMediaPlayerButtonOptions = {}) {
  const renderSurface = options.surface ?? Surface

  return defineMountedButton({
    configSchema: MediaPlayerButtonSchema,
    defaultPollIntervalMs: ({ config }) => config.poll_interval_ms,
    defaultRenderIntervalMs: ({ config }) => config.render_interval_ms,
    dispose: ({ store }) => {
      store.button.set(undefined)
    },
    onActivate: async ({ hostContext, store }) => {
      const controller = getOrCreateController(
        store.button.snapshot,
        hostContext,
      )
      const snapshot = await controller.getSnapshot()

      store.button.update((currentSnapshot) => ({
        ...getButtonStoreState(currentSnapshot),
        controller,
        snapshot,
      }))
    },
    onHold: async ({ config, methods }) => {
      if (config.hold_command) {
        await methods.runCommand(config.hold_command)
      }
    },
    onTap: async ({ hostContext, methods, store }) => {
      const controller = getOrCreateController(
        store.button.snapshot,
        hostContext,
      )
      await controller.togglePlayPause()
      await refreshSnapshot(controller, store)
      methods.invalidate()
    },
    poll: async ({ hostContext, store }): Promise<MediaPlayerPollPayload> => {
      const controller = getOrCreateController(
        store.button.snapshot,
        hostContext,
      )
      const snapshot = await refreshSnapshot(controller, store)

      return { snapshot }
    },
    render: ({ config, payload, store }) => {
      const state = getButtonStoreState(store.button.snapshot)
      const snapshot =
        payload?.snapshot ??
        state.snapshot ??
        createUnavailableMediaSnapshot('media-controller-unavailable')
      const title = snapshot.title ?? '...'
      const artist =
        snapshot.artist ?? (snapshot.available ? '...' : 'No active player')
      const source = snapshot.app ?? snapshot.source ?? ''
      const progress = snapshot.available ? (snapshot.percentage ?? 0) : 0
      const status: MediaButtonStatus = snapshot.available
        ? (snapshot.status ?? 'notAvailable')
        : 'notAvailable'
      const time = formatTimeLabel(snapshot)

      return renderSurface({
        artist,
        progress,
        source,
        status,
        time,
        title,
      })
    },
    type: 'media-player',
  })
}

export { createMediaPlayerButton }
