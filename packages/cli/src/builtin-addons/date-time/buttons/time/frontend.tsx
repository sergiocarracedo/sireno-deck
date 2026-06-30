import type { AddonFrontendButton } from "@/addon/api";
import { Text } from "@/ui/index";

import { formatDigitalDateTimeLabel } from "../../shared/format";
import { useNow } from "../../shared/use-now";

const INTERVAL_MS = 1000;

const TimeButtonFrontend: AddonFrontendButton = ({ config }) => {
  const now = useNow(INTERVAL_MS);
  const variant =
    (config as { variant?: "default" | "big" }).variant ?? "default";
  const format =
    variant === "big" ? "<2xl>HH</2xl><dim>.</dim>|mm" : "HH<dim>:</dim>mm";
  return (
    <span className="flex h-full w-full items-center justify-center">
      <Text size={variant === "big" ? "lg" : "md"} tone="fg">
        {formatDigitalDateTimeLabel(format, now)}
      </Text>
    </span>
  );
};

export default TimeButtonFrontend;