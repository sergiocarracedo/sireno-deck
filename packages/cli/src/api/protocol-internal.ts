import { ButtonDefSchema, DeckDefSchema } from "@/config/schemas"

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

export const deckConfigSurfaceButtonSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    position: z.number().optional(),
    config: z
      .object({
        icon: z.string().optional(),
        label: z.string().optional(),
      })
      .passthrough()
      .optional(),
    label: z.string().optional(),
    icon: z.string().optional(),
    full: z.boolean().optional(),
    variant: z.string().optional(),
    addonName: z.string().optional(),
    frontendEntry: z.string().optional(),
    buttonColor: z.string().optional(),
    actions: z
      .object({
        tap: z.string().optional(),
        dbltap: z.string().optional(),
        hold: z.string().optional(),
      })
      .optional(),
  })
  .passthrough()

export const deckConfigSurfaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  buttons: z.array(deckConfigSurfaceButtonSchema),
  buttonColor: z.string().optional(),
  variant: z.string().optional(),
  buttonErrors: z
    .array(
      z.object({
        position: z.number(),
        buttonId: z.string().optional(),
        details: z.string(),
        expiresAt: z.number().optional(),
      }),
    )
    .optional(),
})

export const deckConfigMessageSchema = baseServerMessage
  .extend({
    type: z.literal("deck-config"),
    deckId: z.string(),
    surfaces: z.record(z.string(), deckConfigSurfaceSchema),
    navMode: z.enum(["regular", "paginated", "overlay"]).default("regular"),
    isCompact: z.boolean().default(false),
    hasOverlayDeckAvailable: z.boolean().default(false),
    overlayDeckIcon: z.string().nullable().default(null),
    overlayDeckName: z.string().nullable().default(null),
  })
  .strict()

const editorSourceTargetSchema = z
  .object({
    sourcePath: z.string().min(1),
    sourceDeckId: z.string().min(1),
    sourceButtonIndex: z.number().int().nonnegative(),
    sourceButtonPath: z.string().min(1),
    fingerprint: z.string().min(1),
    capability: z.enum(["update", "delete", "reorder"]),
  })
  .strict()

const editorSurfaceSchema = z
  .object({
    id: z.string().min(1),
    sourceDeckId: z.string().min(1),
    projectionId: z.string().min(1),
    pageIndex: z.number().int().nonnegative(),
    isOverlay: z.boolean(),
    editable: z.boolean(),
    addonOwner: z
      .object({
        addonIndex: z.number().int().nonnegative(),
        addonName: z.string().min(1),
        overrideKey: z.string().min(1),
        capabilities: z.array(z.string()).readonly(),
      })
      .strict()
      .nullable(),
    reservedPositions: z.array(z.number().int().nonnegative()),
    buttons: z.array(
      z
        .object({
          id: z.string().min(1),
          type: z.string().min(1),
          position: z.number().int(),
          sourceTarget: editorSourceTargetSchema.nullable(),
        })
        .strict(),
    ),
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
        addonIndex: z.number().int().nonnegative(),
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

const rootButtonMutationSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("add"),
      deckId: z.string().min(1),
      button: ButtonDefSchema,
      index: z.number().int().nonnegative().optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("update"),
      deckId: z.string().min(1),
      index: z.number().int().nonnegative(),
      button: ButtonDefSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("delete"),
      deckId: z.string().min(1),
      index: z.number().int().nonnegative(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("reorder"),
      deckId: z.string().min(1),
      from: z.number().int().nonnegative(),
      to: z.number().int().nonnegative(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("create-deck"),
      deckId: z.string().min(1),
      deck: DeckDefSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("update-deck"),
      deckId: z.string().min(1),
      deck: DeckDefSchema,
    })
    .strict(),
  z.object({ kind: z.literal("set-theme"), theme: z.string().min(1) }).strict(),
  z
    .object({
      kind: z.literal("set-addon-deck-override"),
      addonIndex: z.number().int().nonnegative(),
      deckId: z.string().min(1),
      override: z.record(z.string(), z.unknown()).nullable(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("edit-source"),
      path: z.string().min(1),
      content: z.string(),
    })
    .strict(),
])

export const editorStateRequestMessageSchema = baseClientMessage
  .extend({
    type: z.literal("editor-state-request"),
  })
  .strict()

export const editorStateMessageSchema = baseServerMessage
  .extend({
    type: z.literal("editor-state"),
    revision: z.number().int().nonnegative(),
    config: z.unknown(),
    sources: z.array(z.string()),
    sourceContents: z.record(z.string(), z.string()),
    themes: z.array(
      z.object({ name: z.string(), active: z.boolean().optional() }).strict(),
    ),
    buttonSchemas: z
      .record(z.string(), z.record(z.string(), z.unknown()))
      .default({}),
    surfaces: z.array(editorSurfaceSchema).default([]),
    canUndo: z.boolean(),
  })
  .strict()

export const editorValidationRequestMessageSchema = baseClientMessage
  .extend({
    type: z.literal("editor-validation-request"),
    requestId: z.string().min(1),
    revision: z.number().int().nonnegative(),
    buttonType: z.string().min(1),
    config: z.unknown(),
  })
  .strict()

export const editorValidationResultMessageSchema = baseServerMessage
  .extend({
    type: z.literal("editor-validation-result"),
    requestId: z.string().min(1),
    valid: z.boolean(),
    errors: z.array(z.string()),
  })
  .strict()

export const editorMutationMessageSchema = baseClientMessage
  .extend({
    type: z.literal("editor-mutate"),
    requestId: z.string().min(1),
    revision: z.number().int().nonnegative(),
    mutation: rootButtonMutationSchema,
  })
  .strict()

export const editorAssetWriteMessageSchema = baseClientMessage
  .extend({
    type: z.literal("editor-asset-write"),
    requestId: z.string().min(1),
    revision: z.number().int().nonnegative(),
    filename: z.string().min(1).max(255),
    data: z.string().min(1),
  })
  .strict()

export const editorUndoMessageSchema = baseClientMessage
  .extend({
    type: z.literal("editor-undo"),
    requestId: z.string().min(1),
    revision: z.number().int().nonnegative(),
  })
  .strict()

export const editorMutationResultMessageSchema = baseServerMessage
  .extend({
    type: z.literal("editor-mutation-result"),
    requestId: z.string().min(1),
    ok: z.boolean(),
    revision: z.number().int().nonnegative(),
    error: z.string().optional(),
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
        addonIndex: z.number().int().nonnegative(),
        path: z.string().optional(),
        internal: z.boolean().default(false),
        source: z.string(),
        buttonTypes: z.array(
          z
            .object({
              type: z.string(),
              internal: z.boolean().default(false),
              generated: z.boolean().default(false),
              defaultConfig: z.unknown().optional(),
            })
            .strict(),
        ),
        defaultButton: z.string().nullable().optional(),
        defaultConfig: z.unknown().optional(),
        decks: z.array(
          z
            .object({
              id: z.string(),
              sourceId: z.string().optional(),
              generated: z.boolean().default(false),
              pageIndex: z.number().int().nonnegative().default(0),
              isOverlay: z.boolean(),
              paginated: z.boolean(),
              buttons: z.array(
                z
                  .object({
                    type: z.string(),
                    generated: z.boolean().default(false),
                    position: z.number().int().nonnegative().optional(),
                    config: z.unknown().optional(),
                  })
                  .strict(),
              ),
              internal: z.boolean().default(false),
              addonIndex: z.number().int().nonnegative().optional(),
              overrideKey: z.string().optional(),
              overrideFields: z
                .array(
                  z.enum(["name", "icon", "autoShow", "trigger", "config"]),
                )
                .default([]),
            })
            .strict(),
        ),
      }),
    ),
  })
  .strict()

export const deckTreeMessageSchema = baseServerMessage
  .extend({
    type: z.literal("deck-tree"),
    rootId: z.string(),
    decks: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        isOverlay: z.boolean().default(false),
        links: z.array(
          z.object({
            target: z.string(),
            label: z.string().optional(),
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
  editorStateRequestMessageSchema,
  editorStateMessageSchema,
  editorValidationRequestMessageSchema,
  editorValidationResultMessageSchema,
  editorMutationMessageSchema,
  editorAssetWriteMessageSchema,
  editorUndoMessageSchema,
  editorMutationResultMessageSchema,
  addonsInventoryMessageSchema,
  deckTreeMessageSchema,
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
export type RootButtonMutation = z.infer<typeof rootButtonMutationSchema>
export type EditorStateMessage = z.infer<typeof editorStateMessageSchema>
export type EditorSurfaceMessage = z.infer<typeof editorSurfaceSchema>
export type EditorValidationRequestMessage = z.infer<
  typeof editorValidationRequestMessageSchema
>
export type EditorValidationResultMessage = z.infer<
  typeof editorValidationResultMessageSchema
>
export type EditorMutationMessage = z.infer<typeof editorMutationMessageSchema>
export type EditorAssetWriteMessage = z.infer<
  typeof editorAssetWriteMessageSchema
>
export type EditorUndoMessage = z.infer<typeof editorUndoMessageSchema>
export type EditorMutationResultMessage = z.infer<
  typeof editorMutationResultMessageSchema
>
export type AddonsInventoryMessage = z.infer<
  typeof addonsInventoryMessageSchema
>
export type AddonInventoryEntry = AddonsInventoryMessage["addons"][number]
export type DeckTreeMessage = z.infer<typeof deckTreeMessageSchema>
export type WsMessage = z.infer<typeof wsMessageSchema>
