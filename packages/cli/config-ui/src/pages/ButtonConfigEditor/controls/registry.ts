import type { ComponentType } from "react"

import type { ControlProps } from "../types"
import { ActionControl } from "./ActionControl"
import { EmojiControl } from "./EmojiControl"
import { IconControl } from "./IconControl"
import { ShellControl } from "./ShellControl"

export const X_CONTROL_COMPONENTS: Record<
  string,
  ComponentType<ControlProps>
> = {
  action: ActionControl,
  emoji: EmojiControl,
  icon: IconControl,
  shell: ShellControl,
}
