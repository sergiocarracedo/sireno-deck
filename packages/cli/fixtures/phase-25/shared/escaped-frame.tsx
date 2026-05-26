import { createElement, type ReactNode } from "react"

export function EscapedFrame(props: { children: ReactNode }) {
  return createElement("div", { "data-frame-source": "escaped" }, props.children)
}
