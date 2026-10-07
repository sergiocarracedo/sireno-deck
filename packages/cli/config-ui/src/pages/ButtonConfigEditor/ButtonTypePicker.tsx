import { useState } from "react"

import { Button, Header, Input, Label, TextField } from "@heroui/react"

export interface ButtonTypeOption {
  readonly addon: string
  readonly type: string
  readonly defaultConfig?: unknown
  readonly gestureHandlers?: Array<"tap" | "dbl-tap" | "hold">
}

const CONTROL_ROW_CLASS =
  "grid min-w-0 grid-cols-[minmax(min(10rem,42%),0.85fr)_minmax(0,1.15fr)] items-center gap-x-3 gap-y-1"

export const ButtonTypePicker = ({
  options,
  value,
  label,
  onSelect,
}: {
  readonly options: readonly ButtonTypeOption[]
  readonly value?: string
  readonly label: string
  readonly onSelect: (type: ButtonTypeOption) => void
}) => {
  const [query, setQuery] = useState<string | null>(null)
  const groups = [...new Set(options.map((option) => option.addon))]
    .map((addon) => ({
      addon,
      options: options.filter(
        (option) =>
          option.addon === addon &&
          `${option.addon} ${option.type}`
            .toLowerCase()
            .includes((query ?? "").toLowerCase()),
      ),
    }))
    .filter((group) => group.options.length > 0)

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <TextField className={CONTROL_ROW_CLASS}>
        <Label className="min-w-0 break-words">{label}</Label>
        <Input
          aria-label={label}
          autoComplete="off"
          placeholder="Search add-ons and button types"
          value={query ?? value ?? ""}
          onChange={(event) => setQuery(event.target.value)}
        />
      </TextField>
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto rounded-lg border border-separator bg-surface-secondary p-1">
        {groups.length === 0 ? (
          <p className="px-2 py-1 text-sm text-muted">
            No matching button types
          </p>
        ) : (
          groups.map(({ addon, options: addonOptions }) => (
            <div key={addon} role="group" aria-label={addon} className="grid">
              <Header className="px-2 py-1 text-xs text-muted">{addon}</Header>
              {addonOptions.map((option) => (
                <Button
                  key={option.type}
                  type="button"
                  size="sm"
                  variant="tertiary"
                  className="justify-start"
                  aria-pressed={option.type === value}
                  onPress={() => onSelect(option)}
                >
                  {option.type}
                </Button>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
