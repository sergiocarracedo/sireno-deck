import type { ReactNode } from "react";

export type TextTone = "fg" | "muted" | "accent";

export interface TextProps {
  children: ReactNode;
  tone?: TextTone;
  size?: "xs" | "sm" | "md" | "lg";
  weight?: "normal" | "medium" | "bold";
  truncate?: boolean;
  className?: string;
}

const TONE_CLASS: Record<TextTone, string> = {
  fg: "text-fg",
  muted: "text-muted",
  accent: "text-accent",
};

const SIZE_CLASS: Record<NonNullable<TextProps["size"]>, string> = {
  xs: "text-[10px] leading-tight",
  sm: "text-xs leading-snug",
  md: "text-sm leading-snug",
  lg: "text-base leading-snug",
};

const WEIGHT_CLASS: Record<NonNullable<TextProps["weight"]>, string> = {
  normal: "font-normal",
  medium: "font-medium",
  bold: "font-semibold",
};

export const Text = ({
  children,
  tone = "fg",
  size = "sm",
  weight = "normal",
  truncate = false,
  className,
}: TextProps) => (
  <span
    className={[
      TONE_CLASS[tone],
      SIZE_CLASS[size],
      WEIGHT_CLASS[weight],
      truncate ? "truncate" : "",
      className ?? "",
    ]
      .filter(Boolean)
      .join(" ")}
  >
    {children}
  </span>
);

export const TextDefaultExport = Text;
