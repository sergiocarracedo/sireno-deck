import type { AddonPoller } from "@/addon/api-types.ts";

export const createPoller = (): AddonPoller => ({
  channels: [
    {
      channel: "brightness:current",
      intervalMs: 2_000,
      poll: () => ({ value: 0, max: 100 }),
    },
  ],
});
