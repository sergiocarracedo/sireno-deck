export interface LabelValueRow {
  label: string;
  value: string;
  tone?: "fg" | "muted" | "accent";
}

export interface LabelValueListProps {
  rows: LabelValueRow[];
}

export const LabelValueList = ({ rows }: LabelValueListProps) => {
  const visible = rows.slice(0, 4);
  return (
    <div className="flex h-full w-full flex-col justify-center gap-1 p-3">
      {visible.map((row, idx) => (
        <div
          key={idx}
          className="flex min-w-0 items-baseline justify-between gap-2 font-mono text-xs"
        >
          <span className="truncate text-muted">{row.label}</span>
          <span
            className={[
              "truncate tabular-nums",
              row.tone === "accent"
                ? "text-accent"
                : row.tone === "muted"
                  ? "text-muted"
                  : "text-fg",
            ].join(" ")}
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export const LabelValueListDefaultExport = LabelValueList;
