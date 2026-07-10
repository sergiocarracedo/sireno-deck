import type { AddonGestureEvent } from '@/addon/api'
import { useAddonChannel } from '@/api/react'
import { IconLabelSurface, ProgressBar } from '@/ui/index'
import { useEffect, useRef, useState } from 'react'
import type { MediaPlayerState } from '../../../state'

const PROGRESS_VISIBLE_MS = 10_000

export type VolumeVariant = 'down' | 'up'

interface VolumeButtonFrontendProps {
  readonly variant: VolumeVariant
  readonly gesture?: AddonGestureEvent | null
}

const VolumeButtonFrontend = ({
  variant,
  gesture,
}: VolumeButtonFrontendProps) => {
  const { data } = useAddonChannel<MediaPlayerState>('media:state')
  const volume = data?.volume ?? 0
  const [showProgress, setShowProgress] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (gesture?.gesture !== 'tap') return
    setShowProgress(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(
      () => setShowProgress(false),
      PROGRESS_VISIBLE_MS,
    )
  }, [gesture?.at])

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 relative">
      <IconLabelSurface
        label={variant === 'down' ? 'Vol -' : 'Vol +'}
        source={`icon://${variant === 'down' ? 'volume' : 'volume-2'}`}
      />
      {showProgress && (
        <div className="absolute bottom-0 left-0 right-0 px-1 pb-1">
          <ProgressBar
            value={volume}
            bgColor="bg-primary"
            bgColorAlt="bg-primary/30"
          />
        </div>
      )}
    </div>
  )
}

export default VolumeButtonFrontend
