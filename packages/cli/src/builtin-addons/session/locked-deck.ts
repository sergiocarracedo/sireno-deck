import { z } from "zod";

import type { AddonDeckDefinition } from "@/addon/api";

export const sessionLockedConfigSchema = z.object({
  timeFormat: z.string().default("HH:mm"),
});

export type SessionLockedConfig = z.infer<typeof sessionLockedConfigSchema>;

export const lockedDeckDef: AddonDeckDefinition = {
  type: "session-locked",
  configSchema: sessionLockedConfigSchema,
  createDecks: ({ config }) => {
    const cfg = config as { timeFormat?: string };
    return {
      "session:locked": {
        name: "Locked",
        buttons: Array.from({ length: 5 }, (_, i) => ({
          id: `time-${i}`,
          type: "session:time",
          config: { format: cfg.timeFormat ?? "HH:mm" },
          position: i,
        })),
      },
    };
  },
};
