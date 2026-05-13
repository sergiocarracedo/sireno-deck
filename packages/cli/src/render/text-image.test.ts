import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { renderBlankKeyImage, renderTextImage } from "./text-image.js"

describe("text-image", () => {
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

  it("renders visibly different buffers for dark and light themes", async () => {
    const darkBuffer = await renderTextImage({
      text: "Clock",
      theme: {
        accent: "#f59e0b",
        background: "#10161f",
        danger: "#fb7185",
        foreground: "#eef2f7",
        name: "dark",
        primary: "#7dd3fc",
        success: "#34d399",
      },
    })
    const lightBuffer = await renderTextImage({
      text: "Clock",
      theme: {
        accent: "#c2410c",
        background: "#e8edf4",
        danger: "#dc2626",
        foreground: "#16202b",
        name: "light",
        primary: "#2563eb",
        success: "#059669",
      },
    })

    expect(darkBuffer.equals(lightBuffer)).toBe(false)
  })

  it("renders icon-backed cards when the icon file exists", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "sireno-icon-"))
    const originalCwd = process.cwd()

    try {
      const iconPath = join(tempDir, "shell.svg")
      writeFileSync(
        iconPath,
        '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="12" fill="#2563eb" /></svg>',
      )
      process.chdir(tempDir)

      const buffer = await renderTextImage({ text: "Shell", icon: "./shell.svg" })

      expect(buffer.length).toBe(72 * 72 * 3)
    } finally {
      process.chdir(originalCwd)
      rmSync(tempDir, { recursive: true, force: true })
    }
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
})
