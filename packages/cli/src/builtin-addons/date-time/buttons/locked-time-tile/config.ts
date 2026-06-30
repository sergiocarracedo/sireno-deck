import { z } from "zod";

export default z
  .object({
    slot: z.enum([
      "hour",
      "hour-tens",
      "hour-ones",
      "separator",
      "minute",
      "minute-tens",
      "minute-ones",
    ]),
  })
  .strict();