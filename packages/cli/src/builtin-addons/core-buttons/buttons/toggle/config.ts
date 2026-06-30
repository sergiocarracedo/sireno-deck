import { z } from "zod";

export default z.object({
  key: z.string().min(1),
  default: z.boolean().default(false),
});