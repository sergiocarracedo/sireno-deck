// ponytail: visual verify — emulator shows three rows of metrics
export const systemStatusDeck = {
  id: "test:sys",
  name: "Sys",
  buttons: [
    {
      type: "system-status",
      config: {
        metrics: ["cpu", "ram", "battery"],
        display: "text",
      },
    },
  ],
}
