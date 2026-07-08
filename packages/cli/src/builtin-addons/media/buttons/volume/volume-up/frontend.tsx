import type { AddonFrontendButton } from "@/addon/api";
import VolumeButtonFrontend from "../common/frontend";

const VolumeUpButtonFrontend: AddonFrontendButton<unknown> = ({ gesture }) => {
  return <VolumeButtonFrontend variant="up" gesture={gesture ?? null} />;
};

export default VolumeUpButtonFrontend;
