import { useState } from "react"

import { Button, TextField } from "@heroui/react"

import { EmojiPicker } from "../../../components/EmojiPicker"
import { FormFieldParts } from "../FormFieldParts"
import type { ControlProps } from "../types"

const CONTROL_ROW_CLASS =
  "grid min-w-0 grid-cols-[minmax(min(10rem,42%),0.85fr)_minmax(0,1.15fr)] items-center gap-x-3 gap-y-1"

export const EmojiControl = ({
  value,
  path,
  label,
  description,
  error,
  onChange,
}: ControlProps) => {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(typeof value === "string" ? value : "")

  return (
    <TextField className={CONTROL_ROW_CLASS}>
      <FormFieldParts label={label} description={description} error={error}>
        <Button
          type="button"
          variant="tertiary"
          className="w-full justify-start"
          onPress={() => {
            setDraft(typeof value === "string" ? value : "")
            setOpen(true)
          }}
        >
          {typeof value === "string" && value !== "" ? value : "Choose emoji"}
        </Button>
      </FormFieldParts>
      {open && (
        <dialog
          open
          aria-label={`Choose ${label}`}
          className="fixed inset-0 z-50 m-auto max-h-[85vh] w-[min(36rem,calc(100vw-2rem))] overflow-auto rounded-xl border border-separator bg-overlay p-4 text-overlay-foreground shadow-2xl"
        >
          <h3 className="mb-3 font-semibold">Choose {label}</h3>
          <EmojiPicker value={draft} onSelect={setDraft} />
          <div className="mt-3 flex justify-end gap-2 border-t border-separator pt-3">
            <Button
              type="button"
              variant="tertiary"
              onPress={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              isDisabled={draft === ""}
              onPress={() => {
                onChange(path, draft)
                setOpen(false)
              }}
            >
              Apply
            </Button>
          </div>
        </dialog>
      )}
    </TextField>
  )
}
