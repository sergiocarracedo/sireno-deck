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