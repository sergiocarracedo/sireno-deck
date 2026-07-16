import type { AddonFrontendButton } from "@/addon/api"
import { useAddonChannel } from "@/api/react"
import { IconLabelProgressSurface } from "@/ui/index"

const BRIGHTNESS_CHANNEL = "sireno:settings:brightness"

export type BrightnessVariant = "down" | "up"

interface BrightnessButtonFrontendProps {
  readonly variant: BrightnessVariant
}

export const BrightnessButtonFrontend = ({
  variant,
}: BrightnessButtonFrontendProps) => {
  const { data } = useAddonChannel<{ value: number }>(BRIGHTNESS_CHANNEL)
  const progress = typeof data?.value === "number" ? data.value : 0
  const visible = data !== undefined

  return (
    <IconLabelProgressSurface
      source={`icon://${variant === "down" ? "sun-dim" : "sun"}`}
      label={variant === "down" ? "Darker" : "Lighter"}
      progress={progress}
      visible={visible}
    />
  )
}

export default BrightnessButtonFrontend as AddonFrontendButton<unknown>
