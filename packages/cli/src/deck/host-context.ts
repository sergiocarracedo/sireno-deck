import { hostname, platform, arch, userInfo } from "node:os";

export interface HostContext {
  hostname: string;
  platform: NodeJS.Platform;
  userInfo: { username: string; homedir: string };
  arch: string;
}

export const getHostContext = (): HostContext => {
  const info = userInfo();
  return {
    hostname: hostname(),
    platform: platform(),
    userInfo: { username: info.username, homedir: info.homedir },
    arch: arch(),
  };
};
