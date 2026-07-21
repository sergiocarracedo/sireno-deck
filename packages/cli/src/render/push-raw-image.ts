import { readFileSync } from "node:fs"

import sharp from "sharp"

import { gridForKeyCount } from "@/device/models"

export interface PushRawImageDevice {
  readonly getKeyCount: () => number
  readonly fillKeyBuffer: (keyIndex: number, buffer: Buffer) => Promise<void>
}

export interface PushRawImageOptions {
  readonly imagePath: string
  readonly device: PushRawImageDevice
  readonly logger: { warn: (obj: unknown, msg?: string) => void; info: (obj: unknown, msg?: string) => void }
  readonly background?: string
}

const KEY_SIZE = 72

export async function pushRawImage(opts: PushRawImageOptions): Promise<void> {
  const background = opts.background ?? "#000000"
  let sourceBuffer: Buffer
  try {
    sourceBuffer = readFileSync(opts.imagePath)
  } catch (err) {
    opts.logger.warn(
      { err: (err as Error).message, imagePath: opts.imagePath },
      "pushRawImage: cannot read image — skipping splash",
    )
    return
  }

  const keyCount = opts.device.getKeyCount()
  const { columns, rows } = gridForKeyCount(keyCount)
  const deckWidth = columns * KEY_SIZE
  const deckHeight = rows * KEY_SIZE

  let composed: Buffer
  try {
    const resized = await sharp(sourceBuffer)
      .resize({
        fit: "contain",
        width: deckWidth,
        height: deckHeight,
      })
      .toBuffer()

    const resizedMeta = await sharp(resized).metadata()
    const resizedWidth = resizedMeta.width ?? deckWidth
    const resizedHeight = resizedMeta.height ?? deckHeight
    const left = Math.max(0, Math.round((deckWidth - resizedWidth) / 2))
    const top = Math.max(0, Math.round((deckHeight - resizedHeight) / 2))

    composed = await sharp({
      create: {
        background,
        channels: 4,
        width: deckWidth,
        height: deckHeight,
      },
    })
      .composite([{ input: resized, left, top }])
      .removeAlpha()
      .raw()
      .toBuffer()
  } catch (err) {
    opts.logger.warn(
      { err: (err as Error).message, imagePath: opts.imagePath },
      "pushRawImage: sharp pipeline failed — skipping splash",
    )
    return
  }

  const writes: Array<Promise<void>> = []
  for (let keyIndex = 0; keyIndex < keyCount; keyIndex += 1) {
    const row = Math.floor(keyIndex / columns)
    const column = keyIndex % columns
    const cell = await sharp(composed, {
      raw: { channels: 3, width: deckWidth, height: deckHeight },
    })
      .extract({
        left: column * KEY_SIZE,
        top: row * KEY_SIZE,
        width: KEY_SIZE,
        height: KEY_SIZE,
      })
      .raw()
      .toBuffer()
    writes.push(opts.device.fillKeyBuffer(keyIndex, cell))
  }
  await Promise.all(writes)
  opts.logger.info(
    { imagePath: opts.imagePath, keyCount },
    "pushRawImage: pushed raw image",
  )
}