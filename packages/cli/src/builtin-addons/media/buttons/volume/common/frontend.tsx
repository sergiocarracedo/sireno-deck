import type { AddonGestureEvent } from "@/addon/api"
import { useAddonChannel } from "@/api/react"
import { IconLabelProgressSurface } from "@/ui/index"
import { useEffect, useRef, useState } from "react"
import type { MediaPlayerState } from "../../../state"

const PROGRESS_VISIBLE_MS = 2000

export type VolumeVariant = "down" | "up"

interface VolumeButtonFrontendProps {
  readonly variant: VolumeVariant
  readonly gesture?: AddonGestureEvent | null
}

const VolumeButtonFrontend = ({
  variant,
  gesture,
}: VolumeButtonFrontendProps) => {
  const { data } = useAddonChannel<MediaPlayerState>("media:state")
  const volume = data?.volume ?? 0
  const [showProgress, setShowProgress] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (gesture?.gesture !== "tap") return
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
    <IconLabelProgressSurface
      source={`icon://${variant === "down" ? "volume" : "volume-2"}`}
      label={variant === "down" ? "Vol -" : "Vol +"}
      progress={volume}
      visible={showProgress}
    />
  )
}

export default VolumeButtonFrontend
