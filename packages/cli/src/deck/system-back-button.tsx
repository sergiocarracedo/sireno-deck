import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { useRef, type ReactElement } from 'react'

import { ButtonSurface } from '../addon/api.js'
import { Icon, Text } from '../ui/index.js'

const LOGO_DATA_URL = `data:image/png;base64,${readFileSync(
  fileURLToPath(new URL('../assets/logo72x72.png', import.meta.url)),
).toString('base64')}`

const { version: CLI_VERSION } = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../package.json', import.meta.url)),
    'utf8',
  ),
)

const HOLD_THRESHOLD_MS = 600

interface SystemBackButtonProps {
  isMainDeck: boolean
  onTap: () => void
  onHold: () => void
  backIconOverride?: string
}

export function SystemBackButton(props: SystemBackButtonProps): ReactElement {
  const { isMainDeck, onTap, onHold, backIconOverride } = props
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const holdTriggeredRef = useRef(false)

  if (isMainDeck) {
    return (
      <ButtonSurface full>
        <div className="flex h-full w-full flex-col items-center justify-center gap-0.5">
          <img
            alt="Sireno Deck"
            className="shrink-0"
            src={LOGO_DATA_URL}
            style={{ height: 48, width: 48 }}
          />
          <Text size="xs" tone="foreground">
            v{CLI_VERSION}
          </Text>
        </div>
      </ButtonSurface>
    )
  }

  const onPointerDown = () => {
    holdTriggeredRef.current = false
    holdTimerRef.current = setTimeout(() => {
      holdTriggeredRef.current = true
      onHold()
    }, HOLD_THRESHOLD_MS)
  }

  const onPointerUp = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
    if (!holdTriggeredRef.current) {
      onTap()
    }
  }

  return (
    <ButtonSurface>
      <button
        className="flex h-full w-full items-center justify-center gap-1"
        data-sireno-system-back="true"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        type="button"
      >
        <Icon icon={backIconOverride ?? 'chevron-left'} size={16} />
        <Text size="sm" tone="foreground">
          Back
        </Text>
      </button>
    </ButtonSurface>
  )
}
