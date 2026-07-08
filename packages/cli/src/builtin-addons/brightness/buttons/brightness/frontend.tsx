import { Text } from "@/ui/index";
import { useAddonChannel } from "@/api/react";
import type { AddonFrontendButton } from "@/addon/api";

interface BrightnessState {
  readonly value: number;
  readonly max: number;
}

const BrightnessButtonFrontend: AddonFrontendButton = ({ config }) => {
  const { action } = (config as { action?: "up" | "down" | "set" }) ?? {};
  const { data } = useAddonChannel<BrightnessState>("brightness:current");
  if (data === undefined) {
    return (
      <Text
        size="xs"
        tone="muted"
        typography="mono"
        className="flex h-full w-full items-center justify-center"
      >
        —
      </Text>
    );
  }
  const pct = Math.max(0, Math.min(100, (data.value / (data.max || 100)) * 100));
  return (
    <span className="flex h-full w-full flex-col items-stretch justify-center gap-1 p-2">
      <span className="flex items-baseline justify-between">
        <Text size="xs" tone="muted" fit="ellipsis">
          Brightness
        </Text>
        <Text size="xs" tone="fg">
          {pct.toFixed(0)}%
        </Text>
      </span>
      <span className="block h-1.5 w-full overflow-hidden rounded bg-bar">
        <span className="block h-full bg-accent" style={{ width: `${pct}%` }} />
      </span>
      <Text size="xs" tone="muted" className="text-center" typography="aux">
        Tap: {action ?? "up"}
      </Text>
    </span>
  );
};

export default BrightnessButtonFrontend;
export { BrightnessButtonFrontend };
