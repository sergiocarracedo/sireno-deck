import type { AddonButtonTypeBackend } from "@/addon/api";

import { configSchema } from "./config";

export default {
  configSchema,
  onTap: ({ publish }) => {
    publish("runtime:navigate-deck", { deckId: "emoji-selector", addToHistory: true });
  },
} satisfies AddonButtonTypeBackend;