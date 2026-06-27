---
quick_task: 002
title: "open emulator URL in browser on emulator mode start"
status: ready
---

# Plan

## Task 1: Open emulator URL in default browser on emulator mode

### files
- `packages/cli/src/cli/commands/run.ts`
- `packages/cli/src/cli/commands/emulator-mode.ts`

### action
After `runEmulatorMode` resolves (line where `frontendUrl` is known), spawn a child process to open the URL in the platform's default browser:

```ts
import { exec } from "node:child_process";
import { platform } from "node:os";

const openBrowser = (url: string): void => {
  const cmd =
    platform() === "win32"
      ? `cmd /c start "" "${url}"`
      : platform() === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) logger.debug({ err, url }, "failed to open browser");
  });
};
```

Call it right after `const { frontendUrl, wsUrl } = await runEmulatorMode(options)`.

### verify
1. `pnpm typecheck` clean
2. `pnpm test` passes
3. `pnpm dev start --emulator` prints the frontendUrl AND opens the browser automatically

### done
Browser opens to `http://127.0.0.1:52938` when running `pnpm dev start --emulator` (or whichever port was assigned).
