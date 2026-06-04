import { useRef, type ReactElement } from 'react'

import { ButtonSurface } from '../addon/api.js'
import { Icon, Text } from '../ui/index.js'

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
      <ButtonSurface>
        <div className="flex h-full w-full items-center justify-center">
          <Text
            className="opacity-30"
            size="xs"
            tone="foreground"
          >
            Home
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
