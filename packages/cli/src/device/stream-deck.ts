import { listOpenStreamDecks, openStreamDeck, type StreamDeck as SdkDevice } from "@elgato-stream-deck/node";

export class StreamDeckSelectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StreamDeckSelectionError";
  }
}

export interface StreamDeckDevice {
  readonly serial: string;
  readonly path: string;
  readonly model: string;
  getKeyCount(): number;
  setBrightness(value: number): Promise<void>;
  fillKeyBuffer(keyIndex: number, buffer: Buffer): Promise<void>;
  close(): Promise<void>;
}

export interface ConnectStreamDeckOptions {
  readonly serial?: string;
  readonly path?: string;
  readonly model?: string;
}

interface SdkControl {
  readonly type: string;
}

interface SdkHandle {
  readonly serialNumber?: string;
  readonly path?: string;
  readonly MODEL?: string;
  readonly CONTROLS?: ReadonlyArray<SdkControl>;
  setBrightness?(value: number): Promise<void>;
  fillKeyBuffer?(keyIndex: number, buffer: Buffer): Promise<void>;
  close?(): Promise<void>;
}

const toDescriptor = (handle: SdkHandle): { serial: string; path: string; model: string; keyCount: number } => ({
  serial: handle.serialNumber ?? "",
  path: handle.path ?? "",
  model: handle.MODEL ?? "unknown",
  keyCount: (handle.CONTROLS ?? []).filter((c) => c.type === "button").length,
});

export const connectStreamDeck = async (
  options: ConnectStreamDeckOptions = {},
): Promise<StreamDeckDevice> => {
  const devices = (await listOpenStreamDecks()) as ReadonlyArray<SdkDevice>;
  let candidates: SdkDevice[];
  if (devices.length === 0) {
    candidates = [];
  } else if (options.serial !== undefined || options.path !== undefined || options.model !== undefined) {
    candidates = devices.filter((d) => {
      if (options.serial !== undefined && d.serialNumber !== options.serial) return false;
      if (options.path !== undefined && d.path !== options.path) return false;
      if (options.model !== undefined && d.MODEL !== options.model) return false;
      return true;
    });
  } else {
    candidates = [...devices];
  }

  if (candidates.length === 0) {
    throw new StreamDeckSelectionError(
      options.serial !== undefined || options.path !== undefined
        ? `No Stream Deck matches selector ${JSON.stringify(options)}`
        : "No Stream Deck devices found",
    );
  }
  if (candidates.length > 1 && (options.serial === undefined && options.path === undefined)) {
    throw new StreamDeckSelectionError(
      `Multiple Stream Deck devices found (${candidates.length}); pass --serial or --path`,
    );
  }

  const target = candidates[0]!;
  const handle = (await openStreamDeck(target.path, {})) as unknown as SdkHandle;
  const descriptor = toDescriptor(handle);

  return {
    serial: descriptor.serial,
    path: descriptor.path,
    model: descriptor.model,
    getKeyCount: () => descriptor.keyCount,
    async setBrightness(value: number): Promise<void> {
      if (handle.setBrightness) await handle.setBrightness(value);
    },
    async fillKeyBuffer(keyIndex: number, buffer: Buffer): Promise<void> {
      if (handle.fillKeyBuffer) await handle.fillKeyBuffer(keyIndex, buffer);
    },
    async close(): Promise<void> {
      if (handle.close) await handle.close();
    },
  };
};
