import { describe, expect, it } from "vitest"

import { selectLanAddresses } from "../network-bind"

const ipv4 = (address: string) => ({
  address,
  netmask: "255.255.255.0",
  family: "IPv4" as const,
  mac: "00:00:00:00:00:00",
  internal: false,
  cidr: `${address}/24`,
})

describe("selectLanAddresses", () => {
  it("selects one physical adapter and ignores Docker and virtual interfaces", () => {
    const selected = selectLanAddresses({
      interfaces: {
        docker0: [ipv4("172.17.0.1")],
        "br-abcd1234": [ipv4("172.18.0.1")],
        vethabcd: [ipv4("172.18.0.2")],
        enp3s0: [ipv4("192.168.1.12")],
        wlp2s0: [ipv4("192.168.1.13")],
      },
    })

    expect(selected).toEqual([
      { address: "192.168.1.12", interfaceName: "enp3s0" },
    ])
  })

  it("finds a usable IPv4 address after an unusable entry on the same adapter", () => {
    const selected = selectLanAddresses({
      interfaces: {
        en0: [{ ...ipv4("127.0.0.1"), internal: true }, ipv4("192.168.1.24")],
      },
    })

    expect(selected).toEqual([
      { address: "192.168.1.24", interfaceName: "en0" },
    ])
  })

  it("returns no adapter when only virtual or internal interfaces exist", () => {
    expect(
      selectLanAddresses({
        interfaces: {
          docker0: [ipv4("172.17.0.1")],
          lo: [{ ...ipv4("127.0.0.1"), internal: true }],
        },
      }),
    ).toEqual([])
  })
})
