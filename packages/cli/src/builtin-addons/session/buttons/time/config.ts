import { z } from "zod";

export default z.object({
  format: z.string().default("HH:mm"),
});