import { z } from "zod";
import type { Methods } from "@/deck/methods";
import type { AddonButtonTypeService } from "@/addon/api";

import { configSchema } from "./config";

type Config = z.infer<typeof configSchema>;

export default {
  configSchema,
  onTap: async ({ config, methods }: { config: Config; methods: Methods }) => {
    methods.navigateToDeck({ id: config.deck, addToHistory: config.addToHistory });
  },
} satisfies AddonButtonTypeService;
