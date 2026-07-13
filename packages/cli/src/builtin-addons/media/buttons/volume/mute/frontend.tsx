import type { AddonFrontendButton } from "@/addon/api"
import { useAddonChannel } from "@/api/react"
import { IconLabelSurface } from "@/ui/index"
import type { MediaPlayerState } from "../../../state"

const MuteButtonFrontend: AddonFrontendButton<Record<string, never>> = () => {
  const { data } = useAddonChannel<MediaPlayerState>("media:state")
  const volume = data?.volume ?? 0
  const muted = data?.muted ?? false

  const isMuted = muted || volume === 0

  const iconName = isMuted ? "volume-off" : "volume-2"

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 relative">
      <IconLabelSurface
        key={iconName}
        label="Mute"
        source={`icon://${iconName}`}
      />
    </div>
  )
}

export default MuteButtonFrontend
