import { existsSync, readFileSync } from "node:fs"
import { extname, resolve } from "node:path"

import sharp from "sharp"

import type { Theme } from "../config/theme.js"

export interface TextImageOptions {
  icon?: string
  text?: string
  theme?: Theme
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

function getDefaultTheme(): Theme {
  return {
    accent: "#f59e0b",
    background: "#10161f",
    danger: "#fb7185",
    foreground: "#eef2f7",
    name: "default",
    primary: "#7dd3fc",
    success: "#34d399",
  }
}

function hexToRgb(hex: string): { blue: number; green: number; red: number } {
  const normalized = hex.replace(/^#/, "")
  const value = normalized.length === 3
    ? normalized
        .split("")
        .map((char) => `${char}${char}`)
        .join("")
    : normalized

  const parsed = Number.parseInt(value, 16)

  return {
    red: (parsed >> 16) & 255,
    green: (parsed >> 8) & 255,
    blue: parsed & 255,
  }
}

function mixHexColor(source: string, target: string, weight: number): string {
  const from = hexToRgb(source)
  const to = hexToRgb(target)
  const mix = (left: number, right: number) => Math.round(left + (right - left) * weight)

  return `#${[mix(from.red, to.red), mix(from.green, to.green), mix(from.blue, to.blue)]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`
}

function getMimeType(iconPath: string): string {
  switch (extname(iconPath).toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg"
    case ".svg":
      return "image/svg+xml"
    case ".webp":
      return "image/webp"
    default:
      return "image/png"
  }
}

function getIconMarkup(iconPath: string | undefined): string {
  if (!iconPath) {
    return ""
  }

  const resolvedIconPath = resolve(process.cwd(), iconPath)
  if (!existsSync(resolvedIconPath)) {
    return ""
  }

  const encoded = readFileSync(resolvedIconPath).toString("base64")
  const mimeType = getMimeType(resolvedIconPath)

  return `<image x="18" y="14" width="36" height="36" preserveAspectRatio="xMidYMid meet" href="data:${mimeType};base64,${encoded}" />`
}

function escapeSvgText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function buildTextSvg(text: string, iconPath: string | undefined, preset: TextImagePreset, theme: Theme): string {
  const safeText = escapeSvgText(text)
  const cardStart = mixHexColor(theme.background, theme.primary, 0.08)
  const cardEnd = mixHexColor(theme.background, "#ffffff", 0.04)
  const frame = mixHexColor(theme.primary, theme.background, 0.45)
  const subtext = mixHexColor(theme.foreground, theme.background, 0.4)
  const iconMarkup = getIconMarkup(iconPath)
  const labelY = iconMarkup ? 58 : 43

  return `
    <svg width="${preset.keyWidth}" height="${preset.keyHeight}" viewBox="0 0 ${preset.keyWidth} ${preset.keyHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="card" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${cardStart}" />
          <stop offset="100%" stop-color="${cardEnd}" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${preset.keyWidth}" height="${preset.keyHeight}" rx="16" fill="url(#card)" />
      <rect x="4" y="4" width="${preset.keyWidth - 8}" height="${preset.keyHeight - 8}" rx="12" fill="none" stroke="${frame}" stroke-width="1.5" />
      <rect x="10" y="10" width="14" height="4" rx="2" fill="${theme.accent}" opacity="0.95" />
      ${iconMarkup}
      <text x="${iconMarkup ? 36 : 10}" y="${labelY}" fill="${theme.foreground}" text-anchor="${iconMarkup ? "middle" : "start"}" font-family="IBM Plex Sans, Arial, sans-serif" font-size="${iconMarkup ? 11 : 15}" font-weight="600">${safeText}</text>
      <text x="10" y="66" fill="${subtext}" font-family="IBM Plex Sans, Arial, sans-serif" font-size="8" letter-spacing="1.4">${escapeSvgText(theme.name.toUpperCase())}</text>
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
  const theme = options.theme ?? getDefaultTheme()
  const preset: TextImagePreset = {
    ...STREAM_DECK_KEY_PRESET,
    background: theme.background,
    frame: mixHexColor(theme.primary, theme.background, 0.45),
    keyHeight: options.height ?? STREAM_DECK_KEY_PRESET.keyHeight,
    keyWidth: options.width ?? STREAM_DECK_KEY_PRESET.keyWidth,
    text: theme.foreground,
  }

  return renderSvg(buildTextSvg(options.text ?? "", options.icon, preset, theme), preset)
}

export async function renderBlankKeyImage(): Promise<Buffer> {
  return renderSvg(buildBlankSvg(STREAM_DECK_KEY_PRESET), STREAM_DECK_KEY_PRESET)
}
