import { z } from "zod";

export default z.object({
  channel: z.string().min(1),
  fallback: z.unknown().optional(),
});