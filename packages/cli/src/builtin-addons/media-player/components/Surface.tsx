import { ButtonSurface } from '@/addon/api'
import { Text } from '@/ui'
import { MediaButtonStatus } from '../internal-types'
import { MediaStatusIcon } from './MediaStatusIcon'
import { ProgressBar } from './ProgressBar'

type SurfaceProps = {
  title: string
  artist: string
  source: string
  progress: number
  status: MediaButtonStatus
  time: string
}

export const Surface = (props: SurfaceProps) => {
  const { title, artist, source, progress, status, time } = props
  return (
    <ButtonSurface>
      <div className="flex h-full w-full flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <MediaStatusIcon status={status} />
          </div>
          <Text align="right" size="md" tone="foreground">
            {time}
          </Text>
        </div>

        <div className="flex min-w-0 flex-col gap-0">
          <Text
            align="left"
            fit="ellipsis"
            size="md"
            tone="primary"
            className="font-bold"
          >
            {title}
          </Text>
          <Text align="left" fit="ellipsis" size="sm" tone="foreground">
            {artist}
          </Text>
        </div>

        <ProgressBar
          className="absolute bottom-1 left-0 right-0"
          status={status}
          value={progress}
        />
      </div>
    </ButtonSurface>
  )
}
