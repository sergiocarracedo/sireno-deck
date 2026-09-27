import { useState } from "react"
import { Button, Input, Tabs } from "@heroui/react"
import * as lucideIcons from "lucide-react"
import { Icon } from "@sirenodeck/sirenodeck"

import { EmojiPicker } from "./EmojiPicker"

export interface PendingIconAsset {
  readonly filename: string
  readonly data: string
  readonly preview: string
}

let assetNumber = 0

const LUCIDE_ICONS = Object.keys(lucideIcons)
  .filter(
    (name) =>
      /^[A-Z]/.test(name) &&
      name !== "createLucideIcon" &&
      !name.endsWith("Icon") &&
      !name.endsWith("Provider"),
  )
  .map((name) => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase())
  .filter((name, index, names) => names.indexOf(name) === index)
  .sort()

export const IconPicker = ({
  label,
  value,
  onApply,
}: {
  readonly label: string
  readonly value: string
  readonly onApply: (value: string, asset?: PendingIconAsset) => void
}) => {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState("lucide")
  const [draft, setDraft] = useState(value)
  const [asset, setAsset] = useState<PendingIconAsset | null>(null)
  const [appliedPreview, setAppliedPreview] = useState<{
    source: string
    dataUrl: string
  } | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const icons = LUCIDE_ICONS.filter((name) =>
    name.includes(query.trim().toLowerCase()),
  ).slice(0, query.trim() === "" ? 120 : 240)

  const close = (): void => {
    setOpen(false)
    setAsset(null)
  }

  return (
    <div className="grid gap-1 text-sm">
      <span>{label}</span>
      <Button
        type="button"
        variant="tertiary"
        className="min-h-10 justify-start"
        onPress={() => {
          setDraft(value)
          setAsset(null)
          setFileError(null)
          setOpen(true)
        }}
      >
        {appliedPreview?.source === value ? (
          <img
            src={appliedPreview.dataUrl}
            alt=""
            className="size-6 object-contain"
          />
        ) : value === "" ? (
          "Choose icon"
        ) : value.startsWith("icon://") || value.startsWith("asset://") ? (
          <Icon source={value} size={20} />
        ) : (
          <span className="text-xl">{value}</span>
        )}
        <span className="truncate">{value.split("/").at(-1)}</span>
      </Button>
      {open && (
        <dialog
          open
          aria-label={`Choose ${label.toLowerCase()}`}
          className="fixed inset-0 z-50 m-auto flex max-h-[85vh] w-[min(44rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-separator bg-overlay p-4 text-overlay-foreground shadow-2xl"
        >
          <h3 className="mb-3 shrink-0 text-base font-semibold">
            Choose {label}
          </h3>
          <Tabs
            className="flex min-h-0 flex-1 flex-col"
            selectedKey={kind}
            onSelectionChange={(key) => setKind(String(key))}
          >
            <Tabs.ListContainer>
              <Tabs.List>
                <Tabs.Tab id="lucide">
                  Lucide
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="emoji">
                  Emoji
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="svg">
                  SVG upload
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
            <Tabs.Panel id="lucide">
              <Input
                aria-label="Search Lucide icons"
                placeholder="Search by name"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <div className="mt-3 grid max-h-[52vh] grid-cols-6 gap-1 overflow-y-auto sm:grid-cols-8">
                {icons.map((name) => (
                  <Button
                    key={name}
                    type="button"
                    size="sm"
                    variant={
                      draft === `icon://${name}` ? "secondary" : "tertiary"
                    }
                    aria-label={name}
                    className="h-12 w-full min-w-0 overflow-hidden flex-col gap-0 p-1 text-[9px]"
                    onPress={() => {
                      setDraft(`icon://${name}`)
                      setAsset(null)
                    }}
                  >
                    <Icon source={`icon://${name}`} size={18} />
                    <span className="w-full min-w-0 truncate text-center">
                      {name}
                    </span>
                  </Button>
                ))}
              </div>
            </Tabs.Panel>
            <Tabs.Panel id="emoji">
              <EmojiPicker
                value={draft}
                onSelect={(emoji) => {
                  setDraft(emoji)
                  setAsset(null)
                }}
              />
            </Tabs.Panel>
            <Tabs.Panel id="svg">
              <label className="grid gap-2 text-sm">
                Upload SVG
                <input
                  type="file"
                  accept="image/svg+xml,.svg"
                  aria-label="Upload SVG"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (
                      file === undefined ||
                      !file.name.toLowerCase().endsWith(".svg")
                    )
                      return
                    if (file.size > 2_000_000) {
                      setFileError("SVG files must be 2 MB or smaller.")
                      setAsset(null)
                      return
                    }
                    setFileError(null)
                    const reader = new FileReader()
                    reader.onload = () => {
                      const dataUrl = String(reader.result)
                      const data = dataUrl.split(",", 2)[1]
                      if (data === undefined) return
                      const baseName = file.name
                        .replace(/[^a-zA-Z0-9._-]/g, "_")
                        .slice(-128)
                      const filename = `icon-${Date.now()}-${assetNumber++}-${baseName}`
                      setAsset({ filename, data, preview: dataUrl })
                      setDraft(`./assets/${filename}`)
                    }
                    reader.readAsDataURL(file)
                  }}
                  className="file:mr-2 file:rounded file:border-0 file:bg-surface-secondary file:px-3 file:py-2"
                />
              </label>
              {fileError !== null && (
                <p role="alert" className="text-sm text-danger">
                  {fileError}
                </p>
              )}
              {asset !== null && (
                <img
                  src={asset.preview}
                  alt="SVG preview"
                  className="mt-4 size-16 object-contain"
                />
              )}
            </Tabs.Panel>
          </Tabs>
          <div className="mt-3 flex shrink-0 justify-end gap-2 border-t border-separator bg-overlay pt-3">
            <Button type="button" variant="tertiary" onPress={close}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              isDisabled={draft === "" || fileError !== null}
              onPress={() => {
                onApply(draft, asset ?? undefined)
                setAppliedPreview(
                  asset === null
                    ? null
                    : { source: draft, dataUrl: asset.preview },
                )
                close()
              }}
            >
              Apply
            </Button>
          </div>
        </dialog>
      )}
    </div>
  )
}
