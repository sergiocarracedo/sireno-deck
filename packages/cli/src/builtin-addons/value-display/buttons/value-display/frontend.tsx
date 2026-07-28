import { Text } from "@/ui/index"
import { useAddonChannel } from "@/api/react"
import type { AddonFrontendButton } from "@/addon/api"

import type { ConfigSchema } from "./config"

interface ValueEntry {
  readonly label: string
  readonly value: string
  readonly units?: string
}

interface ValuesState {
  readonly byButton: Record<string, ReadonlyArray<ValueEntry>>
}

const ValueDisplayButtonFrontend: AddonFrontendButton<ConfigSchema> = ({
  buttonId,
}) => {
  const { data } = useAddonChannel<ValuesState>("value-display:values")
  const values = data?.byButton[buttonId] ?? []
  if (values.length === 0) {
    return (
      <Text
        size="xs"
        tone="muted"
        typography="mono"
        className="flex h-full w-full items-center justify-center"
        text="Loading…"
      />
    )
  }
  return (
    <span className="flex h-full w-full flex-col items-stretch justify-center gap-0.5 p-1.5">
      {values.slice(0, 4).map((v, i) => (
        <span key={`${v.label}-${i}`} className="flex justify-between gap-2">
          <Text size="xs" tone="muted" fit="ellipsis" text={v.label} />
          <Text
            size="xs"
            tone="fg"
            fit="ellipsis"
            text={
              v.units !== undefined && v.units.length > 0
                ? `${v.value}${v.units}`
                : v.value
            }
          />
        </span>
      ))}
    </span>
  )
}

export default ValueDisplayButtonFrontend
