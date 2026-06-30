import { useEffect, useState } from "react";

import { Text } from "@/ui/index";
import type { AddonFrontendButton } from "@/addon/api";

import { formatDigitalDateTimeLabel } from "../format";

const useNow = (intervalMs: number): Date => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
};

const INTERVAL_MS = 1000;

export const TimeButtonFrontend: AddonFrontendButton = ({ config }) => {
  const now = useNow(INTERVAL_MS);
  const variant = (config as { variant?: "default" | "big" }).variant ?? "default";
  const format = variant === "big" ? "<2xl>HH</2xl><dim>.</dim>mm" : "HH:mm";
  return (
    <span className="flex h-full w-full items-center justify-center">
      <Text size={variant === "big" ? "lg" : "md"} tone="fg">
        {formatDigitalDateTimeLabel(format, now)}
      </Text>
    </span>
  );
};
