import type { AddonFrontendButton } from '@/addon/api'
import { Icon, TapIndicator, Text } from '@/ui'

type Config = {
  currentPage: number
  totalPages: number
  prevDeckId: string
  nextDeckId: string
}

const NextAction = (
  <div className="flex flex-row items-center gap-0.5">
    <TapIndicator type="tap" size="xs" />
    <Icon source="icon://chevron-right" />
  </div>
)

const PrevAction = (
  <div className="flex flex-row items-center gap-0.5">
    <Icon source="icon://chevron-left" />
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
  <Text size="sm" tone="muted">
    *{current}*/{total}
  </Text>
)

const PageNavButtonFrontend: AddonFrontendButton<Config> = ({ config }) => {
  const { currentPage, totalPages } = config
  const isFirstPage = currentPage === 1
  const isLastPage = currentPage === totalPages
  //className={isFirstPage ? 'invisible' : 'visible'}

  return (
    <div className="relative size-full flex flex-col gap-2">
      <div>{PrevAction}</div>
      <PageIndicator current={currentPage} total={totalPages} />
      <div className={isLastPage ? 'invisible' : 'visible'}>{NextAction}</div>
    </div>
  )
}

export default PageNavButtonFrontend
