import { z } from "zod"

export const configSchema = z.object({
  currentPage: z.number().min(1),
  totalPages: z.number().min(1),
  prevDeckId: z.string().min(1),
  nextDeckId: z.string().min(1),
})
export type ConfigSchema = z.infer<typeof configSchema>
