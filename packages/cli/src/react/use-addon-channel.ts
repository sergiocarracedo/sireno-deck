import { useEffect, useState } from "react";

import { ChannelRegistry } from "./registry.ts";
import type { ChannelPayload } from "@/api/addon.ts";

export interface UseAddonChannelReturn<T = unknown> {
  value: T | undefined;
}

export const useAddonChannel = <T = unknown>(channel: string): UseAddonChannelReturn<T> => {
  const [value, setValue] = useState<T | undefined>(() =>
    ChannelRegistry.instance().last<T>(channel),
  );

  useEffect(() => {
    return ChannelRegistry.instance().subscribe<T>(channel, (payload) => {
      setValue(payload);
    });
  }, [channel]);

  return { value };
};

export type { ChannelRegistry, ChannelPayload };
