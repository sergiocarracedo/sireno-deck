import type { AddonFrontendButton } from '@/addon/api'
import VolumeButtonFrontend from '../common/frontend'

const VolumeDownButtonFrontend: AddonFrontendButton<unknown> = ({ gesture }) => {
  return <VolumeButtonFrontend variant="down" gesture={gesture ?? null} />
}

export default VolumeDownButtonFrontend