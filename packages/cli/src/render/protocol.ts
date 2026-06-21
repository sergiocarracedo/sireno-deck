import { z } from 'zod';

export const PROTOCOL_VERSION = 1 as const;

export const ButtonActionSchema = z.object({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  type: z.literal('button-action'),
  keyIndex: z.number().int().nonnegative(),
  action: z.enum(['down', 'up']),
  at: z.number().int().nonnegative(),
});
export type ButtonActionMessage = z.infer<typeof ButtonActionSchema>;

export const SurfaceSpecSchema = z.object({
  addonName: z.string().min(1),
  buttonType: z.string().min(1),
  frontendEntry: z.string().min(1),
  config: z.unknown().optional(),
});
export type SurfaceSpec = z.infer<typeof SurfaceSpecSchema>;

export const DeckConfigMessageSchema = z.object({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  type: z.literal('deck-config'),
  deckId: z.string().min(1),
  surfaces: z.record(z.string(), SurfaceSpecSchema),
  navMode: z.enum(['push', 'replace']).default('push'),
});
export type DeckConfigMessage = z.infer<typeof DeckConfigMessageSchema>;

export const StateMessageSchema = z.object({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  type: z.literal('state'),
  payload: z.record(z.string(), z.unknown()),
});
export type StateMessage = z.infer<typeof StateMessageSchema>;

export const ButtonConfigMessageSchema = z.object({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  type: z.literal('button-config'),
  keyIndex: z.number().int().nonnegative(),
  surface: SurfaceSpecSchema.nullable(),
});
export type ButtonConfigMessage = z.infer<typeof ButtonConfigMessageSchema>;

export const SnapshotMessageSchema = z.object({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  type: z.literal('snapshot'),
  png: z.instanceof(ArrayBuffer),
});
export type SnapshotMessage = z.infer<typeof SnapshotMessageSchema>;

export const MethodCallMessageSchema = z.object({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  type: z.literal('method-call'),
  method: z.string().min(1),
  args: z.array(z.unknown()),
  callId: z.string().min(1),
});
export type MethodCallMessage = z.infer<typeof MethodCallMessageSchema>;

export const MethodCallResultMessageSchema = z.object({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  type: z.literal('method-call-result'),
  callId: z.string().min(1),
  ok: z.boolean(),
  result: z.unknown().optional(),
  error: z.string().optional(),
});
export type MethodCallResultMessage = z.infer<typeof MethodCallResultMessageSchema>;

export const MessageSchema = z.discriminatedUnion('type', [
  ButtonActionMessageSchema,
  DeckConfigMessageSchema,
  StateMessageSchema,
  ButtonConfigMessageSchema,
  SnapshotMessageSchema,
  MethodCallMessageSchema,
  MethodCallResultMessageSchema,
]);
export type Message = z.infer<typeof MessageSchema>;

export function parseMessage(raw: string): Message {
  const parsed = JSON.parse(raw);
  return MessageSchema.parse(parsed);
}

export function serializeMessage(msg: Message): string {
  return JSON.stringify(msg);
}