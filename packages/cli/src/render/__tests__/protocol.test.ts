import { describe, it, expect } from 'vitest';
import {
  PROTOCOL_VERSION,
  parseMessage,
  serializeMessage,
  type ButtonActionMessage,
  type DeckConfigMessage,
  type DecksListMessage,
  type MethodCallMessage,
  type SelectDeckMessage,
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

  it('round-trips a decks-list message (CLI → emulator)', () => {
    const msg: DecksListMessage = {
      protocolVersion: PROTOCOL_VERSION,
      type: 'decks-list',
      decks: [
        { id: 'main', name: 'Main Deck' },
        { id: 'emoji', name: 'Emoji' },
        { id: 'chrome', name: 'Chrome' },
      ],
    };
    expect(parseMessage(serializeMessage(msg))).toEqual(msg);
  });

  it('rejects decks-list with empty decks array', () => {
    expect(() =>
      parseMessage(
        JSON.stringify({
          protocolVersion: PROTOCOL_VERSION,
          type: 'decks-list',
          decks: [],
        }),
      ),
    ).toThrow();
  });

  it('round-trips a select-deck message (emulator → CLI)', () => {
    const msg: SelectDeckMessage = {
      protocolVersion: PROTOCOL_VERSION,
      type: 'select-deck',
      deckId: 'emoji',
    };
    expect(parseMessage(serializeMessage(msg))).toEqual(msg);
  });

  it('rejects select-deck with empty deckId', () => {
    expect(() =>
      parseMessage(
        JSON.stringify({
          protocolVersion: PROTOCOL_VERSION,
          type: 'select-deck',
          deckId: '',
        }),
      ),
    ).toThrow();
  });
});