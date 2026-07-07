import { cn, Icon } from '@/ui'
import { ReactElement } from 'react'
import { MediaButtonStatus, statusesMeta } from './status-meta'

export function MediaStatusIcon(props: {
  status: MediaButtonStatus
}): ReactElement {
  const currentStatus =
    statusesMeta[props.status] || statusesMeta['unsupported']

  const icon = currentStatus.icon
  const bgColor = currentStatus.bgColor
  const iconColor = currentStatus.iconColor

  return (
    <div
      className={cn(
        'w-6 h-6 rounded-full flex items-center justify-center overflow-hidden',
        bgColor,
      )}
    >
      <Icon name={icon} size={14} fill tone={iconColor} />
    </div>
  )
}
