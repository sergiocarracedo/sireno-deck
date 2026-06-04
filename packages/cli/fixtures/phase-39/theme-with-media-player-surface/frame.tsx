import { ButtonSurface } from '@/addon/api'
import { ReactNode } from 'react'

export const CustomFrame = (props: { children?: ReactNode }): ReactNode => {
  return <ButtonSurface>{props.children}</ButtonSurface>
}
