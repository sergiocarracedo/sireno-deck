import { z } from "zod";

export default z
  .object({
    variant: z.enum(["default", "big"]).optional().default("default"),
  })
  .strict();