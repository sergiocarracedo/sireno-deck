import { z } from "zod";

import type { AddonDeckFactory, NewAddonManifest } from "@/addon/api";

import { SessionInfoButtonFrontend, sessionInfoButtonBackend } from "./buttons/session-info";
import { SessionTimeButtonFrontend, sessionTimeButtonBackend } from "./buttons/time";

const sessionLockedConfigSchema = z.object({
  timeFormat: z.string().default("HH:mm"),
});

export type SessionLockedConfig = z.infer<typeof sessionLockedConfigSchema>;

const sessionLockedDeckFactory: AddonDeckFactory = (page: number) => ({
  name: "Locked",
  buttons: Array.from({ length: 5 }, (_, i) => ({
    id: `time-${i}`,
    type: "session:time",
    config: { format: "HH:mm" },
    position: i + page * 5,
  })),
});

export const manifest: NewAddonManifest = {
  apiVersion: 3,
  name: "session",
  buttonTypes: {
    "core:session-info": {
      frontend: SessionInfoButtonFrontend,
      backend: sessionInfoButtonBackend,
    },
    "session:time": {
      frontend: SessionTimeButtonFrontend,
      backend: sessionTimeButtonBackend,
    },
  },
  decks: {
    "session:locked": sessionLockedDeckFactory,
  },
};

export const sessionAddon = manifest;
export default sessionAddon;
export const SessionInfoButtonBackend = sessionInfoButtonBackend;
export const SessionTimeButtonBackend = sessionTimeButtonBackend;
export { sessionLockedConfigSchema, type SessionLockedConfig };
