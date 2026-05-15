import { existsSync, readFileSync } from "node:fs"
import { extname, resolve } from "node:path"

import sharp from "sharp"

import type { Theme, ThemeTypographyRole } from "../config/theme.js"

export interface TextImageOptions {
  detailLines?: string[]
  displayValue?: string
  icon?: string
  progress?: number
  subtitle?: string
  text?: string
  theme?: Theme
  variant?: "default" | "emoji" | "fan" | "media" | "metric" | "toggle"
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

type TypographyRoleName = "main_text" | "auxiliary_text" | "monospace"

interface TextStyleOptions {
  fill: string
  text: string
  theme: Theme
  role: TypographyRoleName
  x: number
  y: number
  clipId: string
  clipX: number
  clipY: number
  clipWidth: number
  clipHeight: number
  textAnchor?: "end" | "middle" | "start"
  scale?: number
}

const DEFAULT_THEME: Theme = {
  accent: "#f59e0b",
  background: "#10161f",
  danger: "#fb7185",
  foreground: "#eef2f7",
  name: "default",
  primary: "#7dd3fc",
  success: "#34d399",
  typography: {
    main_text: {
      font_family: "IBM Plex Sans",
      font_size: 12,
      font_weight: 700,
    },
    auxiliary_text: {
      font_family: "IBM Plex Sans",
      font_size: 8,
      font_weight: 600,
      letter_spacing: 1.2,
    },
    monospace: {
      font_family: "IBM Plex Mono",
      font_size: 10,
      font_weight: 700,
      letter_spacing: 0.4,
    },
  },
}

function getDefaultTheme(): Theme {
  return DEFAULT_THEME
}

function getTypographyRole(theme: Theme, role: TypographyRoleName): ThemeTypographyRole {
  return theme.typography?.[role] ?? DEFAULT_THEME.typography![role]
}

function getScaledFontSize(role: ThemeTypographyRole, scale: number | undefined): number {
  return Number(((scale ?? 1) * role.font_size).toFixed(2))
}

function buildTextAttributes(theme: Theme, roleName: TypographyRoleName, scale: number | undefined): string {
  const role = getTypographyRole(theme, roleName)
  const attributes = [
    `font-family="${escapeSvgText(role.font_family)}"`,
    `font-size="${getScaledFontSize(role, scale)}"`,
    `font-weight="${role.font_weight}"`,
  ]

  if (role.letter_spacing !== undefined) {
    attributes.push(`letter-spacing="${role.letter_spacing}"`)
  }

  return attributes.join(" ")
}

function buildClippedText(options: TextStyleOptions): { definition: string; markup: string } {
  return {
    definition: `<clipPath id="${options.clipId}"><rect x="${options.clipX}" y="${options.clipY}" width="${options.clipWidth}" height="${options.clipHeight}" /></clipPath>`,
    markup: `<text x="${options.x}" y="${options.y}" fill="${options.fill}" text-anchor="${options.textAnchor ?? "start"}" clip-path="url(#${options.clipId})" ${buildTextAttributes(options.theme, options.role, options.scale)}>${escapeSvgText(options.text)}</text>`,
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

function parseSvgViewBox(iconSvg: string): string {
  const explicitViewBox = iconSvg.match(/viewBox\s*=\s*"([^"]+)"/i)?.[1]
  if (explicitViewBox) {
    return explicitViewBox
  }

  const width = Number.parseFloat(iconSvg.match(/width\s*=\s*"([^"]+)"/i)?.[1] ?? "72")
  const height = Number.parseFloat(iconSvg.match(/height\s*=\s*"([^"]+)"/i)?.[1] ?? "72")

  return `0 0 ${width} ${height}`
}

function getSvgIconMarkup(iconSvg: string): string {
  const innerMarkup = iconSvg
    .replace(/^[\s\S]*?<svg[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "")
    .trim()

  if (!innerMarkup) {
    return ""
  }

  const [, , width, height] = parseSvgViewBox(iconSvg)
    .split(/\s+/)
    .map((value) => Number.parseFloat(value))
  const scaleX = width > 0 ? 36 / width : 1
  const scaleY = height > 0 ? 36 / height : 1

  return `<g transform="translate(18 14) scale(${scaleX} ${scaleY})">${innerMarkup}</g>`
}

function getIconMarkup(iconPath: string | undefined): string {
  if (!iconPath) {
    return ""
  }

  const resolvedIconPath = resolve(process.cwd(), iconPath)
  if (!existsSync(resolvedIconPath)) {
    return ""
  }

  if (extname(resolvedIconPath).toLowerCase() === ".svg") {
    return getSvgIconMarkup(readFileSync(resolvedIconPath, "utf-8"))
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

function getDetailLines(lines: string[] | undefined, limit: number): string[] {
  return (lines ?? [])
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, limit)
}

function buildDefaultSvg(options: TextImageOptions, preset: TextImagePreset, theme: Theme): string {
  const text = options.text ?? ""
  const iconPath = options.icon
  const safeText = escapeSvgText(text)
  const cardStart = mixHexColor(theme.background, theme.primary, 0.08)
  const cardEnd = mixHexColor(theme.background, "#ffffff", 0.04)
  const frame = mixHexColor(theme.primary, theme.background, 0.45)
  const metricFill = mixHexColor(theme.primary, theme.background, 0.12)
  const metricTrack = mixHexColor(theme.primary, theme.background, 0.78)
  const subtext = mixHexColor(theme.foreground, theme.background, 0.4)
  const iconMarkup = getIconMarkup(iconPath)
  const badgeFill = options.variant === "toggle"
    ? mixHexColor(theme.accent, theme.background, 0.15)
    : mixHexColor(theme.primary, theme.background, 0.15)
  const badgeStroke = options.variant === "toggle"
    ? mixHexColor(theme.accent, theme.background, 0.05)
    : mixHexColor(theme.primary, theme.background, 0.2)
  const badgeText = options.subtitle ? escapeSvgText(options.subtitle) : ""
  const labelY = iconMarkup ? 58 : 43
  const metricText = options.displayValue ? escapeSvgText(options.displayValue) : ""
  const progressWidth = options.progress !== undefined
    ? Math.max(0, Math.min(preset.keyWidth - 20, Math.round(((preset.keyWidth - 20) * options.progress) / 100)))
    : 0
  const textElements = [
    options.subtitle
      ? buildClippedText({
          clipHeight: 12,
          clipId: "default-badge-text",
          clipWidth: 28,
          clipX: 34,
          clipY: 10,
          fill: theme.foreground,
          role: "auxiliary_text",
          scale: 0.88,
          text: badgeText,
          textAnchor: "middle",
          theme,
          x: 48,
          y: 18,
        })
      : null,
    buildClippedText({
      clipHeight: iconMarkup ? 12 : 18,
      clipId: "default-label-text",
      clipWidth: iconMarkup ? 52 : 54,
      clipX: 10,
      clipY: iconMarkup ? 50 : 29,
      fill: theme.foreground,
      role: "main_text",
      scale: iconMarkup ? 0.92 : 1.25,
      text: safeText,
      textAnchor: iconMarkup ? "middle" : "start",
      theme,
      x: iconMarkup ? 36 : 10,
      y: labelY,
    }),
    options.variant === "metric" && options.displayValue
      ? buildClippedText({
          clipHeight: 14,
          clipId: "default-metric-value",
          clipWidth: 34,
          clipX: 28,
          clipY: 36,
          fill: theme.foreground,
          role: "monospace",
          scale: 1.6,
          text: metricText,
          textAnchor: "end",
          theme,
          x: preset.keyWidth - 10,
          y: 48,
        })
      : null,
    buildClippedText({
      clipHeight: 8,
      clipId: "default-theme-name",
      clipWidth: 52,
      clipX: 10,
      clipY: 58,
      fill: subtext,
      role: "auxiliary_text",
      text: escapeSvgText(theme.name.toUpperCase()),
      theme,
      x: 10,
      y: 66,
    }),
  ].filter((element): element is { definition: string; markup: string } => element !== null)

  return `
    <svg width="${preset.keyWidth}" height="${preset.keyHeight}" viewBox="0 0 ${preset.keyWidth} ${preset.keyHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="card" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${cardStart}" />
          <stop offset="100%" stop-color="${cardEnd}" />
        </linearGradient>
        ${textElements.map((element) => element.definition).join("")}
      </defs>
      <rect x="0" y="0" width="${preset.keyWidth}" height="${preset.keyHeight}" rx="16" fill="url(#card)" />
      <rect x="4" y="4" width="${preset.keyWidth - 8}" height="${preset.keyHeight - 8}" rx="12" fill="none" stroke="${frame}" stroke-width="1.5" />
      <rect x="10" y="10" width="14" height="4" rx="2" fill="${theme.accent}" opacity="0.95" />
      ${options.subtitle ? `<rect x="34" y="10" width="28" height="12" rx="6" fill="${badgeFill}" stroke="${badgeStroke}" stroke-width="1" />` : ""}
      ${textElements.map((element) => element.markup).join("")}
      ${iconMarkup}
      ${options.variant === "metric" && options.progress !== undefined ? `<rect x="10" y="52" width="${preset.keyWidth - 20}" height="8" rx="4" fill="${metricTrack}" />` : ""}
      ${options.variant === "metric" && options.progress !== undefined ? `<rect x="10" y="52" width="${progressWidth}" height="8" rx="4" fill="${metricFill}" />` : ""}
    </svg>
  `.trim()
}

function buildFanSvg(options: TextImageOptions, preset: TextImagePreset, theme: Theme): string {
  const title = escapeSvgText(options.text ?? "Fan")
  const value = escapeSvgText(options.displayValue ?? "")
  const detailLines = getDetailLines(options.detailLines, 2)
  const unavailable = options.displayValue === undefined
  const detailColor = unavailable ? theme.danger : mixHexColor(theme.foreground, theme.background, 0.32)
  const frame = mixHexColor(unavailable ? theme.danger : theme.primary, theme.background, 0.38)
  const textElements = [
    buildClippedText({
      clipHeight: 12,
      clipId: "fan-title",
      clipWidth: 32,
      clipX: 30,
      clipY: 10,
      fill: theme.foreground,
      role: "main_text",
      scale: 0.92,
      text: title,
      theme,
      x: 30,
      y: 20,
    }),
    value
      ? buildClippedText({
          clipHeight: 18,
          clipId: "fan-value",
          clipWidth: 52,
          clipX: 10,
          clipY: 28,
          fill: theme.foreground,
          role: "monospace",
          scale: 1.6,
          text: value,
          theme,
          x: 10,
          y: 43,
        })
      : null,
    detailLines[0]
      ? buildClippedText({
          clipHeight: 10,
          clipId: "fan-detail-primary",
          clipWidth: 52,
          clipX: 10,
          clipY: 46,
          fill: detailColor,
          role: "auxiliary_text",
          scale: 1.12,
          text: detailLines[0],
          theme,
          x: 10,
          y: 54,
        })
      : null,
    detailLines[1]
      ? buildClippedText({
          clipHeight: 8,
          clipId: "fan-detail-secondary",
          clipWidth: 52,
          clipX: 10,
          clipY: 58,
          fill: mixHexColor(detailColor, theme.background, 0.18),
          role: "auxiliary_text",
          text: detailLines[1],
          theme,
          x: 10,
          y: 64,
        })
      : null,
  ].filter((element): element is { definition: string; markup: string } => element !== null)

  return `
    <svg width="${preset.keyWidth}" height="${preset.keyHeight}" viewBox="0 0 ${preset.keyWidth} ${preset.keyHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>${textElements.map((element) => element.definition).join("")}</defs>
      <rect x="0" y="0" width="${preset.keyWidth}" height="${preset.keyHeight}" rx="16" fill="${mixHexColor(theme.background, unavailable ? theme.danger : theme.primary, 0.09)}" />
      <rect x="4" y="4" width="${preset.keyWidth - 8}" height="${preset.keyHeight - 8}" rx="12" fill="none" stroke="${frame}" stroke-width="1.5" />
      <circle cx="18" cy="17" r="7" fill="none" stroke="${theme.accent}" stroke-width="1.5" />
      <path d="M18 10 L20 16 L16 17 Z" fill="${theme.accent}" />
      ${textElements.map((element) => element.markup).join("")}
    </svg>
  `.trim()
}

function buildMediaSvg(options: TextImageOptions, preset: TextImagePreset, theme: Theme): string {
  const title = escapeSvgText(options.text ?? "Media")
  const detailLines = getDetailLines(options.detailLines, 3)
  const badgeText = options.subtitle ? escapeSvgText(options.subtitle) : ""
  const badgeWidth = Math.max(20, Math.min(34, 10 + badgeText.length * 4))
  const badgeX = preset.keyWidth - badgeWidth - 10
  const textElements = [
    buildClippedText({
      clipHeight: 12,
      clipId: "media-title",
      clipWidth: 34,
      clipX: 28,
      clipY: 11,
      fill: theme.foreground,
      role: "main_text",
      scale: 0.92,
      text: title,
      theme,
      x: 28,
      y: 21,
    }),
    options.subtitle
      ? buildClippedText({
          clipHeight: 12,
          clipId: "media-badge",
          clipWidth: badgeWidth,
          clipX: badgeX,
          clipY: 28,
          fill: theme.foreground,
          role: "auxiliary_text",
          scale: 0.88,
          text: badgeText,
          textAnchor: "middle",
          theme,
          x: badgeX + badgeWidth / 2,
          y: 36,
        })
      : null,
    detailLines[0]
      ? buildClippedText({
          clipHeight: 10,
          clipId: "media-detail-primary",
          clipWidth: 52,
          clipX: 10,
          clipY: 37,
          fill: theme.foreground,
          role: "main_text",
          scale: 0.84,
          text: detailLines[0],
          theme,
          x: 10,
          y: 45,
        })
      : null,
    detailLines[1]
      ? buildClippedText({
          clipHeight: 9,
          clipId: "media-detail-secondary",
          clipWidth: 52,
          clipX: 10,
          clipY: 48,
          fill: mixHexColor(theme.foreground, theme.background, 0.25),
          role: "auxiliary_text",
          scale: 1.12,
          text: detailLines[1],
          theme,
          x: 10,
          y: 56,
        })
      : null,
    detailLines[2]
      ? buildClippedText({
          clipHeight: 8,
          clipId: "media-detail-tertiary",
          clipWidth: 52,
          clipX: 10,
          clipY: 58,
          fill: mixHexColor(theme.foreground, theme.background, 0.38),
          role: "auxiliary_text",
          text: detailLines[2],
          theme,
          x: 10,
          y: 66,
        })
      : null,
  ].filter((element): element is { definition: string; markup: string } => element !== null)

  return `
    <svg width="${preset.keyWidth}" height="${preset.keyHeight}" viewBox="0 0 ${preset.keyWidth} ${preset.keyHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="media-card" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${mixHexColor(theme.background, theme.primary, 0.12)}" />
          <stop offset="100%" stop-color="${mixHexColor(theme.background, theme.accent, 0.08)}" />
        </linearGradient>
        ${textElements.map((element) => element.definition).join("")}
      </defs>
      <rect x="0" y="0" width="${preset.keyWidth}" height="${preset.keyHeight}" rx="16" fill="url(#media-card)" />
      <rect x="4" y="4" width="${preset.keyWidth - 8}" height="${preset.keyHeight - 8}" rx="12" fill="none" stroke="${mixHexColor(theme.primary, theme.background, 0.34)}" stroke-width="1.5" />
      <circle cx="16" cy="18" r="8" fill="${mixHexColor(theme.accent, theme.background, 0.2)}" />
      <path d="M14 14 L20 18 L14 22 Z" fill="${theme.accent}" />
      ${options.subtitle ? `<rect x="${badgeX}" y="28" width="${badgeWidth}" height="12" rx="6" fill="${mixHexColor(theme.primary, theme.background, 0.18)}" stroke="${mixHexColor(theme.primary, theme.background, 0.05)}" stroke-width="1" />` : ""}
      ${textElements.map((element) => element.markup).join("")}
    </svg>
  `.trim()
}

function buildEmojiSvg(options: TextImageOptions, preset: TextImagePreset, theme: Theme): string {
  const alias = escapeSvgText(options.text ?? "EMOJI")
  const category = options.subtitle ? escapeSvgText(options.subtitle) : "EMOJI"
  const chipWidth = Math.max(28, Math.min(52, 14 + category.length * 4.2))
  const chipX = (preset.keyWidth - chipWidth) / 2
  const textElements = [
    buildClippedText({
      clipHeight: 12,
      clipId: "emoji-category",
      clipWidth: chipWidth,
      clipX: chipX,
      clipY: 10,
      fill: theme.foreground,
      role: "auxiliary_text",
      scale: 0.88,
      text: category.toUpperCase(),
      textAnchor: "middle",
      theme,
      x: preset.keyWidth / 2,
      y: 18,
    }),
    buildClippedText({
      clipHeight: 22,
      clipId: "emoji-alias",
      clipWidth: 56,
      clipX: 8,
      clipY: 24,
      fill: theme.foreground,
      role: "main_text",
      scale: 1.42,
      text: alias,
      textAnchor: "middle",
      theme,
      x: preset.keyWidth / 2,
      y: 42,
    }),
    buildClippedText({
      clipHeight: 8,
      clipId: "emoji-action",
      clipWidth: 44,
      clipX: 14,
      clipY: 50,
      fill: mixHexColor(theme.foreground, theme.background, 0.38),
      role: "auxiliary_text",
      text: "SELECT",
      textAnchor: "middle",
      theme,
      x: preset.keyWidth / 2,
      y: 58,
    }),
  ]

  return `
    <svg width="${preset.keyWidth}" height="${preset.keyHeight}" viewBox="0 0 ${preset.keyWidth} ${preset.keyHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="emoji-card" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${mixHexColor(theme.background, theme.accent, 0.16)}" />
          <stop offset="100%" stop-color="${mixHexColor(theme.background, theme.primary, 0.14)}" />
        </linearGradient>
        ${textElements.map((element) => element.definition).join("")}
      </defs>
      <rect x="0" y="0" width="${preset.keyWidth}" height="${preset.keyHeight}" rx="16" fill="url(#emoji-card)" />
      <rect x="4" y="4" width="${preset.keyWidth - 8}" height="${preset.keyHeight - 8}" rx="12" fill="none" stroke="${mixHexColor(theme.foreground, theme.background, 0.7)}" stroke-width="1.5" />
      <circle cx="16" cy="16" r="5" fill="${theme.accent}" opacity="0.95" />
      <circle cx="56" cy="16" r="3" fill="${theme.primary}" opacity="0.9" />
      <rect x="${chipX}" y="10" width="${chipWidth}" height="12" rx="6" fill="${mixHexColor(theme.background, theme.foreground, 0.08)}" stroke="${mixHexColor(theme.foreground, theme.background, 0.2)}" stroke-width="1" />
      ${textElements.map((element) => element.markup).join("")}
    </svg>
  `.trim()
}

function buildTextSvg(options: TextImageOptions, preset: TextImagePreset, theme: Theme): string {
  if (options.variant === "emoji") {
    return buildEmojiSvg(options, preset, theme)
  }

  if (options.variant === "fan") {
    return buildFanSvg(options, preset, theme)
  }

  if (options.variant === "media") {
    return buildMediaSvg(options, preset, theme)
  }

  return buildDefaultSvg(options, preset, theme)
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

  return renderSvg(buildTextSvg(options, preset, theme), preset)
}

export async function renderBlankKeyImage(): Promise<Buffer> {
  return renderSvg(buildBlankSvg(STREAM_DECK_KEY_PRESET), STREAM_DECK_KEY_PRESET)
}
