import { checkStatus } from "@/util/daemon";
import type pino from "pino";

export interface StatusOptions {
  logger: pino.Logger;
}

export const status = async ({ logger }: StatusOptions): Promise<void> => {
  checkStatus({ logger });
};

export default status;
