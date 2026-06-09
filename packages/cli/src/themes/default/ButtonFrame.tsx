import { ThemeButtonFrameProps } from '@/config/theme'

import { cn } from '../utils/cn'

export function ButtonFrame(props: ThemeButtonFrameProps) {
  return (
    <div
      className={cn([
        'bg-background border-frame border-2 border-solid w-full h-full rounded-2xl flex items-center justify-center p-1 overflow-hidden',
      ])}
      data-sireno-button-frame="true"
    >
      {props.children}
    </div>
  )
}
