import { fileURLToPath } from "node:url"

import sharp from "sharp"

import { resolveDeckLayout } from "./browser-renderer.js"
import { STREAM_DECK_KEY_PRESET } from "./render-preset.js"

const STARTUP_LOGO_FULL_PATH = fileURLToPath(
  new URL("../assets/logoFull.png", import.meta.url),
)

function createStartupPlaceholderOverlaySvg(width: number, height: number): string {
  const shellInset = Math.max(4, Math.round(Math.min(width, height) * 0.04))
  const cardInset = Math.max(8, Math.round(Math.min(width, height) * 0.1))
  const cardTop = Math.max(cardInset, Math.round(height * 0.16))
  const cardHeight = Math.max(
    height - cardTop - cardInset,
    Math.round(height * 0.42),
  )

  return [
    `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`,
    "<defs>",
    '<linearGradient id="sireno-startup-accent" x1="0" y1="0" x2="1" y2="1">',
    '<stop offset="0%" stop-color="#7dd3fc"/>',
    '<stop offset="100%" stop-color="#38bdf8"/>',
    "</linearGradient>",
    '<linearGradient id="sireno-startup-shell" x1="0" y1="0" x2="0" y2="1">',
    '<stop offset="0%" stop-color="#182332"/>',
    '<stop offset="100%" stop-color="#0b121a"/>',
    "</linearGradient>",
    '<linearGradient id="sireno-startup-card" x1="0" y1="0" x2="0" y2="1">',
    '<stop offset="0%" stop-color="rgba(255,255,255,0.14)"/>',
    '<stop offset="100%" stop-color="rgba(255,255,255,0.04)"/>',
    "</linearGradient>",
    "</defs>",
    `<rect x="${shellInset}" y="${shellInset}" width="${width - shellInset * 2}" height="${height - shellInset * 2}" rx="${Math.max(16, Math.round(Math.min(width, height) * 0.08))}" fill="url(#sireno-startup-shell)" stroke="#2a3647" stroke-width="2"/>`,
    `<rect x="${cardInset}" y="${cardTop}" width="${width - cardInset * 2}" height="${cardHeight}" rx="${Math.max(12, Math.round(Math.min(width, height) * 0.06))}" fill="#0b121a" stroke="rgba(125,211,252,0.18)" stroke-width="1.5"/>`,
    `<rect x="${cardInset}" y="${cardTop}" width="${width - cardInset * 2}" height="${cardHeight}" rx="${Math.max(12, Math.round(Math.min(width, height) * 0.06))}" fill="url(#sireno-startup-card)"/>`,
    `<circle cx="${width / 2}" cy="${Math.max(18, Math.round(height * 0.11))}" r="${Math.max(8, Math.round(Math.min(width, height) * 0.06))}" fill="url(#sireno-startup-accent)" opacity="0.95"/>`,
    `<text x="${width / 2}" y="${Math.max(24, Math.round(height * 0.115))}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.max(10, Math.round(Math.min(width, height) * 0.04))}" font-weight="700" fill="#081018">S</text>`,
    `<text x="${width / 2}" y="${height - Math.max(18, Math.round(height * 0.11))}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.max(10, Math.round(Math.min(width, height) * 0.035))}" font-weight="700" letter-spacing="2.1" fill="#7dd3fc">STARTING</text>`,
    "</svg>",
  ].join("")
}

async function createStartupPlaceholderDeckBuffer(keyCount: number): Promise<{
  buffer: Buffer
  height: number
  width: number
}> {
  const { keyHeight, keyWidth } = STREAM_DECK_KEY_PRESET
  const layout = resolveDeckLayout(keyCount)
  const width = layout.columns * keyWidth
  const height = layout.rows * keyHeight
  const overlaySvg = createStartupPlaceholderOverlaySvg(width, height)
  const logoBuffer = await sharp(STARTUP_LOGO_FULL_PATH)
    .resize({
      fit: "contain",
      height: Math.max(24, Math.round(height * 0.18)),
      width: Math.max(48, Math.round(width * 0.72)),
    })
    .png()
    .toBuffer()
  const logoMetadata = await sharp(logoBuffer).metadata()
  const logoWidth = logoMetadata.width ?? Math.max(48, Math.round(width * 0.72))
  const logoHeight = logoMetadata.height ?? Math.max(24, Math.round(height * 0.18))
  const logoLeft = Math.max(0, Math.round((width - logoWidth) / 2))
  const logoTop = Math.max(0, Math.round(height * 0.3 - logoHeight / 2))
  const accentWidth = Math.max(32, Math.round(width * 0.22))
  const accentHeight = Math.max(4, Math.round(height * 0.018))

  const deckBuffer = await sharp({
    create: {
      background: STREAM_DECK_KEY_PRESET.background,
      channels: 4,
      height,
      width,
    },
  })
    .composite([
      { input: Buffer.from(overlaySvg), top: 0, left: 0 },
      { input: logoBuffer, left: logoLeft, top: logoTop },
      {
        input: {
          create: {
            background: "#7dd3fc",
            channels: 4,
            height: accentHeight,
            width: accentWidth,
          },
        },
        left: Math.max(0, Math.round((width - accentWidth) / 2)),
        top: Math.min(
          height - accentHeight - 12,
          logoTop + logoHeight + Math.max(10, Math.round(height * 0.05)),
        ),
      },
    ])
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
