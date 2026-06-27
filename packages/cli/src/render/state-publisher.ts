import type pino from "pino";

import type { WsBridge } from "./ws-bridge.ts";

export interface StatePublisherChannel {
  readonly channel: string;
  readonly addonName: string;
  readonly intervalMs: number;
  readonly poll: () => Promise<unknown> | unknown;
}

export interface StatePublisherOptions {
  readonly bridge: Pick<WsBridge, "broadcast">;
  readonly logger: pino.Logger;
}

export interface DeckSnapshot {
  readonly addonNames: ReadonlyArray<string>;
}

export class StatePublisher {
  private readonly bridge: Pick<WsBridge, "broadcast">;
  private readonly logger: pino.Logger;
  private readonly channels = new Map<string, StatePublisherChannel>();
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly cadence = new Map<string, number>();
  private activeAddonNames: ReadonlyArray<string> = [];

  constructor(options: StatePublisherOptions) {
    this.bridge = options.bridge;
    this.logger = options.logger;
  }

  registerChannel(channel: StatePublisherChannel): void {
    this.channels.set(channel.channel, channel);
    this.cadence.set(channel.channel, channel.intervalMs);
    if (this.activeAddonNames.includes(channel.addonName)) {
      this.startChannel(channel);
    }
  }

  unregisterChannel(channelName: string): void {
    this.stopChannel(channelName);
    this.channels.delete(channelName);
    this.cadence.delete(channelName);
  }

  setActiveDeck(snapshot: DeckSnapshot): void {
    const previous = new Set(this.activeAddonNames);
    const next = new Set(snapshot.addonNames);
    this.activeAddonNames = snapshot.addonNames;
    for (const ch of this.channels.values()) {
      const wasActive = previous.has(ch.addonName);
      const isActive = next.has(ch.addonName);
      if (!wasActive && isActive) this.startChannel(ch);
      else if (wasActive && !isActive) this.stopChannel(ch.channel);
    }
  }

  stopAll(): void {
    for (const name of this.timers.keys()) this.stopChannel(name);
  }

  private startChannel(channel: StatePublisherChannel): void {
    if (this.timers.has(channel.channel)) return;
    const fire = (): void => {
      try {
        const payload = channel.poll();
        if (payload instanceof Promise) {
          payload
            .then((value) => {
              this.bridge.broadcast({
                type: "state",
                channels: { [channel.channel]: value },
              });
            })
            .catch((err: unknown) => {
              this.logger.warn(
                { err, channel: channel.channel },
                "state-publisher: poll failed",
              );
            });
        } else {
          this.bridge.broadcast({
            type: "state",
            channels: { [channel.channel]: payload },
          });
        }
      } catch (err) {
        this.logger.warn(
          { err, channel: channel.channel },
          "state-publisher: poll threw",
        );
      }
    };
    fire();
    const timer = setInterval(fire, channel.intervalMs);
    this.timers.set(channel.channel, timer);
  }

  private stopChannel(channelName: string): void {
    const t = this.timers.get(channelName);
    if (t !== undefined) {
      clearInterval(t);
      this.timers.delete(channelName);
    }
  }
}
