import { describe, expect, it } from "vitest"

import { EmulatorOutputClient, selectOutputClient } from "../index"
import { RealOutputClient } from "../real"
import { RemoteMirrorOutputClient } from "../remote-mirror"

describe("selectOutputClient", () => {
  it("mirrors hardware to the remote emulator when --remote is used without --emulator", () => {
    expect(
      selectOutputClient({
        emulator: false,
        remote: true,
        xdgConfigHome: "/tmp",
      }),
    ).toBeInstanceOf(RemoteMirrorOutputClient)
  })

  it("keeps explicit emulator and local hardware modes unchanged", () => {
    expect(
      selectOutputClient({ emulator: true, xdgConfigHome: "/tmp" }),
    ).toBeInstanceOf(EmulatorOutputClient)
    expect(
      selectOutputClient({ emulator: false, xdgConfigHome: "/tmp" }),
    ).toBeInstanceOf(RealOutputClient)
  })
})
