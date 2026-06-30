import { useAddonChannel, type ChannelRegistry, type ChannelPayload } from "./use-addon-channel";

export { useAddonChannel, type ChannelRegistry, type ChannelPayload };

export interface UseButtonStateReturn<T = unknown> {
  readonly state: T | undefined;
}

export const useButtonState = <T = unknown>(
  addonName: string,
  buttonType: string,
  buttonId: string,
): UseButtonStateReturn<T> => {
  const channel = `${addonName}:${buttonType}:${buttonId}`;
  const { data } = useAddonChannel<T>(channel);
  return { state: data };
};

export const NullButton = (): null => null;
