import sharp from "sharp"

export interface TextImageOptions {
  text: string
  width?: number
  height?: number
}

export interface TextImagePreset {
  keyWidth: number
  keyHeight: number
  background: string
  frame: string
  text: string
}

export const STREAM_DECK_KEY_PRESET: TextImagePreset = {
  keyWidth: 72,
  keyHeight: 72,
  background: "#0f1720",
  frame: "#2a3647",
  text: "#f4f7fb",
}

function escapeSvgText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function buildTextSvg(text: string, preset: TextImagePreset): string {
  const safeText = escapeSvgText(text)

  return `
    <svg width="${preset.keyWidth}" height="${preset.keyHeight}" viewBox="0 0 ${preset.keyWidth} ${preset.keyHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="card" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${preset.background}" />
          <stop offset="100%" stop-color="#1b2737" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${preset.keyWidth}" height="${preset.keyHeight}" rx="16" fill="url(#card)" />
      <rect x="4" y="4" width="${preset.keyWidth - 8}" height="${preset.keyHeight - 8}" rx="12" fill="none" stroke="${preset.frame}" stroke-width="1.5" />
      <rect x="10" y="12" width="12" height="3" rx="1.5" fill="#5eead4" opacity="0.9" />
      <text x="10" y="39" fill="${preset.text}" font-family="IBM Plex Sans, Arial, sans-serif" font-size="15" font-weight="600">${safeText}</text>
      <text x="10" y="56" fill="#8aa0b8" font-family="IBM Plex Sans, Arial, sans-serif" font-size="8" letter-spacing="1.4">SIRENO</text>
    </svg>
  `.trim()
}

function buildBlankSvg(preset: TextImagePreset): string {
  return `
    <svg width="${preset.keyWidth}" height="${preset.keyHeight}" viewBox="0 0 ${preset.keyWidth} ${preset.keyHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${preset.keyWidth}" height="${preset.keyHeight}" rx="16" fill="#05070a" />
    </svg>
  `.trim()
}

async function renderSvg(svg: string, preset: TextImagePreset): Promise<Buffer> {
  return sharp(Buffer.from(svg))
    .resize(preset.keyWidth, preset.keyHeight)
    .removeAlpha()
    .raw()
    .toBuffer()
}

export async function renderTextImage(options: TextImageOptions): Promise<Buffer> {
  const preset: TextImagePreset = {
    ...STREAM_DECK_KEY_PRESET,
    keyWidth: options.width ?? STREAM_DECK_KEY_PRESET.keyWidth,
    keyHeight: options.height ?? STREAM_DECK_KEY_PRESET.keyHeight,
  }

  return renderSvg(buildTextSvg(options.text, preset), preset)
}

export async function renderBlankKeyImage(): Promise<Buffer> {
  return renderSvg(buildBlankSvg(STREAM_DECK_KEY_PRESET), STREAM_DECK_KEY_PRESET)
}
