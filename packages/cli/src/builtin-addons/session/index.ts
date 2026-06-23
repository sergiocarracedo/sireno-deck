import type { SirenoAddon } from "@/addon/api-types.ts";

import { lockedDeckDef } from "./locked-deck.ts";
import { coreSessionInfoButton } from "./session-info.ts";

export const sessionAddon: SirenoAddon = {
  apiVersion: 3,
  name: "session",
  buttons: [coreSessionInfoButton],
  decks: [lockedDeckDef],
};

export { coreSessionInfoButton } from "./session-info.ts";
export { sessionTimeButton } from "./time-button.tsx";
export { lockedDeckDef };
