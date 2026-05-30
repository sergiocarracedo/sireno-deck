import type { ReactElement } from 'react'

import { ButtonSurface, defineMountedButton } from '../../addon/api.js'
import {
  createMediaController,
  createUnavailableMediaSnapshot,
  type MediaController,
  type MediaControllerSnapshot,
  type MediaPlaybackStatus,
} from '../../system/media-controller.js'
import { Bars, Text } from '../../ui/index.js'
import {
  MediaPlayerButtonSchema,
  type MediaPlayerButtonConfig,
} from './schemas.js'

const HOLD_ACTION_DELAY_MS = 600

type MediaPlayerButtonStoreState = {
  controller?: MediaController
  holdTimer?: ReturnType<typeof globalThis.setTimeout>
  holdTriggered?: boolean
  snapshot?: MediaControllerSnapshot
}

function getButtonStoreState(snapshot: unknown): MediaPlayerButtonStoreState {
  return typeof snapshot === 'object' && snapshot !== null
    ? snapshot as MediaPlayerButtonStoreState
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

function getStatusLabel(status: MediaPlaybackStatus | undefined, available: boolean): string {
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

function getProgressColor(status: MediaPlaybackStatus | undefined, available: boolean): string {
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

function MediaStatusIcon(props: {
  available: boolean
  status?: MediaPlaybackStatus
}): ReactElement {
  const stroke = props.available ? '#eef2f7' : '#94a3b8'
  const fill = props.available ? '#8ecae6' : '#6b7280'

  if (!props.available) {
    return (
      <svg
        aria-hidden="true"
        data-sireno-media-status="unsupported"
        fill="none"
        height="16"
        viewBox="0 0 24 24"
        width="16"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12 4.5 20 19H4L12 4.5Z" stroke={stroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        <path d="M12 9.5v4.5" stroke={stroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        <circle cx="12" cy="16.75" fill={stroke} r="0.9" />
      </svg>
    )
  }

  if (props.status === 'pause') {
    return (
      <svg
        aria-hidden="true"
        data-sireno-media-status="pause"
        fill="none"
        height="16"
        viewBox="0 0 24 24"
        width="16"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect fill={fill} height="12" rx="1.5" width="4" x="6" y="6" />
        <rect fill={fill} height="12" rx="1.5" width="4" x="14" y="6" />
      </svg>
    )
  }

  if (props.status === 'stop') {
    return (
      <svg
        aria-hidden="true"
        data-sireno-media-status="stop"
        fill="none"
        height="16"
        viewBox="0 0 24 24"
        width="16"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect fill={fill} height="12" rx="2" width="12" x="6" y="6" />
      </svg>
    )
  }

  return (
    <svg
      aria-hidden="true"
      data-sireno-media-status="play"
      fill="none"
      height="16"
      viewBox="0 0 24 24"
      width="16"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M8 6.5v11l8-5.5-8-5.5Z" fill={fill} stroke={stroke} strokeLinejoin="round" strokeWidth="1.2" />
    </svg>
  )
}

async function refreshSnapshot(
  controller: MediaController,
  store: { button: { update: (updater: (snapshot: unknown) => unknown) => void } },
) {
  const snapshot = await controller.getSnapshot()
  store.button.update((currentSnapshot) => ({
    ...getButtonStoreState(currentSnapshot),
    snapshot,
  }))
}

function getOrCreateController(
  snapshot: unknown,
  hostContext: Parameters<typeof createMediaController>[0]['hostContext'],
): MediaController {
  return getButtonStoreState(snapshot).controller ?? createMediaController({ hostContext })
}

const builtinMediaPlayerButton = defineMountedButton({
  configSchema: MediaPlayerButtonSchema,
  defaultIntervalMs: 1_000,
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
  refresh: async ({ hostContext, store }) => {
    const controller = getOrCreateController(store.button.snapshot, hostContext)
    await refreshSnapshot(controller, store)
  },
  render: ({ config, store }) => {
    const state = getButtonStoreState(store.button.snapshot)
    const snapshot = state.snapshot ?? createUnavailableMediaSnapshot('media-controller-unavailable')
    const statusLabel = getStatusLabel(snapshot.status, snapshot.available)
    const title = snapshot.title ?? config.unavailable_label ?? 'Unavailable'
    const artist = snapshot.artist ?? (snapshot.available ? 'Unknown artist' : 'No active player')
    const source = snapshot.app ?? snapshot.source
    const progress = snapshot.available ? snapshot.percentage ?? 0 : 0

    return (
      <ButtonSurface>
        <div className="flex h-full w-full flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: snapshot.available
                    ? 'rgba(142, 202, 230, 0.18)'
                    : 'rgba(148, 163, 184, 0.18)',
                }}
              >
                <MediaStatusIcon available={snapshot.available} status={snapshot.status} />
              </div>
              <Text align="left" fit="ellipsis" size="xs" tone="accent">{statusLabel}</Text>
            </div>
            <Text align="right" fit="ellipsis" size="xs" tone="foreground">{source}</Text>
          </div>

          <div className="flex min-w-0 flex-col gap-0.5">
            <Text align="left" fit="marquee" size="sm" tone="foreground">{title}</Text>
            <Text align="left" fit="marquee" size="xs" tone="primary">{artist}</Text>
          </div>

          <Bars
            items={[
              {
                color: getProgressColor(snapshot.status, snapshot.available),
                maxValue: 100,
                title: statusLabel,
                value: progress,
              },
            ]}
          />
        </div>
      </ButtonSurface>
    )
  },
  type: 'media-player',
})

export { builtinMediaPlayerButton }
