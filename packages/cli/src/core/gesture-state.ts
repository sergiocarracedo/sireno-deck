export const HOLD_ACTION_DELAY_MS = 500;
export const DOUBLE_TAP_DELAY_MS = 500;

export type GestureType = "down" | "up";

export interface GestureEvent {
  readonly type: GestureType;
  readonly timestamp: number;
  readonly keyIndex?: number;
}

export type GestureKind = "tap" | "dbl-tap" | "hold";

export interface GestureResult {
  readonly kind: GestureKind;
  readonly keyIndex?: number;
  readonly timestamp: number;
  readonly durationMs?: number;
  readonly timestamps?: ReadonlyArray<number>;
}

type State =
  | { name: "idle" }
  | { name: "down"; downAt: number; keyIndex?: number }
  | { name: "await-second"; firstUpAt: number; firstDownAt: number; keyIndex?: number }
  | {
      name: "second-down";
      secondDownAt: number;
      firstUpAt: number;
      firstDownAt: number;
      keyIndex?: number;
    };

const tap = (event: GestureEvent, downAt: number, keyIndex?: number): GestureResult => {
  const result: GestureResult = {
    kind: "tap",
    timestamp: event.timestamp,
    durationMs: event.timestamp - downAt,
    timestamps: Object.freeze([downAt, event.timestamp]),
    ...(keyIndex !== undefined ? { keyIndex } : {}),
  };
  return Object.freeze(result);
};

const dblTap = (
  event: GestureEvent,
  firstDownAt: number,
  firstUpAt: number,
  secondDownAt: number,
  secondUpAt: number,
  keyIndex?: number,
): GestureResult => {
  const result: GestureResult = {
    kind: "dbl-tap",
    timestamp: secondUpAt,
    durationMs: secondUpAt - firstDownAt,
    timestamps: Object.freeze([firstDownAt, firstUpAt, secondDownAt, secondUpAt]),
    ...(keyIndex !== undefined ? { keyIndex } : {}),
  };
  return Object.freeze(result);
};

const hold = (event: GestureEvent, downAt: number, keyIndex?: number): GestureResult => {
  const result: GestureResult = {
    kind: "hold",
    timestamp: event.timestamp,
    durationMs: event.timestamp - downAt,
    timestamps: Object.freeze([downAt, event.timestamp]),
    ...(keyIndex !== undefined ? { keyIndex } : {}),
  };
  return Object.freeze(result);
};

export const nextGesture = (events: ReadonlyArray<GestureEvent>): GestureResult | null => {
  if (events.length === 0) return null;

  let state: State = { name: "idle" };

  for (const event of events) {
    switch (state.name) {
      case "idle":
        if (event.type === "down") {
          state = { name: "down", downAt: event.timestamp, keyIndex: event.keyIndex };
        }
        break;

      case "down":
        if (event.type === "up") {
          const duration = event.timestamp - state.downAt;
          if (duration >= HOLD_ACTION_DELAY_MS) {
            return hold(event, state.downAt, state.keyIndex);
          }
          state = {
            name: "await-second",
            firstUpAt: event.timestamp,
            firstDownAt: state.downAt,
            keyIndex: state.keyIndex,
          };
        }
        break;

      case "await-second":
        if (event.type === "down") {
          if (event.keyIndex !== state.keyIndex) {
            state = { name: "down", downAt: event.timestamp, keyIndex: event.keyIndex };
          } else {
            state = {
              name: "second-down",
              firstUpAt: state.firstUpAt,
              firstDownAt: state.firstDownAt,
              secondDownAt: event.timestamp,
              keyIndex: state.keyIndex,
            };
          }
        }
        break;

      case "second-down":
        if (event.type === "up") {
          return dblTap(
            event,
            state.firstDownAt,
            state.firstUpAt,
            state.secondDownAt,
            event.timestamp,
            state.keyIndex,
          );
        }
        break;
    }
  }

  if (state.name === "await-second") {
    return tap(
      { type: "up", timestamp: state.firstUpAt, keyIndex: state.keyIndex },
      state.firstDownAt,
      state.keyIndex,
    );
  }

  return null;
};
