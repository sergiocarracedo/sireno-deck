import type { AddonFrontendButton, AddonGestureEvent } from "@/addon/api"
import { useAddonChannel } from "@/api/react"
import { IconLabelProgressSurface } from "@/ui/index"
import { useEffect, useRef, useState } from "react"

const BRIGHTNESS_CHANNEL = "sireno:settings:brightness"
const PROGRESS_VISIBLE_MS = 2000

export type BrightnessVariant = "down" | "up"

interface BrightnessButtonFrontendProps {
  readonly variant: BrightnessVariant
  readonly gesture?: AddonGestureEvent | null
}

export const BrightnessButtonFrontend = ({
  variant,
  gesture,
}: BrightnessButtonFrontendProps) => {
  const { data } = useAddonChannel<{ value: number }>(BRIGHTNESS_CHANNEL)
  const progress = typeof data?.value === "number" ? data.value : 0
  const [showProgress, setShowProgress] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (gesture?.gesture !== "tap" && gesture?.gesture !== "dbl-tap") return
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
      source={`icon://${variant === "down" ? "sun-dim" : "sun"}`}
      label={variant === "down" ? "Darker" : "Lighter"}
      progress={progress}
      visible={showProgress}
    />
  )
}

export default BrightnessButtonFrontend as AddonFrontendButton<unknown>