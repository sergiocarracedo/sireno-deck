import type pino from "pino"

import { AddonServiceContext, AddonGlobalService } from "@/addon/api"
import {
  createClipboardProvider,
  type ClipboardProvider,
} from "@/system/providers/clipboard"

import {
  createBrightnessProvider,
  type BrightnessProvider,
} from "@/builtin-addons/brightness/providers"

let brightnessProvider: BrightnessProvider | null = null
let clipboardProvider: ClipboardProvider | null = null

const clampStep = (step: unknown, fallback: number): number => {
  if (typeof step !== "number" || !Number.isFinite(step)) return fallback
  return Math.max(0, Math.min(100, step))
}

const noOpLogger = {
  info: () => undefined,
  warn: () => undefined,
} as unknown as pino.Logger

export const globalService: AddonGlobalService = {
  methods: {
    brightnessUp: async (...args: readonly unknown[]) => {
      if (brightnessProvider === null) return
      const step = clampStep(args[0], 5)
      const current = await brightnessProvider.getCurrent()
      await brightnessProvider.setBrightness(
        Math.min(100, current.value + step),
      )
    },
    brightnessDown: async (...args: readonly unknown[]) => {
      if (brightnessProvider === null) return
      const step = clampStep(args[0], 5)
      const current = await brightnessProvider.getCurrent()
      await brightnessProvider.setBrightness(Math.max(0, current.value - step))
    },
    pasteText: async (...args: readonly unknown[]) => {
      if (clipboardProvider === null) return
      const text = typeof args[0] === "string" ? args[0] : ""
      await clipboardProvider.writeText(text)
    },
  },
  onLoad: (ctx: AddonServiceContext) => {
    brightnessProvider = createBrightnessProvider({
      executor: ctx.executor,
      platform: process.platform,
      logger: noOpLogger,
    })
    clipboardProvider = createClipboardProvider({
      executor: ctx.executor,
      platform: process.platform,
      env: process.env as Readonly<Record<string, string>>,
      logger: noOpLogger,
    })
  },
  onUnload: () => {
    brightnessProvider = null
    clipboardProvider = null
  },
}
