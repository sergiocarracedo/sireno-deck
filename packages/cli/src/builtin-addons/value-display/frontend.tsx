import { useAddonChannel } from "sireno-deck-2/react";

interface ValueEntry {
  readonly label: string;
  readonly value: string;
  readonly units?: string;
}

interface ValuesState {
  readonly values: ReadonlyArray<ValueEntry>;
}

const Component = () => {
  const { data } = useAddonChannel<ValuesState>("value-display:values");
  const values = data?.values ?? [];
  if (values.length === 0) {
    return (
      <span className="flex h-full w-full items-center justify-center font-mono text-xs text-muted">
        Loading…
      </span>
    );
  }
  return (
    <span className="flex h-full w-full flex-col items-stretch justify-center gap-0.5 p-1.5 font-mono text-[10px]">
      {values.slice(0, 4).map((v, i) => (
        <span key={`${v.label}-${i}`} className="flex justify-between gap-2">
          <span className="text-muted">{v.label}</span>
          <span className="text-fg">
            {v.value}
            {v.units !== undefined && v.units.length > 0 ? v.units : ""}
          </span>
        </span>
      ))}
    </span>
  );
};

export default Component;
