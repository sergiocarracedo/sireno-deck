import type { AddonFrontendButton } from "@/addon/api"
import { IconLabelSurface } from "@/ui/index"

import { configSchema } from "./config"

type Config = {
  currentPage: number
  totalPages: number
  prevDeckId: string
  nextDeckId: string
}

const PageNavButtonFrontend: AddonFrontendButton<unknown> = ({ config }) => {
  const { currentPage, totalPages } = config as Config
  const isFirstPage = currentPage === 1
  const isLastPage = currentPage === totalPages
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-0.5">
      <div className="flex flex-col items-center">
        <IconLabelSurface
          source="icon://chevron-right"
          label={isLastPage ? "—" : "Tap"}
        />
      </div>
      <span className="text-[10px] text-muted">
        {currentPage}/{totalPages}
      </span>
      <div className="flex flex-col items-center">
        <IconLabelSurface
          source="icon://chevron-right"
          label={isFirstPage ? "—" : "Dbl"}
        />
      </div>
    </div>
  )
}

export default PageNavButtonFrontend
