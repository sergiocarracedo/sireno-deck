import { z } from "zod";

export default z
  .object({
    action: z.enum(["up", "down", "set"]).optional().default("up"),
    value: z.number().int().min(0).max(100).optional(),
  })
  .strict();