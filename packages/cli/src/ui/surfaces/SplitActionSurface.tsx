import { ReactNode, type ReactElement } from "react"

import {
  TapIndicator,
  TapIndicatorType,
  type TapIndicatorProps,
} from "../primitives/TapIndicator"
import { useThemeUiPresentation } from "../theme-presentation"
import { cn } from "../utils/cn"

type ActionProps = {
  children: ReactNode
  tapType: TapIndicatorType
  className?: string
  position: "bottom-right" | "top-left"
}

const Action = ({ tapType, children, className, position }: ActionProps) => {
  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "absolute z-10",
          position === "bottom-right" ? "bottom-0 left-1" : "top-1 right-1",
        )}
      >
        <TapIndicator type={tapType} size="xs" />
      </div>
      <div
        className={cn([
          "flex",
          position === "bottom-right" ? "justify-end" : "justify-start",
        ])}
      >
        <div
          className={cn([
            "scale-[0.62]",
            position === "bottom-right"
              ? "origin-bottom-right"
              : "origin-top-left",
          ])}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

export interface SplitActionSurfaceProps {
  primary: ReactElement
  secondary?: ReactElement
  secondaryIndicatorType?: NonNullable<TapIndicatorProps["type"]>
}

export function SplitActionSurface(
  props: SplitActionSurfaceProps,
): ReactElement {
  const themeUi = useThemeUiPresentation()

  if (themeUi?.surfaces?.splitAction) {
    return themeUi.surfaces.splitAction(
      props,
      undefined,
      splitActionSurfaceBase,
    )
  }

  return splitActionSurfaceBase(props)
}

export function splitActionSurfaceBase(
  props: SplitActionSurfaceProps,
): ReactElement {
  if (!props.secondary) {
    return <div className="contents">{props.primary}</div>
  }

  return (
    <div className="relative size-full flex flex-col">
      <hr className="absolute w-10 border-none h-px background-accent top-1/2 left-1/2 bg-accent -ml-5 -rotate-45" />
      <Action
        className="absolute top-0 left-0 z-10"
        tapType="tap"
        position="top-left"
      >
        {props.primary}
      </Action>
      <Action
        className="absolute bottom-0 right-0 z-10"
        tapType={props.secondaryIndicatorType ?? "dbltap"}
        position="bottom-right"
      >
        {props.secondary}
      </Action>
    </div>
  )
}
