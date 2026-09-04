import type { AddonButtonTypeService } from "@/addon/api"
import { configSchema } from "./config"

export default {
  configSchema,
  onTap: async ({
    methods,
  }: {
    methods: Record<string, (...args: unknown[]) => unknown>
  }) => {
    await methods["media:toggle"]?.()
  },
  onDblTap: async ({ methods }) => {
    await methods["media:previous"]?.()
  },
  onHold: async ({ methods }) => {
    await methods["media:next"]?.()
  },
} satisfies AddonButtonTypeService
