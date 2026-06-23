import type { AddonButtonTypeDefinition } from "@/addon/api.ts";
import type { SirenoAddon } from "@/addon/api-types.ts";

import { coreActionButton } from "./action.ts";
import { coreChangeDeckButton } from "./change-deck.ts";
import { coreMediaSampleButton } from "./media-sample.ts";
import { coreToggleButton } from "./toggle.ts";

export const coreButtonsAddon: SirenoAddon = {
  apiVersion: 3,
  name: "core-buttons",
  buttons: [
    coreActionButton,
    coreChangeDeckButton,
    coreToggleButton,
    coreMediaSampleButton,
  ] as unknown as AddonButtonTypeDefinition[],
};

export { coreActionButton } from "./action.ts";
export { coreChangeDeckButton } from "./change-deck.ts";
export { coreToggleButton } from "./toggle.ts";
export { coreMediaSampleButton } from "./media-sample.ts";
