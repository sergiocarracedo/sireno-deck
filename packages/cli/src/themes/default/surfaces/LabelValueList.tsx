import { Text } from "../components/Text.tsx";

export interface LabelValueRow {
  label: string;
  value: string;
  tone?: "fg" | "muted" | "accent";
}

export interface LabelValueListProps {
  rows: LabelValueRow[];
}

const VALUE_TONE: Record<NonNullable<LabelValueRow["tone"]>, string> = {
  fg: "fg",
  muted: "muted",
  accent: "accent",
};

export const LabelValueList = ({ rows }: LabelValueListProps) => {
  const visible = rows.slice(0, 4);
  return (
    <div className="flex h-full w-full flex-col justify-center gap-1 p-3" data-sireno-ui-label-value-list="true">
      {visible.map((row, idx) => (
        <div
          key={idx}
          className="flex min-w-0 items-baseline justify-between gap-2"
        >
          <Text size="xs" tone="muted" typography="aux" fit="ellipsis">
            {row.label}
          </Text>
          <Text size="xs" tone={VALUE_TONE[row.tone ?? "fg"]} fit="ellipsis">
            {row.value}
          </Text>
        </div>
      ))}
    </div>
  );
};

export const LabelValueListDefaultExport = LabelValueList;
