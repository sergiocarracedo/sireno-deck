import type { AddonPoller } from "@/addon/api-types";

export const createPoller = (): AddonPoller => ({
  channels: [
    {
      channel: "date-time:now",
      intervalMs: 1_000,
      poll: () => ({ now: Date.now() }),
    },
  ],
});
