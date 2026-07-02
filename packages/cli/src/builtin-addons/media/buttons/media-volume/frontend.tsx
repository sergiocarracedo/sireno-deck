import type { AddonFrontendButton } from "@/addon/api";
import { ConfigSchema } from "./config";

const MediaVolumeButtonFrontend: AddonFrontendButton<ConfigSchema> = ({ config }) => {
  const direction = config.direction ?? "up";
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
