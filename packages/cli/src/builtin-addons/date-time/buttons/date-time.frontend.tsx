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

export const DateTimeButtonFrontend: AddonFrontendButton = ({ config }) => {
  const now = useNow(INTERVAL_MS);
  const format = (config as { format?: string }).format ?? "DD/MM/YYYY HH:mm:ss";
  return (
    <span className="flex h-full w-full items-center justify-center">
      <Text size="lg" tone="fg">
        {formatDigitalDateTimeLabel(format, now)}
      </Text>
    </span>
  );
};
