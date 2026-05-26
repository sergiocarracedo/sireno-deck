import { createElement, type ReactNode } from "react"

export function CustomFrame(props: { children: ReactNode; state: string }) {
  return createElement(
    "section",
    { "data-frame-source": "phase-25-custom", "data-frame-state": props.state },
    props.children,
  )
}
