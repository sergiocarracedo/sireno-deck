import manifestJson from "./sirenodeck.json" with { type: "json" };
import type ManifestType from "./index.d.ts";

export const manifest: ManifestType = manifestJson as ManifestType;
export default manifest;
export const internalSettingsAddon = manifest;