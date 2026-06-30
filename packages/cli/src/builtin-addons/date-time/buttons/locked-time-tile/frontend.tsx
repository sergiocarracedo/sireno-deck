import type { AddonFrontendButton } from "@/addon/api";
import { Text } from "@/ui/index";

import { useNow } from "../../shared/use-now";

const INTERVAL_MS = 1000;

type Slot =
  | "hour"
  | "hour-tens"
  | "hour-ones"
  | "separator"
  | "minute"
  | "minute-tens"
  | "minute-ones";

const formatLockedCharacter = (slot: Slot, now: Date): string => {
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  switch (slot) {
    case "hour":
      return h;
    case "hour-tens":
      return h[0] ?? "0";
    case "hour-ones":
      return h[1] ?? "0";
    case "separator":
      return ":";
    case "minute":
      return m;
    case "minute-tens":
      return m[0] ?? "0";
    case "minute-ones":
      return m[1] ?? "0";
  }
};

const LockedTimeTileButtonFrontend: AddonFrontendButton = ({ config }) => {
  const now = useNow(INTERVAL_MS);
  const slot = (config as { slot: Slot }).slot;
  return (
    <span className="flex h-full w-full items-center justify-center">
      <Text size="lg" tone="fg" className="font-mono">
        {formatLockedCharacter(slot, now)}
      </Text>
    </span>
  );
};

export default LockedTimeTileButtonFrontend;