import { useEffect, useState } from "react"
import type { AddonFrontendButton } from "@/addon/api"
import { ChannelRegistry } from "@/api/react/registry"
import { IconLabelProgressSurface } from "@/ui/index"

const BRIGHTNESS_CHANNEL = "sireno:settings:brightness"

const BrightnessDownButtonFrontend: AddonFrontendButton<unknown> = () => {
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const [timeoutId, setTimeoutId] = useState<
    ReturnType<typeof setTimeout> | null
  >(null)

  useEffect(() => {
    const unsub = ChannelRegistry.instance().subscribe<number>(
      BRIGHTNESS_CHANNEL,
      (value) => {
        setProgress(value)
        setVisible(true)
        if (timeoutId !== null) clearTimeout(timeoutId)
        const id = setTimeout(() => setVisible(false), 2000)
        setTimeoutId(id)
      },
    )
    return () => {
      unsub()
      if (timeoutId !== null) clearTimeout(timeoutId)
    }
  }, [timeoutId])

  return (
    <IconLabelProgressSurface
      source="icon://sun-dim"
      label="Darker"
      progress={progress}
      visible={visible}
    />
  )
}

export default BrightnessDownButtonFrontend
