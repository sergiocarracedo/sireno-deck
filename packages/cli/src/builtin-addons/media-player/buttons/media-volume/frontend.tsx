import type { AddonFrontendButton } from "@/addon/api";

const MediaVolumeButtonFrontend: AddonFrontendButton = ({ config }) => {
  const direction =
    (config as { direction?: "up" | "down" }).direction ?? "up";
  const glyph = direction === "down" ? "🔉" : "🔊";
  const label = direction === "down" ? "Vol -" : "Vol +";
  return (
    <span className="flex h-full w-full flex-col items-center justify-center gap-1">
      <span className="text-3xl text-primary">{glyph}</span>
      <span className="text-xs text-fg">{label}</span>
    </span>
  );
};

export default MediaVolumeButtonFrontend;