import type { ReactElement } from "react";
import { statusesMeta } from "./status-meta";
import type { MediaButtonStatus } from "./status-meta";

export const ProgressBar = (props: {
  className?: string;
  status: MediaButtonStatus;
  value: number;
}): ReactElement => {
  const meta = statusesMeta[props.status] ?? statusesMeta.notAvailable;
  return (
    <div className={`h-0.5 w-full ${meta.bgColorAlt} ${props.className ?? ""}`}>
      <div
        className={`h-full ${meta.bgColor}`}
        style={{ width: `${Math.min(100, Math.max(0, props.value))}%` }}
      />
    </div>
  );
};
