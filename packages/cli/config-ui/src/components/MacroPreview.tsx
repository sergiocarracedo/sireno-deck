import { Kbd } from "@heroui/react"

import { parseMacro } from "@/deck/macro-parse"

export const MacroPreview = ({ value }: { readonly value: string }) => {
  if (!value.trim()) return null
  return (
    <div aria-label="Keyboard macro preview" className="flex flex-wrap gap-1">
      {parseMacro(value).map((step, index) => (
        <Kbd key={`${step.kind}-${index}`} variant="light">
          <Kbd.Content>
            {step.kind === "delay"
              ? `delay(${step.ms}ms)`
              : step.kind === "text"
                ? JSON.stringify(step.value)
                : step.value}
          </Kbd.Content>
        </Kbd>
      ))}
    </div>
  )
}
