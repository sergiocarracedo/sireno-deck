export interface TapIndicatorProps {
  active: boolean;
  className?: string;
}

export const TapIndicator = ({ active, className }: TapIndicatorProps) => (
  <span
    aria-hidden="true"
    className={[
      "inline-block h-1.5 w-1.5 rounded-full transition-opacity duration-100",
      active ? "bg-accent opacity-100" : "bg-muted opacity-40",
      className ?? "",
    ]
      .filter(Boolean)
      .join(" ")}
  />
);

export const TapIndicatorDefaultExport = TapIndicator;
