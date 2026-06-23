import { checkStatus } from "@/util/daemon";
import { stopDaemon } from "@/util/daemon";
import type pino from "pino";

export interface StopOptions {
  logger: pino.Logger;
}

export const stop = async ({ logger }: StopOptions): Promise<void> => {
  checkStatus({ logger });
  stopDaemon({ logger });
};

export default stop;
