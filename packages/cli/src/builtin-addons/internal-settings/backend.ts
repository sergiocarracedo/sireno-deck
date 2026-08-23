import type pino from "pino"

import { AddonServiceContext, AddonGlobalService } from "@/addon/api"
import {
  createBrightnessProvider,
  type BrightnessProvider,
} from "@/builtin-addons/brightness/providers"

let brightnessProvider: BrightnessProvider | null = null

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
  },
  onLoad: (ctx: AddonServiceContext) => {
    // ponytail: brightness providers speak the system-provider CommandExecutor
    // dialect (command + args array); the addon executor runs a single shell
    // string. Quote args and bridge the two — per-command timeouts are not
    // needed for these one-shot probes.
    const shellQuote = (value: string): string =>
      `'${value.replaceAll("'", `'\\''`)}'`
    const executor = {
      run: async (command: string, args: ReadonlyArray<string>) =>
        ctx.executor.run([command, ...args].map(shellQuote).join(" ")),
    }
    brightnessProvider = createBrightnessProvider({
      executor,
      platform: process.platform,
      logger: noOpLogger,
    })
  },
  onUnload: () => {
    brightnessProvider = null
  },
}
