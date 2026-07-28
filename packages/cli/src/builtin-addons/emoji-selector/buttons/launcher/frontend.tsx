import { Label } from "@/ui"

import { EMOJI_FONT_STACK, EMOJI_LAUNCHER_GRID } from "../../support.ts"

import type { AddonFrontendButton } from "@/addon/api"
import type { ConfigSchema } from "./config.ts"

const LauncherButtonFrontend: AddonFrontendButton<ConfigSchema> = ({
  config,
}) => (
  <div className="flex flex-col gap-1">
    <div
      className="grid grid-cols-3 grid-rows-2 w-15 h-10 gap-0 p-1"
      data-sireno-launcher-grid="true"
    >
      {EMOJI_LAUNCHER_GRID.map((char) => (
        <div
          className="-mx-1 -my-1 flex items-center justify-center text-md"
          data-sireno-launcher-cell="true"
          key={char}
          style={{ fontFamily: EMOJI_FONT_STACK }}
        >
          {char}
        </div>
      ))}
    </div>
    <Label text={config.label ?? "Emojis"} />
  </div>
)

export default LauncherButtonFrontend
