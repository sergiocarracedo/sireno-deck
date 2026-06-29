import type { AddonButtonTypeDefinition } from "@/addon/api";
import type { SirenoAddon } from "@/addon/api-types";

import { coreActionButton } from "./action";
import { coreChangeDeckButton } from "./change-deck";
import { coreMediaSampleButton } from "./media-sample";
import { coreToggleButton } from "./toggle";

export const coreButtonsAddon: SirenoAddon = {
  apiVersion: 3,
  name: "core-buttons",
  frontend: { main: "./frontend" },
  buttons: [
    coreActionButton,
    coreChangeDeckButton,
    coreToggleButton,
    coreMediaSampleButton,
  ] as unknown as AddonButtonTypeDefinition[],
};

export { coreActionButton } from "./action";
export { coreChangeDeckButton } from "./change-deck";
export { coreToggleButton } from "./toggle";
export { coreMediaSampleButton } from "./media-sample";
