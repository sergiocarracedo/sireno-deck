import { useAddonChannel } from "sireno-deck-2/react";

interface MediaState {
  readonly title: string | null;
  readonly artist: string | null;
  readonly isPlaying: boolean;
  readonly volume: number;
  readonly canGoNext: boolean;
  readonly canGoPrev: boolean;
}

const Component = () => {
  const { data } = useAddonChannel<MediaState>("media-player:state");
  if (data === null || data === undefined) {
    return (
      <span className="flex h-full w-full items-center justify-center font-mono text-xs text-muted">
        No media
      </span>
    );
  }
  return (
    <span className="grid h-full w-full grid-cols-2 divide-x divide-fg/10">
      <span className="flex flex-col items-center justify-center p-1">
        <span className="text-[9px] uppercase tracking-wider text-muted">Now playing</span>
        <span className="truncate text-[10px] text-fg">{data.title ?? "—"}</span>
        <span className="truncate text-[9px] text-muted">{data.artist ?? ""}</span>
        <span className="text-[10px] text-accent">{data.isPlaying ? "Playing" : "Paused"}</span>
      </span>
      <span className="flex flex-col items-center justify-center p-1">
        <span className="text-[9px] uppercase tracking-wider text-muted">Volume</span>
        <span className="block h-1.5 w-3/4 overflow-hidden rounded bg-bar">
          <span
            className="block h-full bg-accent"
            style={{ width: `${Math.max(0, Math.min(100, data.volume))}%` }}
          />
        </span>
        <span className="text-[10px] text-fg">{data.volume.toFixed(0)}%</span>
      </span>
    </span>
  );
};

export default Component;
