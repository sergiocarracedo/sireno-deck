import { z } from "zod"

export const PROTOCOL_VERSION = 1

export const gestureKindSchema = z.enum(["tap", "dbl-tap", "hold"])

const baseClientMessage = z.object({})

const baseServerMessage = z.object({})

export const helloMessageSchema = baseClientMessage
  .extend({
    type: z.literal("hello"),
    version: z.literal(PROTOCOL_VERSION),
    token: z.string().min(1).optional(),
  })
  .strict()

export const helloMessageStrictSchema = baseClientMessage
  .extend({
    type: z.literal("hello"),
    version: z.literal(PROTOCOL_VERSION),
    token: z.string().min(1),
  })
  .strict()

export const deviceInfoSchema = z.object({
  id: z.string(),
  model: z.string(),
  keyCount: z.number().int().positive(),
  label: z.string(),
  transport: z.enum(["real", "emulated"]),
})

export const helloAckMessageSchema = baseServerMessage
  .extend({
    type: z.literal("hello-ack"),
    version: z.literal(PROTOCOL_VERSION),
    device: deviceInfoSchema.optional(),
    config: z.unknown(),
  })
  .strict()

export const deviceInfoMessageSchema = baseServerMessage
  .extend({
    type: z.literal("device-info"),
    device: deviceInfoSchema,
  })
  .strict()

export const deckConfigMessageSchema = baseServerMessage
  .extend({
    type: z.literal("deck-config"),
    deckId: z.string(),
    surfaces: z.record(z.string(), z.unknown()),
    navMode: z.enum(["regular", "paginated", "overlay"]).default("regular"),
    isCompact: z.boolean().default(false),
    hasOverlayDeckAvailable: z.boolean().default(false),
    overlayDeckIcon: z.string().nullable().default(null),
    overlayDeckName: z.string().nullable().default(null),
  })
  .strict()

export const stateMessageSchema = baseServerMessage
  .extend({
    type: z.literal("state"),
    channels: z.record(z.string(), z.unknown()),
    cadence: z.record(z.string(), z.number().int().positive()).optional(),
  })
  .strict()

export const decksListMessageSchema = baseServerMessage
  .extend({
    type: z.literal("decks-list"),
    decks: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        icon: z.string().optional(),
      }),
    ),
  })
  .strict()

export const showOverlayMessageSchema = baseServerMessage
  .extend({
    type: z.literal("show-overlay"),
    deckId: z.string().nullable(),
  })
  .strict()

export const buttonErrorMessageSchema = baseServerMessage
  .extend({
    type: z.literal("button-error"),
    deckId: z.string(),
    position: z.number().int().nonnegative(),
    durationMs: z.number().int().positive().default(5000),
    buttonId: z.string().optional(),
    details: z.string().optional(),
  })
  .strict()

export const serviceLogMessageSchema = baseServerMessage
  .extend({
    type: z.literal("service-log"),
    level: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]),
    msg: z.string(),
    ts: z.number().int().nonnegative(),
    component: z.string().optional(),
    deckId: z.string().optional(),
    position: z.number().int().nonnegative().optional(),
    addonName: z.string().optional(),
    gesture: z.enum(["tap", "dbl-tap", "hold"]).optional(),
    keyIndex: z.number().int().nonnegative().optional(),
  })
  .strict()

export const buttonActionMessageSchema = baseClientMessage
  .extend({
    type: z.literal("button-action"),
    deckId: z.string(),
    position: z.number().int().nonnegative(),
    gesture: gestureKindSchema,
  })
  .strict()

export const methodCallMessageSchema = baseClientMessage
  .extend({
    type: z.literal("method-call"),
    callId: z.string(),
    name: z.string(),
    args: z.array(z.unknown()).default([]),
  })
  .strict()

export const methodCallResultMessageSchema = baseServerMessage
  .extend({
    type: z.literal("method-call-result"),
    callId: z.string(),
    result: z.unknown().optional(),
    error: z.string().optional(),
  })
  .strict()

export const selectDeckMessageSchema = baseClientMessage
  .extend({
    type: z.literal("select-deck"),
    deckId: z.string(),
  })
  .strict()

export const setDeviceMessageSchema = baseClientMessage
  .extend({
    type: z.literal("set-device"),
    deviceId: z.string().min(1),
  })
  .strict()

export const deckActiveMessageSchema = baseClientMessage
  .extend({
    type: z.literal("deck-active"),
    deckId: z.string(),
    mode: z.enum(["navigation", "overlay"]),
    history: z.enum(["push", "replace"]).default("push"),
  })
  .strict()

export const dismissOverlayMessageSchema = baseClientMessage
  .extend({
    type: z.literal("dismiss-overlay"),
  })
  .strict()

export const assetsMessageSchema = baseServerMessage
  .extend({
    type: z.literal("assets"),
    deckId: z.string(),
    assets: z.array(
      z.object({
        id: z.string(),
        filename: z.string(),
        src: z.string(),
      }),
    ),
  })
  .strict()

export const subscribeChannelsMessageSchema = baseClientMessage
  .extend({
    type: z.literal("subscribe-channels"),
    channels: z.array(z.string()).min(1),
  })
  .strict()

export const iframeReloadMessageSchema = baseServerMessage
  .extend({
    type: z.literal("iframe-reload"),
  })
  .strict()

// ponytail: ships the addon inventory the emulator's Addons tab renders.
// Replaces a separate HTTP `/api/addons` fetch on the start-mode daemon
// (port 3939) that isn't bound in `--emulator` mode — the emulator only
// exposes the WS bridge, so the inventory rides along on connect.
export const addonsInventoryMessageSchema = baseServerMessage
  .extend({
    type: z.literal("addons-inventory"),
    addons: z.array(
      z.object({
        name: z.string(),
        path: z.string().optional(),
        internal: z.boolean().default(false),
        source: z.string(),
        buttonTypes: z.array(
          z.object({ type: z.string(), internal: z.boolean().default(false) }),
        ),
        defaultButton: z.string().nullable().optional(),
        decks: z.array(
          z.object({
            id: z.string(),
            isOverlay: z.boolean().default(false),
            paginated: z.boolean().default(false),
            buttons: z.number().int().nonnegative().default(0),
            internal: z.boolean().default(false),
          }),
        ),
      }),
    ),
  })
  .strict()

export const wsMessageSchema = z.discriminatedUnion("type", [
  helloMessageSchema,
  helloAckMessageSchema,
  deviceInfoMessageSchema,
  deckConfigMessageSchema,
  stateMessageSchema,
  decksListMessageSchema,
  showOverlayMessageSchema,
  buttonErrorMessageSchema,
  serviceLogMessageSchema,
  buttonActionMessageSchema,
  methodCallMessageSchema,
  methodCallResultMessageSchema,
  selectDeckMessageSchema,
  setDeviceMessageSchema,
  deckActiveMessageSchema,
  dismissOverlayMessageSchema,
  assetsMessageSchema,
  subscribeChannelsMessageSchema,
  iframeReloadMessageSchema,
  addonsInventoryMessageSchema,
])

export type HelloMessage = z.infer<typeof helloMessageSchema>
export type HelloAckMessage = z.infer<typeof helloAckMessageSchema>
export type DeviceInfoMessage = z.infer<typeof deviceInfoMessageSchema>
export type DeviceInfo = z.infer<typeof deviceInfoSchema>
export type DeckConfigMessage = z.infer<typeof deckConfigMessageSchema>
export type StateMessage = z.infer<typeof stateMessageSchema>
export type DecksListMessage = z.infer<typeof decksListMessageSchema>
export type ShowOverlayMessage = z.infer<typeof showOverlayMessageSchema>
export type ButtonErrorMessage = z.infer<typeof buttonErrorMessageSchema>
export type ButtonActionMessage = z.infer<typeof buttonActionMessageSchema>
export type MethodCallMessage = z.infer<typeof methodCallMessageSchema>
export type MethodCallResultMessage = z.infer<
  typeof methodCallResultMessageSchema
>
export type SelectDeckMessage = z.infer<typeof selectDeckMessageSchema>
export type SetDeviceMessage = z.infer<typeof setDeviceMessageSchema>
export type DeckActiveMessage = z.infer<typeof deckActiveMessageSchema>
export type DismissOverlayMessage = z.infer<typeof dismissOverlayMessageSchema>
export type AssetsMessage = z.infer<typeof assetsMessageSchema>
export type SubscribeChannelsMessage = z.infer<
  typeof subscribeChannelsMessageSchema
>
export type IframeReloadMessage = z.infer<typeof iframeReloadMessageSchema>
export type AddonsInventoryMessage = z.infer<
  typeof addonsInventoryMessageSchema
>
export type AddonInventoryEntry = AddonsInventoryMessage["addons"][number]
export type WsMessage = z.infer<typeof wsMessageSchema>
