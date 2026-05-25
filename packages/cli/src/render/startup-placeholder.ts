import sharp from "sharp"

import { STREAM_DECK_KEY_PRESET } from "./render-preset.js"

function createStartupPlaceholderSvg(width: number, height: number): string {
  return [
    `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`,
    "<defs>",
    "<linearGradient id=\"sireno-startup-accent\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">",
    "<stop offset=\"0%\" stop-color=\"#7dd3fc\"/>",
    "<stop offset=\"100%\" stop-color=\"#38bdf8\"/>",
    "</linearGradient>",
    "</defs>",
    `<rect x="4" y="4" width="${width - 8}" height="${height - 8}" rx="16" fill="#10161f" stroke="#2a3647" stroke-width="2"/>`,
    `<rect x="10" y="10" width="${width - 20}" height="${height - 20}" rx="12" fill="#0f1720"/>`,
    `<circle cx="${width / 2}" cy="26" r="11" fill="url(#sireno-startup-accent)" opacity="0.95"/>`,
    `<text x="${width / 2}" y="31" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#081018">S</text>`,
    `<text x="${width / 2}" y="49" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" font-weight="700" letter-spacing="1.6" fill="#eef2f7">SIRENO</text>`,
    `<text x="${width / 2}" y="61" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" font-weight="600" letter-spacing="1.1" fill="#7dd3fc">STARTING</text>`,
    "</svg>",
  ].join("")
}

async function createStartupPlaceholderBuffer(): Promise<Buffer> {
  const { keyHeight, keyWidth } = STREAM_DECK_KEY_PRESET
  const svg = createStartupPlaceholderSvg(keyWidth, keyHeight)

  return sharp({
    create: {
      background: STREAM_DECK_KEY_PRESET.background,
      channels: 4,
      height: keyHeight,
      width: keyWidth,
    },
  })
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .removeAlpha()
    .raw()
    .toBuffer()
}

export async function createStartupPlaceholderBuffers(keyCount: number): Promise<Map<number, Buffer>> {
  const sharedBuffer = await createStartupPlaceholderBuffer()
  const buffersByKey = new Map<number, Buffer>()

  for (let keyIndex = 0; keyIndex < keyCount; keyIndex += 1) {
    buffersByKey.set(keyIndex, sharedBuffer)
  }

  return buffersByKey
}
