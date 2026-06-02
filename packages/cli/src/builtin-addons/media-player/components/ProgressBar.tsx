import { cn } from '@/themes/utils/cn'
import { ReactElement } from 'react'
import { MediaButtonStatus } from '../internal-types'
import { statusesMeta } from './status-meta'

export const ProgressBar = (props: {
  className?: string
  status: MediaButtonStatus
  value: number
}): ReactElement => {
  const bgColor = statusesMeta[props.status]?.bgColor || 'bg-gray-500'
  const bgColorAlt = statusesMeta[props.status]?.bgColorAlt || 'bg-gray-300'
  return (
    <div className={cn('h-1', 'w-full', bgColorAlt, props.className)}>
      <div
        className={cn(bgColor, 'h-2')}
        style={{
          width: `${props.value}%`,
        }}
      />
    </div>
  )
}
