import { cn } from '@/themes/utils/cn'
import { Icon } from '@/ui'
import { ReactElement } from 'react'
import { statusesMeta } from './status-meta'

import { MediaButtonStatus } from '../internal-types'

export function MediaStatusIcon(props: {
  status: MediaButtonStatus
}): ReactElement {
  const currentStatus =
    statusesMeta[props.status] || statusesMeta['unsupported']

  const icon = currentStatus.icon
  const bgColor = currentStatus.bgColor

  return (
    <div
      className={cn(
        'w-5 h-5 rounded-full flex items-center justify-center overflow-hidden',
        bgColor,
      )}
    >
      <Icon icon={icon} size={13} />
    </div>
  )
}
