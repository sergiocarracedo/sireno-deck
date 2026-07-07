import type { Methods } from "@/deck/methods";
import type { GestureKind } from "@/core/gesture-state";

export type { Methods } from "@/deck/methods";
export type { GestureKind } from "@/core/gesture-state";

export interface ChannelPayload {
  [key: string]: unknown;
}

export type Unsubscribe = () => void;

export interface AddonButtonRenderContext {
  config: unknown;
  pressed: boolean;
  addonName: string;
  frameState: unknown;
}

export interface AddonButtonActionContext {
  config: unknown;
  buttonId: string;
  deckId: string;
  gesture: GestureKind;
  methods: Methods;
}

export type AddonMethods = Methods;

export interface UseAddonChannelReturn<T = unknown> {
  value: T | undefined;
  snapshot: () => T | undefined;
}
