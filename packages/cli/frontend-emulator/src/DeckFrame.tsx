import type { DeviceModelSpec } from "@sireno-deck-2/cli";

export interface DeckFrameProps {
  readonly deviceModel: DeviceModelSpec;
  readonly activeDeckId: string;
  readonly onKeyPress?: (keyIndex: number, type: "down" | "up") => void;
}

export const DeckFrame = ({
  deviceModel,
  activeDeckId,
  onKeyPress,
}: DeckFrameProps): React.ReactElement => {
  const { columns, rows, keyCount } = deviceModel;
  return (
    <div
      data-testid="deck-frame"
      data-deck={activeDeckId}
      data-key-count={keyCount}
      data-columns={columns}
      data-rows={rows}
      className="grid gap-2 rounded-xl border border-neutral-800 bg-neutral-900 p-4 shadow-lg"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(64px, 96px))` }}
    >
      {Array.from({ length: keyCount }, (_, i) => (
        <button
          key={i}
          type="button"
          data-testid={`deck-key-${i}`}
          data-key-index={i}
          onMouseDown={() => onKeyPress?.(i, "down")}
          onMouseUp={() => onKeyPress?.(i, "up")}
          onMouseLeave={(e) => {
            if (e.buttons === 1) onKeyPress?.(i, "up");
          }}
          className="aspect-square rounded border border-neutral-700 bg-neutral-800 text-xs text-neutral-500 transition hover:border-blue-500 hover:bg-neutral-700"
        >
          {i}
        </button>
      ))}
    </div>
  );
};
