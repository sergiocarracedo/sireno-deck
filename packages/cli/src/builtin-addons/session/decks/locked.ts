import type { AddonDeckFactory } from "@/addon/api"

const sessionLockedDeckFactory: AddonDeckFactory = (page: number) => ({
  name: "Locked",
  buttons: Array.from({ length: 5 }, (_, i) => ({
    id: `time-${i}`,
    type: "session:time",
    config: { format: "HH:mm" },
    position: i + page * 5,
  })),
})

export default sessionLockedDeckFactory
export { sessionLockedDeckFactory }
