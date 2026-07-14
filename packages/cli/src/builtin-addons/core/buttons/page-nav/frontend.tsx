import type { AddonFrontendButton } from '@/addon/api'
import { cn, Icon, TapIndicator, TapIndicatorType, Text } from '@/ui'

type Config = {
  currentPage: number
  totalPages: number
  prevDeckId: string
  nextDeckId: string
}

type NavActionProps = {
  dir: 'next' | 'prev'
}

const icons: Record<NavActionProps['dir'], string> = {
  next: 'chevron-right',
  prev: 'chevron-left',
}

const tapTypes: Record<NavActionProps['dir'], TapIndicatorType> = {
  next: 'tap',
  prev: 'hold',
}

const NavAction = ({ dir = 'prev' }: NavActionProps) => {
  const icon = icons[dir]
  const tapType = tapTypes[dir]

  return (
    <div
      className={cn(
        'flex items-center gap-0',
        dir === 'prev' ? 'flex-row' : 'flex-row-reverse',
      )}
    >
      <Icon source={`icon://${icon}`} size={30} />
      <TapIndicator type={tapType} size="sm" />
    </div>
  )
}

const PageIndicator = ({
  current,
  total,
}: {
  current: number
  total: number
}) => (
  <Text size="sm" tone="muted" text={`*${current}*/${total}`} />
)

const PageNavButtonFrontend: AddonFrontendButton<Config> = ({ config }) => {
  const { currentPage, totalPages } = config
  const isFirstPage = currentPage === 1
  const isLastPage = currentPage === totalPages

  return (
    <div className="size-full flex flex-col gap-0.5 justify-center items-center">
      <div className={isFirstPage ? 'invisible' : 'visible'}>
        <NavAction dir="prev" />
      </div>
      <PageIndicator current={currentPage} total={totalPages} />
      <div className={isLastPage ? 'invisible' : 'visible'}>
        <NavAction dir="next" />
      </div>
    </div>
  )
}

export default PageNavButtonFrontend
