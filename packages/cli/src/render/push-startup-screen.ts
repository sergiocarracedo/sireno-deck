import { readFileSync } from "node:fs"

import sharp from "sharp"

import { gridForKeyCount } from "@/device/models"

import type { PushRawImageDevice } from "./push-raw-image"

const KEY_SIZE = 72
const CHANNELS = 3
const KEY_BYTES = KEY_SIZE * KEY_SIZE * CHANNELS

export interface PushStartupScreenOptions {
  readonly logoPath: string
  readonly version: string
  readonly device: PushRawImageDevice
  readonly logger: {
    warn: (obj: unknown, msg?: string) => void
    info: (obj: unknown, msg?: string) => void
  }
}

const escapeXml = (value: string): string =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")

const textTile = (text: string, fontSize: number): Buffer =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${KEY_SIZE}" height="${KEY_SIZE}"><rect width="100%" height="100%" fill="#000"/><text x="50%" y="50%" fill="#fff" font-family="sans-serif" font-size="${fontSize}" text-anchor="middle" dominant-baseline="middle">${escapeXml(text)}</text></svg>`,
  )

const renderTile = async (source: Buffer): Promise<Buffer> =>
  sharp(source)
    .resize(KEY_SIZE, KEY_SIZE, { fit: "contain" })
    .flatten({ background: "#000" })
    .removeAlpha()
    .raw()
    .toBuffer()

export async function pushStartupScreen({
  logoPath,
  version,
  device,
  logger,
}: PushStartupScreenOptions): Promise<void> {
  try {
    const keyCount = device.getKeyCount()
    const { columns, rows } = gridForKeyCount(keyCount)
    const logo = renderTile(readFileSync(logoPath))
    const versionImage = renderTile(textTile(`v${version}`, 13))
    const loadingImage = renderTile(textTile("Loading...", 11))
    const row = Math.floor(rows / 2)
    const logoColumn = Math.floor(columns / 2)
    const firstColumn = Math.max(0, logoColumn - 1)
    const firstKey = row * columns + firstColumn
    const tiles = new Map<number, Promise<Buffer>>([
      [firstKey, versionImage],
      [firstKey + 1, logo],
      [firstKey + 2, loadingImage],
    ])
    const black = Buffer.alloc(KEY_BYTES)
    const writes = Array.from({ length: keyCount }, async (_, keyIndex) =>
      device.fillKeyBuffer(keyIndex, await (tiles.get(keyIndex) ?? black)),
    )

    await Promise.all(writes)
    logger.info(
      { keyCount, centerRow: row, logoPosition: firstKey + 1 },
      "pushStartupScreen: rendered device startup screen",
    )
  } catch (err) {
    logger.warn(
      { err: (err as Error).message, logoPath },
      "pushStartupScreen: could not render startup screen",
    )
  }
}
