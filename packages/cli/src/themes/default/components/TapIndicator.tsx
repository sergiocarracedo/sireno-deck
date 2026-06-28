import { Text } from "./Text.tsx";

export interface TapIndicatorProps {
  active?: boolean;
  className?: string;
  type?: "tap" | "dbltap" | "hold";
  size?: "xs" | "sm" | "md";
}

const LABEL_MAP: Record<NonNullable<TapIndicatorProps["type"]>, string> = {
  tap: "TAP",
  dbltap: "TAPx2",
  hold: "HOLD",
};

const THEME_TYPES: Record<
  NonNullable<TapIndicatorProps["type"]>,
  { textTone: "fg" | "primary" | "accent"; bg: string }
> = {
  tap: { textTone: "fg", bg: "" },
  dbltap: { textTone: "accent", bg: "bg-accent/20" },
  hold: { textTone: "primary", bg: "bg-primary/20" },
};

export const TapIndicator = ({ className, type = "tap", size = "xs" }: TapIndicatorProps) => {
  const t = THEME_TYPES[type];
  return (
    <span
      className={[
        "sireno-tap inline-block rounded-sm border border-frame px-1",
        t.bg,
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-sireno-ui-tap-indicator="true"
    >
      <Text size={size} tone={t.textTone}>
        {LABEL_MAP[type]}
      </Text>
    </span>
  );
};

export const TapIndicatorDefaultExport = TapIndicator;
