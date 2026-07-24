import type { AddonFrontendButton } from "@/addon/api"
import { Text } from "@/ui/index"

import { formatDigitalDateTimeLabel } from "../../shared/format"
import { useNow } from "../../shared/use-now"
import { ConfigSchema } from "./config"

const INTERVAL_MS = 1000

const DateTimeButtonFrontend: AddonFrontendButton<ConfigSchema> = ({
  config,
}) => {
  const now = useNow(INTERVAL_MS)
  const format = (config as { format?: string }).format ?? "DD/MM/YYYY HH:mm:ss"
  return (
    <span className="flex h-full w-full items-center justify-center">
      <Text
        size="lg"
        tone="fg"
        text={formatDigitalDateTimeLabel(format, now)}
      />
    </span>
  )
}

export default DateTimeButtonFrontend
