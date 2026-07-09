import type { AddonFrontendButton } from "@/addon/api"
import { Text } from "@/ui/index"

import { formatDigitalDateTimeLabel } from "../../shared/format"
import { useNow } from "../../shared/use-now"

const INTERVAL_MS = 1000

const DateTimeButtonFrontend: AddonFrontendButton = ({ config }) => {
  const now = useNow(INTERVAL_MS)
  const format = (config as { format?: string }).format ?? "DD/MM/YYYY HH:mm:ss"
  return (
    <span className="flex h-full w-full items-center justify-center">
      <Text size="lg" tone="fg">
        {formatDigitalDateTimeLabel(format, now)}
      </Text>
    </span>
  )
}

export default DateTimeButtonFrontend
