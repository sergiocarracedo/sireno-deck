import type { ReactNode } from "react";

export interface LabelProps {
  children: ReactNode;
  className?: string;
  uppercase?: boolean;
  truncate?: boolean;
}

export const Label = ({ children, className, uppercase = true, truncate = true }: LabelProps) => (
  <span
    className={[
      "font-mono tracking-wider text-muted",
      uppercase ? "uppercase" : "",
      truncate ? "truncate" : "",
      "text-[10px] leading-none",
      className ?? "",
    ]
      .filter(Boolean)
      .join(" ")}
  >
    {children}
  </span>
);

export const LabelDefaultExport = Label;
