import type { ReactNode } from "react";

export interface ChipProps {
  children: ReactNode;
  tone?: "fg" | "accent" | "muted";
  size?: "sm" | "md";
  className?: string;
}

const TONE_CLASS: Record<NonNullable<ChipProps["tone"]>, string> = {
  fg: "bg-bg/80 text-fg ring-frame/30",
  accent: "bg-accent/15 text-accent ring-accent/30",
  muted: "bg-muted/10 text-muted ring-muted/20",
};

const SIZE_CLASS: Record<NonNullable<ChipProps["size"]>, string> = {
  sm: "px-1.5 py-0.5 text-[10px]",
  md: "px-2 py-1 text-xs",
};

export const Chip = ({ children, tone = "fg", size = "sm", className }: ChipProps) => (
  <span
    className={[
      "inline-flex items-center gap-1 rounded-full text-[10px] ring-1",
      TONE_CLASS[tone],
      SIZE_CLASS[size],
      className ?? "",
    ]
      .filter(Boolean)
      .join(" ")}
    data-sireno-ui-chip="true"
  >
    {children}
  </span>
);

export const ChipDefaultExport = Chip;
