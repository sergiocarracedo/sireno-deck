import type { AddonFrontendButton } from "@/addon/api"
import { Text } from "@/ui/index"
import { ConfigSchema } from "./config"

import { formatDigitalDateTimeLabel } from "../../shared/format"
import { useNow } from "../../shared/use-now"

const INTERVAL_MS = 1000

const TimeButtonFrontend: AddonFrontendButton<ConfigSchema> = ({ config }) => {
  const now = useNow(INTERVAL_MS)
  const variant =
    (config as { variant?: "default" | "big" }).variant ?? "default"
  const format =
    variant === "big"
      ? "<4xl>&nbsp;*HH*<blink>.</blink>|mm</4xl>"
      : "<2xl>*HH*<blink>:</blink>mm</2xl>"
  return (
    <Text
      size={variant === "big" ? "lg" : "md"}
      tone="fg"
      lineHeight="1.6em"
      className="flex h-full w-full items-center justify-center"
    >
      {formatDigitalDateTimeLabel(format, now)}
    </Text>
  )
}

export default TimeButtonFrontend
