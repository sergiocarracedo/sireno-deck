import { useAddonChannel } from "sireno-deck-2/react";

interface ComponentProps {
  readonly config: unknown;
  readonly state: unknown;
}

interface BrightnessState {
  readonly value: number;
  readonly max: number;
}

const Component = ({ config }: ComponentProps) => {
  const { action } = (config as { action?: "up" | "down" | "set" }) ?? {};
  const { data } = useAddonChannel<BrightnessState>("brightness:current");
  if (data === undefined) {
    return (
      <span className="flex h-full w-full items-center justify-center font-mono text-xs text-muted">
        —
      </span>
    );
  }
  const pct = Math.max(0, Math.min(100, (data.value / (data.max || 100)) * 100));
  return (
    <span className="flex h-full w-full flex-col items-stretch justify-center gap-1 p-2">
      <span className="flex items-baseline justify-between font-mono text-[10px] text-muted">
        <span>Brightness</span>
        <span className="text-fg">{pct.toFixed(0)}%</span>
      </span>
      <span className="block h-2 w-full overflow-hidden rounded bg-bar">
        <span className="block h-full bg-accent" style={{ width: `${pct}%` }} />
      </span>
      <span className="text-center text-[9px] uppercase tracking-wider text-muted">
        Tap: {action ?? "up"}
      </span>
    </span>
  );
};

export default Component;
