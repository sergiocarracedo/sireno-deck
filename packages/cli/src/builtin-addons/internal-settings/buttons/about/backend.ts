import type { Store } from "@/core/store";
import type { AddonButtonBackend } from "@/addon/api";

export default {
  onTap: async ({ methods, buttonId }) => {
    const ctx = methods as unknown as { store?: Store };
    if (ctx.store) {
      ctx.store
        .addonScope<number>("internal-settings")
        .set(`${buttonId}:viewedAt`, Date.now());
    }
  },
} satisfies AddonButtonBackend;