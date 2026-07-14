import { formatTime } from "@/builtin-addons/media/progress"
import { Text } from "@/ui/index"
import type { ReactElement } from "react"
import { MediaStatusIcon } from "./MediaStatus"
import { ProgressBar } from "./ProgressBar"
import { type MediaButtonStatus } from "./status-meta"

interface MediaSurfaceProps {
  title: string
  artist: string
  source: string
  progress: number
  status: MediaButtonStatus
  currentTime: number
  totalTime: number
}

export const MediaSurface = ({
  title,
  artist,
  source: _source,
  progress,
  status,
  currentTime,
}: MediaSurfaceProps): ReactElement => {
  return (
    <div className="flex h-full w-full flex-col relative gap-1">
      <div className="flex items-center justify-between gap-2 mb-1">
        <MediaStatusIcon status={status} />
        <Text align="right" size="lg" tone="primary" weight="bold" text={formatTime(currentTime)} />
      </div>

      <Text align="left" fit="ellipsis" size="md" tone="fg" weight="bold" text={title} />
      <Text align="left" fit="ellipsis" size="sm" tone="muted" text={artist} />
      <div className="flex-1"></div>
      <ProgressBar status={status} value={progress} className="mb-1" />
    </div>
  )
}
