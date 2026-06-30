import { z } from "zod";

export default z
  .object({
    showSeconds: z.boolean().optional().default(false),
    time_zone: z.string().min(1).optional(),
  })
  .strict();