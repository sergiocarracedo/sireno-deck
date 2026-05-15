import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { afterEach, describe, expect, it, vi } from "vitest"

import { resolveTheme } from "../config/theme.js"
import { renderBlankKeyImage, renderTextImage } from "./text-image.js"

function createTheme(overrides?: {
  accent?: string
  background?: string
  danger?: string
  foreground?: string
  name?: string
  primary?: string
  success?: string
  typography?: {
    auxiliary_text?: { font_family?: string; font_size?: number; font_weight?: number; letter_spacing?: number }
    main_text?: { font_family?: string; font_size?: number; font_weight?: number; letter_spacing?: number }
    monospace?: { font_family?: string; font_size?: number; font_weight?: number; letter_spacing?: number }
  }
}) {
  return {
    accent: overrides?.accent ?? "#f59e0b",
    background: overrides?.background ?? "#10161f",
    danger: overrides?.danger ?? "#fb7185",
    foreground: overrides?.foreground ?? "#eef2f7",
    name: overrides?.name ?? "dark",
    primary: overrides?.primary ?? "#7dd3fc",
    success: overrides?.success ?? "#34d399",
    typography: {
      main_text: {
        font_family: overrides?.typography?.main_text?.font_family ?? "IBM Plex Sans",
        font_size: overrides?.typography?.main_text?.font_size ?? 12,
        font_weight: overrides?.typography?.main_text?.font_weight ?? 700,
        ...(overrides?.typography?.main_text?.letter_spacing !== undefined
          ? { letter_spacing: overrides.typography.main_text.letter_spacing }
          : {}),
      },
      auxiliary_text: {
        font_family: overrides?.typography?.auxiliary_text?.font_family ?? "IBM Plex Sans",
        font_size: overrides?.typography?.auxiliary_text?.font_size ?? 8,
        font_weight: overrides?.typography?.auxiliary_text?.font_weight ?? 600,
        letter_spacing: overrides?.typography?.auxiliary_text?.letter_spacing ?? 1.2,
      },
      monospace: {
        font_family: overrides?.typography?.monospace?.font_family ?? "IBM Plex Mono",
        font_size: overrides?.typography?.monospace?.font_size ?? 10,
        font_weight: overrides?.typography?.monospace?.font_weight ?? 700,
        letter_spacing: overrides?.typography?.monospace?.letter_spacing ?? 0.4,
      },
    },
  }
}

function countRegionDiffs(left: Buffer, right: Buffer, region: { height: number; width: number; x: number; y: number }): number {
  let differences = 0
  const channels = 3
  const imageWidth = 72

  for (let row = region.y; row < region.y + region.height; row += 1) {
    for (let column = region.x; column < region.x + region.width; column += 1) {
      const offset = (row * imageWidth + column) * channels
      if (
        left[offset] !== right[offset] ||
        left[offset + 1] !== right[offset + 1] ||
        left[offset + 2] !== right[offset + 2]
      ) {
        differences += 1
      }
    }
  }

  return differences
}

function getRepoFilePath(relativePath: string): string {
  return fileURLToPath(new URL(relativePath, import.meta.url))
}

function createPhase7ReviewTheme(themeName: "dark" | "light") {
  const theme = resolveTheme(getRepoFilePath(`../../../../themes/${themeName}.yml`))

  return createTheme({
    name: "review",
    typography: theme.typography,
  })
}

function createPhase8ReviewTheme() {
  return createTheme({ name: "phase-8-review" })
}

describe("text-image", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders a non-empty image buffer for a text visual", async () => {
    const buffer = await renderTextImage({ text: "Hello" })

    expect(buffer.length).toBe(72 * 72 * 3)
  })

  it("renders a stable blank image buffer", async () => {
    const first = await renderBlankKeyImage()
    const second = await renderBlankKeyImage()

    expect(first.equals(second)).toBe(true)
    expect(first.length).toBeGreaterThan(0)
  })

  it("Phase 7 keeps the shipped dark and light review typography setups observably different on the shared-text review path", async () => {
    const darkReviewBuffer = await renderTextImage({
      text: "WIDE TYPE",
      theme: createPhase7ReviewTheme("dark"),
    })
    const lightReviewBuffer = await renderTextImage({
      text: "WIDE TYPE",
      theme: createPhase7ReviewTheme("light"),
    })

    expect(countRegionDiffs(darkReviewBuffer, lightReviewBuffer, { height: 20, width: 54, x: 10, y: 24 })).toBeGreaterThan(140)
  })

  it("Phase 7 honors the clip-only override for long shared text instead of spilling", async () => {
    const shortBuffer = await renderTextImage({ text: "I", theme: createTheme() })
    const longBuffer = await renderTextImage({
      text: "CLOCK LABEL THAT SHOULD CLIP CLEANLY",
      theme: createTheme(),
    })

    expect(countRegionDiffs(shortBuffer, longBuffer, { height: 18, width: 44, x: 18, y: 29 })).toBeGreaterThan(150)
    expect(countRegionDiffs(shortBuffer, longBuffer, { height: 20, width: 8, x: 64, y: 26 })).toBe(0)
  })

  it("renders visible pixels inside the icon region for shipped bundled svg assets", async () => {
    const iconPath = resolve(process.cwd(), "../../builtin-addons/emoji-selector/assets/favorites.svg")

    const iconBuffer = await renderTextImage({ text: "Emoji", icon: iconPath })
    const noIconBuffer = await renderTextImage({ text: "Emoji" })

    expect(iconBuffer.length).toBe(72 * 72 * 3)
    expect(iconBuffer.equals(noIconBuffer)).toBe(false)
    expect(countRegionDiffs(iconBuffer, noIconBuffer, { height: 36, width: 36, x: 18, y: 14 })).toBeGreaterThan(150)
  })

  it("renders toggle variants with badge metadata", async () => {
    const defaultBuffer = await renderTextImage({ text: "Active" })
    const toggleBuffer = await renderTextImage({ text: "Active", subtitle: "ON", variant: "toggle" })

    expect(defaultBuffer.equals(toggleBuffer)).toBe(false)
  })

  it("renders metric variants with progress and value text", async () => {
    const defaultBuffer = await renderTextImage({ text: "CPU" })
    const metricBuffer = await renderTextImage({ text: "CPU", displayValue: "48%", progress: 48, variant: "metric" })

    expect(defaultBuffer.equals(metricBuffer)).toBe(false)
  })

  it("renders text-only metric variants without the progress layout", async () => {
    const textOnlyBuffer = await renderTextImage({ text: "RAM", displayValue: "62%", variant: "metric" })
    const progressBuffer = await renderTextImage({ text: "RAM", displayValue: "62%", progress: 62, variant: "metric" })

    expect(textOnlyBuffer.equals(progressBuffer)).toBe(false)
  })

  it("renders a stable fan unavailable layout", async () => {
    const defaultBuffer = await renderTextImage({ text: "Fan" })
    const fanBuffer = await renderTextImage({ text: "Fan", detailLines: ["Unavailable"], variant: "fan" })

    expect(defaultBuffer.equals(fanBuffer)).toBe(false)
  })

  it("renders media metadata across multiple lines", async () => {
    const defaultBuffer = await renderTextImage({ text: "Music" })
    const mediaBuffer = await renderTextImage({
      detailLines: ["Track Title", "Artist Name", "01:24 / 03:58"],
      subtitle: "PLAYING",
      text: "Music",
      variant: "media",
    })

    expect(defaultBuffer.equals(mediaBuffer)).toBe(false)
  })

  it("renders emoji variants with deterministic ascii-safe content", async () => {
    const defaultBuffer = await renderTextImage({ text: "GRIN", subtitle: "Favorites" })
    const emojiBuffer = await renderTextImage({ text: "GRIN", subtitle: "Favorites", variant: "emoji" })

    expect(defaultBuffer.equals(emojiBuffer)).toBe(false)
  })

  it("renders analog clock variants as a bespoke non-default visual", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-15T09:41:12.000Z"))

    const defaultBuffer = await renderTextImage({ text: "Clock" })
    const analogBuffer = await renderTextImage({ variant: "analog-clock" })

    expect(defaultBuffer.equals(analogBuffer)).toBe(false)
    expect(countRegionDiffs(defaultBuffer, analogBuffer, { height: 48, width: 48, x: 12, y: 12 })).toBeGreaterThan(500)
  })

  it("renders different analog hand positions for different times", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-15T09:41:12.000Z"))
    const firstBuffer = await renderTextImage({ variant: "analog-clock" })

    vi.setSystemTime(new Date("2026-05-15T09:41:47.000Z"))
    const secondBuffer = await renderTextImage({ variant: "analog-clock" })

    expect(firstBuffer.equals(secondBuffer)).toBe(false)
    expect(countRegionDiffs(firstBuffer, secondBuffer, { height: 42, width: 42, x: 15, y: 15 })).toBeGreaterThan(60)
  })

  it("protects the Phase 8 shipped review path with the real analog clock contract", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-15T09:41:12.000Z"))

    const reviewAnalogBuffer = await renderTextImage({ theme: createPhase8ReviewTheme(), variant: "analog-clock" })
    const reviewFallbackBuffer = await renderTextImage({ text: "09:41:12", theme: createPhase8ReviewTheme() })

    expect(reviewAnalogBuffer.equals(reviewFallbackBuffer)).toBe(false)
    expect(countRegionDiffs(reviewAnalogBuffer, reviewFallbackBuffer, { height: 52, width: 52, x: 10, y: 10 })).toBeGreaterThan(700)
  })
})
