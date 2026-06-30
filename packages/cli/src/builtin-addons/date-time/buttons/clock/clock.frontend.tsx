import { Text } from "@/ui/index";
import type { AddonFrontendButton } from "@/addon/api";
import { useNow } from '../../shared/use-now'
const formatTimeWithTZ = (date: Date, timeZone: string | undefined, showSeconds: boolean): string => {
  const fmt = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    ...(showSeconds ? { second: "2-digit" } : {}),
    hour12: false,
    ...(timeZone ? { timeZone } : {}),
  });
  return fmt.format(date);
};
const INTERVAL_MS = 1000;
export const ClockButtonFrontend: AddonFrontendButton = ({ config }) => {
  const now = useNow(INTERVAL_MS);
  const { time_zone, showSeconds } = config as { time_zone?: string; showSeconds?: boolean };
  const time = formatTimeWithTZ(now, time_zone, showSeconds ?? false);
  return (
    <span className="flex h-full w-full items-center justify-center">
      <Text size="lg" tone="fg" className="font-mono">
        {time}
      </Text>
    </span>
  );
};