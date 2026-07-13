import type { AddonFrontendButton } from "@/addon/api"
import { IconLabelSurface, SplitActionSurface, TapIndicator } from "@/ui/index"

type Config = {
  currentPage: number
  totalPages: number
  prevDeckId: string
  nextDeckId: string
}

const NextAction = (
  <div className="flex flex-col items-center gap-0.5">
    <IconLabelSurface source="icon://chevron-right" label="Tap" />
    <TapIndicator type="tap" size="xs" />
  </div>
)

const PrevAction = (
  <div className="flex flex-col items-center gap-0.5">
    <IconLabelSurface source="icon://chevron-left" label="Hold" />
    <TapIndicator type="hold" size="xs" />
  </div>
)

const PageIndicator = ({
  current,
  total,
}: {
  current: number
  total: number
}) => (
  <span className="text-[10px] text-muted">
    {current}/{total}
  </span>
)

const PageNavButtonFrontend: AddonFrontendButton<Config> = ({ config }) => {
  const { currentPage, totalPages } = config
  const isFirstPage = currentPage === 1
  const isLastPage = currentPage === totalPages

  if (isFirstPage) {
    return (
      <div className="relative size-full">
        <div className="absolute -top-1 right-1">{NextAction}</div>
        <div className="flex h-full items-center justify-center">
          <PageIndicator current={currentPage} total={totalPages} />
        </div>
      </div>
    )
  }
  if (isLastPage) {
    return (
      <div className="relative size-full">
        <div className="flex h-full items-center justify-center">
          <PageIndicator current={currentPage} total={totalPages} />
        </div>
        <div className="absolute -bottom-1 left-1">{PrevAction}</div>
      </div>
    )
  }
  return (
    <div className="flex h-full w-full flex-col">
      <div className="relative flex-1">
        <SplitActionSurface
          primary={
            <IconLabelSurface source="icon://chevron-right" label="Tap" />
          }
          secondary={
            <IconLabelSurface source="icon://chevron-left" label="Hold" />
          }
          secondaryIndicatorType="hold"
        />
      </div>
      <div className="flex items-center justify-center pb-1">
        <PageIndicator current={currentPage} total={totalPages} />
      </div>
    </div>
  )
}

export default PageNavButtonFrontend
