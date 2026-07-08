import type { AddonButtonTypeService } from "@/addon/api";

import { configSchema } from "./config";

export default {
  configSchema,
  onTap: ({ publish }) => {
    publish("runtime:navigate-deck", { deckId: "main", addToHistory: true });
  },
} satisfies AddonButtonTypeService;
