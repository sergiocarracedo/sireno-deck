import { fileURLToPath } from "node:url"

import sharp from "sharp"

import { resolveDeckLayout } from "./browser-renderer.js"
import { STREAM_DECK_KEY_PRESET } from "./render-preset.js"

const STARTUP_LOGO_FULL_PATH = fileURLToPath(
  new URL("../assets/logoFull.png", import.meta.url),
)

async function createStartupPlaceholderDeckBuffer(keyCount: number): Promise<{
  buffer: Buffer
  height: number
  width: number
}> {
  const { keyHeight, keyWidth } = STREAM_DECK_KEY_PRESET
  const layout = resolveDeckLayout(keyCount)
  const width = layout.columns * keyWidth
  const height = layout.rows * keyHeight
  const logoBuffer = await sharp(STARTUP_LOGO_FULL_PATH)
    .resize({
      fit: "contain",
      height,
      width,
    })
    .png()
    .toBuffer()
  const logoMetadata = await sharp(logoBuffer).metadata()
  const logoWidth = logoMetadata.width ?? width
  const logoHeight = logoMetadata.height ?? height
  const logoLeft = Math.max(0, Math.round((width - logoWidth) / 2))
  const logoTop = Math.max(0, Math.round((height - logoHeight) / 2))

  const deckBuffer = await sharp({
    create: {
      background: "#efe3e1",
      channels: 4,
      height,
      width,
    },
  })
    .composite([{ input: logoBuffer, left: logoLeft, top: logoTop }])
    .removeAlpha()
    .raw()
    .toBuffer()

  return { buffer: deckBuffer, height, width }
}

export async function createStartupPlaceholderBuffers(
  keyCount: number,
): Promise<Map<number, Buffer>> {
  const { keyHeight, keyWidth } = STREAM_DECK_KEY_PRESET
  const layout = resolveDeckLayout(keyCount)
  const { buffer: deckBuffer, height, width } =
    await createStartupPlaceholderDeckBuffer(keyCount)
  const buffersByKey = new Map<number, Buffer>()

  for (let keyIndex = 0; keyIndex < keyCount; keyIndex += 1) {
    const row = Math.floor(keyIndex / layout.columns)
    const column = keyIndex % layout.columns
    const keyBuffer = await sharp(deckBuffer, {
      raw: {
        channels: 3,
        height,
        width,
      },
    })
      .extract({
        height: keyHeight,
        left: column * keyWidth,
        top: row * keyHeight,
        width: keyWidth,
      })
      .raw()
      .toBuffer()

    buffersByKey.set(keyIndex, keyBuffer)
  }

  return buffersByKey
}
