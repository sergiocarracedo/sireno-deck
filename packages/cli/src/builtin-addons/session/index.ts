import type { SirenoAddon } from "@/addon/api-types";

import { lockedDeckDef } from "./locked-deck";
import { coreSessionInfoButton } from "./session-info";

export const sessionAddon: SirenoAddon = {
  apiVersion: 3,
  name: "session",
  buttons: [coreSessionInfoButton],
  decks: [lockedDeckDef],
};

export { coreSessionInfoButton } from "./session-info";
export { sessionTimeButton } from "./time-button";
export { lockedDeckDef };
