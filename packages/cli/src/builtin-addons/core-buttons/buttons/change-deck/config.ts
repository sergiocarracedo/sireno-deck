import { z } from "zod";

export default z.object({
  deck: z.string().min(1),
  addToHistory: z.boolean().default(true),
});