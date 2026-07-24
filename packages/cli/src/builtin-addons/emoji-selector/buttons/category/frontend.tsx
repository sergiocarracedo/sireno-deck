import { Label } from "@/ui"

import { AddonFrontendButton } from "@/addon"
import { ConfigSchema } from "./config"

const CategoryButtonFrontend: AddonFrontendButton<ConfigSchema> = ({
  config,
}) => {
  const iconRef = config.icon ?? "🙂"
  const labelRef = config.label ?? "Category"
  return (
    <span className="flex h-full w-full flex-col items-center justify-center gap-1">
      <span className="text-3xl leading-none">{iconRef}</span>
      <Label text={labelRef} variant="secondary" />
    </span>
  )
}

export default CategoryButtonFrontend
