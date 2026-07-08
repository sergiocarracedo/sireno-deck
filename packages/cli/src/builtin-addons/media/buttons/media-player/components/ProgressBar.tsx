import { cn } from "@/ui";
import type { ReactElement } from "react";
import type { MediaButtonStatus } from "./status-meta";
import { statusesMeta } from "./status-meta";

export const ProgressBar = (props: {
  className?: string;
  status: MediaButtonStatus;
  value: number;
}): ReactElement => {
  const bgColor = statusesMeta[props.status]?.bgColor || "bg-gray-500";
  const bgColorAlt = statusesMeta[props.status]?.bgColorAlt || "bg-gray-300";
  return (
    <div className={cn("h-2 w-full rounded-4xl", bgColorAlt, props.className)}>
      <div
        className={cn(bgColor, "h-2 rounded-4xl")}
        style={{ width: `${Math.min(100, Math.max(0, props.value))}%` }}
      />
    </div>
  );
};
