import { useCallback } from "react";

import { ChannelRegistry } from "./registry";

export interface UseButtonActionReturn {
  tap: (buttonId: string) => void;
  dblTap: (buttonId: string) => void;
  hold: (buttonId: string) => void;
}

export const useButtonAction = (): UseButtonActionReturn => {
  const tap = useCallback((buttonId: string) => {
    ChannelRegistry.instance().publish("runtime:button-tap", { buttonId });
  }, []);
  const dblTap = useCallback((buttonId: string) => {
    ChannelRegistry.instance().publish("runtime:button-dblTap", { buttonId });
  }, []);
  const hold = useCallback((buttonId: string) => {
    ChannelRegistry.instance().publish("runtime:button-hold", { buttonId });
  }, []);
  return { tap, dblTap, hold };
};
