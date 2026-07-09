import { Text } from "@/ui/index"
import { useAddonChannel } from "@/api/react"
import type { AddonFrontendButton } from "@/addon/api"

interface ValueEntry {
  readonly label: string
  readonly value: string
  readonly units?: string
}

interface ValuesState {
  readonly values: ReadonlyArray<ValueEntry>
}

const ValueDisplayButtonFrontend: AddonFrontendButton = () => {
  const { data } = useAddonChannel<ValuesState>("value-display:values")
  const values = data?.values ?? []
  if (values.length === 0) {
    return (
      <Text
        size="xs"
        tone="muted"
        typography="mono"
        className="flex h-full w-full items-center justify-center"
      >
        Loading…
      </Text>
    )
  }
  return (
    <span className="flex h-full w-full flex-col items-stretch justify-center gap-0.5 p-1.5">
      {values.slice(0, 4).map((v, i) => (
        <span key={`${v.label}-${i}`} className="flex justify-between gap-2">
          <Text size="xs" tone="muted" fit="ellipsis">
            {v.label}
          </Text>
          <Text size="xs" tone="fg" fit="ellipsis">
            {v.value}
            {v.units !== undefined && v.units.length > 0 ? v.units : ""}
          </Text>
        </span>
      ))}
    </span>
  )
}

export default ValueDisplayButtonFrontend
