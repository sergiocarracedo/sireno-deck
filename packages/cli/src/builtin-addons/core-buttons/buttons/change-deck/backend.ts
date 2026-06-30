import type { Methods } from "@/deck/methods";
import type { AddonButtonTypeBackend } from "@/addon/api";

import configSchema from "./config";

type Config = z.infer<typeof configSchema>;

export default {
  configSchema,
  onTap: async ({
    config,
    methods,
  }: {
    config: Config;
    methods: Methods;
  }) => {
    methods.navigateToDeck({ id: config.deck, addToHistory: config.addToHistory });
  },
} satisfies AddonButtonTypeBackend;