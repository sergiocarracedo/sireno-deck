import { useState } from "react"
import { Button, Input, Label, Modal, Tabs, TextField } from "@heroui/react"
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
  const [visibleIconCount, setVisibleIconCount] = useState(120)
  const matchingIcons = LUCIDE_ICONS.filter((name) =>
    name.includes(query.trim().toLowerCase()),
  )
  const icons = matchingIcons.slice(0, visibleIconCount)

  const close = (): void => {
    setOpen(false)
    setAsset(null)
  }

  return (
    <div className="grid min-w-0 grid-cols-[minmax(min(10rem,42%),0.85fr)_minmax(0,1.15fr)] items-center gap-x-3 gap-y-1 text-sm">
      <Label className="min-w-0 break-words">{label}</Label>
      <Modal>
        <Button
          type="button"
          variant="tertiary"
          className="min-h-10 min-w-0 justify-start"
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
          <Modal.Backdrop
            isOpen={open}
            onOpenChange={(isOpen) => {
              if (!isOpen) close()
            }}
          >
            <Modal.Container placement="center" scroll="inside" size="lg">
              <Modal.Dialog
                aria-label={`Choose ${label.toLowerCase()}`}
                className="max-h-[85vh]"
              >
                <Modal.Header>
                  <Modal.Heading>Choose {label}</Modal.Heading>
                </Modal.Header>
                <Modal.Body className="min-h-0 flex-1 overflow-y-auto">
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
                        onChange={(event) => {
                          setQuery(event.target.value)
                          setVisibleIconCount(120)
                        }}
                      />
                      <div className="mt-3 grid max-h-[52vh] grid-cols-6 gap-1 overflow-y-auto sm:grid-cols-8">
                        {icons.map((name) => (
                          <Button
                            key={name}
                            type="button"
                            size="sm"
                            variant={
                              draft === `icon://${name}`
                                ? "secondary"
                                : "tertiary"
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
                      {icons.length < matchingIcons.length && (
                        <Button
                          type="button"
                          size="sm"
                          variant="tertiary"
                          className="mt-2 w-full"
                          onPress={() =>
                            setVisibleIconCount((count) => count + 120)
                          }
                        >
                          Show more icons ({matchingIcons.length - icons.length}{" "}
                          remaining)
                        </Button>
                      )}
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
                      <TextField className="grid min-w-0 grid-cols-[minmax(min(10rem,42%),0.85fr)_minmax(0,1.15fr)] items-center gap-2">
                        <Label>Upload SVG</Label>
                        <Input
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
                          className="col-start-2 min-w-0 file:mr-2 file:rounded file:border-0 file:bg-surface-secondary file:px-3 file:py-2"
                        />
                      </TextField>
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
                </Modal.Body>
                <Modal.Footer>
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
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        )}
      </Modal>
    </div>
  )
}
