import { useEffect, useState } from "react";

import { ChannelRegistry } from "./registry.ts";
import type { ChannelPayload } from "@/api/addon.ts";

export interface UseAddonChannelReturn<T = unknown> {
  data: T | undefined;
}

export const useAddonChannel = <T = unknown>(channel: string): UseAddonChannelReturn<T> => {
  const [data, setData] = useState<T | undefined>(() =>
    ChannelRegistry.instance().last<T>(channel),
  );

  useEffect(() => {
    return ChannelRegistry.instance().subscribe<T>(channel, (payload) => {
      setData(payload);
    });
  }, [channel]);

  return { data };
};

export type { ChannelRegistry, ChannelPayload };
