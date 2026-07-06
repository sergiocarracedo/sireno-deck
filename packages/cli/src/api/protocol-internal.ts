import { z } from "zod";

export const PROTOCOL_VERSION = 1;

export const gestureKindSchema = z.enum(["tap", "dbl-tap", "hold"]);

const baseClientMessage = z.object({});

const baseServerMessage = z.object({});

export const helloMessageSchema = baseClientMessage.extend({
  type: z.literal("hello"),
  version: z.literal(PROTOCOL_VERSION),
  token: z.string().min(1).optional(),
});

export const helloAckMessageSchema = baseServerMessage.extend({
  type: z.literal("hello-ack"),
  version: z.literal(PROTOCOL_VERSION),
  keyCount: z.number().int().positive(),
  config: z.unknown(),
});

export const deckConfigMessageSchema = baseServerMessage.extend({
  type: z.literal("deck-config"),
  deckId: z.string(),
  surfaces: z.record(z.string(), z.unknown()),
  navMode: z.enum(["regular", "paginated", "overlay"]).default("regular"),
});

export const stateMessageSchema = baseServerMessage.extend({
  type: z.literal("state"),
  channels: z.record(z.string(), z.unknown()),
  cadence: z.record(z.string(), z.number().int().positive()).optional(),
});

export const decksListMessageSchema = baseServerMessage.extend({
  type: z.literal("decks-list"),
  decks: z.array(z.object({ id: z.string(), name: z.string(), icon: z.string().optional() })),
});

export const showOverlayMessageSchema = baseServerMessage.extend({
  type: z.literal("show-overlay"),
  deckId: z.string().nullable(),
});

export const buttonActionMessageSchema = baseClientMessage.extend({
  type: z.literal("button-action"),
  deckId: z.string(),
  position: z.number().int().nonnegative(),
  gesture: gestureKindSchema,
});

export const methodCallMessageSchema = baseClientMessage.extend({
  type: z.literal("method-call"),
  callId: z.string(),
  name: z.string(),
  args: z.array(z.unknown()).default([]),
});

export const methodCallResultMessageSchema = baseServerMessage.extend({
  type: z.literal("method-call-result"),
  callId: z.string(),
  result: z.unknown().optional(),
  error: z.string().optional(),
});

export const selectDeckMessageSchema = baseClientMessage.extend({
  type: z.literal("select-deck"),
  deckId: z.string(),
});

export const deckActiveMessageSchema = baseClientMessage.extend({
  type: z.literal("deck-active"),
  deckId: z.string(),
  mode: z.enum(["navigation", "overlay"]),
  history: z.enum(["push", "replace"]).default("push"),
});

export const dismissOverlayMessageSchema = baseClientMessage.extend({
  type: z.literal("dismiss-overlay"),
});

export const assetsMessageSchema = baseServerMessage.extend({
  type: z.literal("assets"),
  deckId: z.string(),
  assets: z.array(
    z.object({
      id: z.string(),
      filename: z.string(),
      data: z.string(),
    }),
  ),
});

export const subscribeChannelsMessageSchema = baseClientMessage.extend({
  type: z.literal("subscribe-channels"),
  channels: z.array(z.string()).min(1),
});

export const wsMessageSchema = z.discriminatedUnion("type", [
  helloMessageSchema,
  helloAckMessageSchema,
  deckConfigMessageSchema,
  stateMessageSchema,
  decksListMessageSchema,
  showOverlayMessageSchema,
  buttonActionMessageSchema,
  methodCallMessageSchema,
  methodCallResultMessageSchema,
  selectDeckMessageSchema,
  deckActiveMessageSchema,
  dismissOverlayMessageSchema,
  assetsMessageSchema,
  subscribeChannelsMessageSchema,
]);

export type HelloMessage = z.infer<typeof helloMessageSchema>;
export type HelloAckMessage = z.infer<typeof helloAckMessageSchema>;
export type DeckConfigMessage = z.infer<typeof deckConfigMessageSchema>;
export type StateMessage = z.infer<typeof stateMessageSchema>;
export type DecksListMessage = z.infer<typeof decksListMessageSchema>;
export type ShowOverlayMessage = z.infer<typeof showOverlayMessageSchema>;
export type ButtonActionMessage = z.infer<typeof buttonActionMessageSchema>;
export type MethodCallMessage = z.infer<typeof methodCallMessageSchema>;
export type MethodCallResultMessage = z.infer<typeof methodCallResultMessageSchema>;
export type SelectDeckMessage = z.infer<typeof selectDeckMessageSchema>;
export type DeckActiveMessage = z.infer<typeof deckActiveMessageSchema>;
export type DismissOverlayMessage = z.infer<typeof dismissOverlayMessageSchema>;
export type AssetsMessage = z.infer<typeof assetsMessageSchema>;
export type SubscribeChannelsMessage = z.infer<typeof subscribeChannelsMessageSchema>;
export type WsMessage = z.infer<typeof wsMessageSchema>;
