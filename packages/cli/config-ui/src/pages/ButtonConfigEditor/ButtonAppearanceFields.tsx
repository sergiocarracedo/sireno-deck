import type { ReactNode } from "react"

import { Description, Fieldset, Label, ListBox, Select } from "@heroui/react"

import { ButtonActionsEditor } from "../../components/ButtonActionsEditor"
import type { ButtonAppearance, ButtonThemeVariant } from "./types"

export const ButtonAppearanceFields = ({
  value,
  variants,
  positionControl,
  ownedGestures,
  onChange,
}: {
  readonly value: ButtonAppearance
  readonly variants: Readonly<Record<string, ButtonThemeVariant>>
  readonly positionControl: ReactNode
  readonly ownedGestures?: readonly ("tap" | "dbl-tap" | "hold")[]
  readonly onChange: (value: ButtonAppearance) => void
}) => (
  <Fieldset className="grid min-w-0 gap-2 rounded-lg border border-separator bg-surface-secondary p-2">
    <Fieldset.Legend className="px-1 text-sm font-medium">
      Button appearance
    </Fieldset.Legend>
    <div className="grid min-w-0 grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-[auto_repeat(3,minmax(0,1fr))]">
      {positionControl}
      <Select
        className="grid min-w-0 grid-cols-[minmax(min(10rem,42%),0.85fr)_minmax(0,1.15fr)] items-center gap-2"
        variant="secondary"
        aria-label="Theme variant"
        selectedKey={value.variant || "default"}
        onSelectionChange={(key) =>
          onChange({
            ...value,
            variant: String(key) === "default" ? "" : String(key),
          })
        }
      >
        <Label className="min-w-0 break-words">Theme variant</Label>
        <Select.Trigger className="w-full min-w-0 border border-separator bg-field-background">
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {Object.entries(variants).map(([name, colors]) => (
              <ListBox.Item key={name} id={name} textValue={name}>
                <span
                  aria-hidden="true"
                  className="size-4 shrink-0 rounded-full border"
                  style={{
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.foreground,
                  }}
                />
                {name}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
        {value.variant !== "" && variants[value.variant] !== undefined && (
          <Description
            className="col-span-full h-2 rounded-full"
            style={{ backgroundColor: variants[value.variant]!.background }}
          />
        )}
      </Select>
    </div>
    <ButtonActionsEditor
      value={value.actions}
      ownedGestures={ownedGestures}
      onChange={(actions) => onChange({ ...value, actions })}
    />
  </Fieldset>
)
