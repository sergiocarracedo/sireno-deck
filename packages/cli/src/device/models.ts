export interface DeviceModelSpec {
  readonly id: string
  readonly name: string
  readonly keyCount: number
  readonly columns: number
  readonly rows: number
}

export const DEVICE_MODELS: ReadonlyArray<DeviceModelSpec> = [
  {
    id: "original",
    name: "Stream Deck Original",
    keyCount: 15,
    columns: 5,
    rows: 3,
  },
  {
    id: "originalv2",
    name: "Stream Deck Original V2",
    keyCount: 15,
    columns: 5,
    rows: 3,
  },
  { id: "mk2", name: "Stream Deck MK.2", keyCount: 15, columns: 5, rows: 3 },
  { id: "plus", name: "Stream Deck +", keyCount: 32, columns: 8, rows: 4 },
  { id: "mini", name: "Stream Deck Mini", keyCount: 6, columns: 3, rows: 2 },
  { id: "xl", name: "Stream Deck XL", keyCount: 32, columns: 8, rows: 4 },
]

export const DEFAULT_DEVICE_MODEL_ID = "mk2"

export const DEFAULT_KEY_COUNT = 15

export const BUTTON_SIZE_PX = 96
export const DECK_PADDING_PX = 16
export const DECK_GAP_PX = 8

export const resolveDeckGap = (
  value: string | null | undefined,
  compact = false,
): number => {
  if (value === "false" || value === "0") return 0
  if (value === "true" || value === "8") return DECK_GAP_PX
  return compact ? 0 : DECK_GAP_PX
}

export const deckDimensions = (
  model: Pick<DeviceModelSpec, "columns" | "rows">,
  gap: number,
  padding = DECK_PADDING_PX,
) => ({
  width:
    model.columns * BUTTON_SIZE_PX + (model.columns - 1) * gap + padding * 2,
  height: model.rows * BUTTON_SIZE_PX + (model.rows - 1) * gap + padding * 2,
})

export const isKnownDeviceModel = (id: string): id is DeviceModelSpec["id"] =>
  DEVICE_MODELS.some((m) => m.id === id)

export const getDeviceModel = (id: string): DeviceModelSpec => {
  const found = DEVICE_MODELS.find((m) => m.id === id)
  if (found === undefined) {
    throw new Error(`Unknown device model: ${id}`)
  }
  return found
}

export const resolveKeyCount = (id: string | undefined): number => {
  if (id === undefined) return DEFAULT_KEY_COUNT
  if (!isKnownDeviceModel(id)) {
    throw new Error(`Unknown device model: ${id}`)
  }
  return getDeviceModel(id).keyCount
}

export const gridForKeyCount = (
  keyCount: number,
): { columns: number; rows: number } => {
  if (keyCount === 15) return { columns: 5, rows: 3 }
  if (keyCount === 32) return { columns: 8, rows: 4 }
  if (keyCount === 6) return { columns: 3, rows: 2 }
  if (keyCount === 8) return { columns: 4, rows: 2 }
  if (keyCount === 3) return { columns: 3, rows: 1 }
  if (keyCount === 2) return { columns: 2, rows: 1 }
  if (keyCount === 1) return { columns: 1, rows: 1 }
  const columns = Math.ceil(Math.sqrt(keyCount))
  const rows = Math.ceil(keyCount / columns)
  return { columns, rows }
}
