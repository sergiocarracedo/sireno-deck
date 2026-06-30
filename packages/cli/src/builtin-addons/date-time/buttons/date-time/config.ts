import { z } from "zod";

export default z
  .object({
    format: z.string().min(1).optional().default("DD/MM/YYYY HH:mm:ss"),
  })
  .strict();