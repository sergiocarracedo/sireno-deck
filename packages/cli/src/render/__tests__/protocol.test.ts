import { describe, it, expect } from 'vitest';
import {
  PROTOCOL_VERSION,
  parseMessage,
  serializeMessage,
  type ButtonActionMessage,
  type DeckConfigMessage,
  type MethodCallMessage,
} from '../protocol.js';

describe('protocol', () => {
  it('round-trips a button-action message', () => {
    const msg: ButtonActionMessage = {
      protocolVersion: PROTOCOL_VERSION,
      type: 'button-action',
      keyIndex: 0,
      action: 'down',
      at: 1700000000000,
    };
    expect(parseMessage(serializeMessage(msg))).toEqual(msg);
  });

  it('round-trips a deck-config message with surfaces', () => {
    const msg: DeckConfigMessage = {
      protocolVersion: PROTOCOL_VERSION,
      type: 'deck-config',
      deckId: 'main',
      surfaces: {
        '0': {
          addonName: 'date-time',
          buttonType: 'date',
          frontendEntry: '/abs/path/date-time/frontend.tsx',
          config: { format: 'HH:mm' },
        },
      },
      navMode: 'push',
    };
    expect(parseMessage(serializeMessage(msg))).toEqual(msg);
  });

  it('round-trips a method-call message', () => {
    const msg: MethodCallMessage = {
      protocolVersion: PROTOCOL_VERSION,
      type: 'method-call',
      method: 'pasteText',
      args: ['hello'],
      callId: 'call-123',
    };
    expect(parseMessage(serializeMessage(msg))).toEqual(msg);
  });

  it('rejects messages with wrong protocolVersion', () => {
    expect(() =>
      parseMessage(
        JSON.stringify({
          protocolVersion: 99,
          type: 'button-action',
          keyIndex: 0,
          action: 'down',
          at: 1,
        }),
      ),
    ).toThrow();
  });

  it('rejects unknown message types', () => {
    expect(() =>
      parseMessage(
        JSON.stringify({
          protocolVersion: PROTOCOL_VERSION,
          type: 'unknown',
        }),
      ),
    ).toThrow();
  });
});