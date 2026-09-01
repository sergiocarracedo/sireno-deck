import { describe, expect, it, vi } from "vitest"

import type { ConfigMutationService } from "@/config/mutation"

import { createEditorMessageHandler } from "../editor-handler"

const socket = () => {
  const sent: string[] = []
  return {
    sent,
    socket: {
      OPEN: 1,
      readyState: 1,
      send: (value: string) => sent.push(value),
    } as never,
  }
}

const service = (): ConfigMutationService => ({
  sources: () => ["config.yml"],
  readSource: () => "",
  isEditableSource: () => true,
  apply: vi.fn(async () => undefined),
  undo: vi.fn(async () => true),
  canUndo: vi.fn(() => true),
})

describe("editor WS handler", () => {
  it("returns state and applies a current revision mutation", async () => {
    const mutations = service()
    const broadcast = vi.fn()
    const { socket: client, sent } = socket()
    const handler = createEditorMessageHandler({
      mutationService: mutations,
      getState: () => ({
        config: { decks: {} },
        sources: ["config.yml"],
        sourceContents: {},
        themes: [],
      }),
      onChanged: vi.fn(),
      broadcast,
    })

    handler.onMessage({ type: "editor-state-request" }, client)
    expect(JSON.parse(sent[0]!)).toMatchObject({
      type: "editor-state",
      revision: 0,
      canUndo: true,
    })
    handler.onMessage(
      {
        type: "editor-mutate",
        requestId: "r1",
        revision: 0,
        mutation: { kind: "delete", deckId: "main", index: 0 },
      },
      client,
    )
    await vi.waitFor(() => expect(broadcast).toHaveBeenCalled())
    expect(mutations.apply).toHaveBeenCalledOnce()
    expect(JSON.parse(sent.at(-1)!)).toMatchObject({
      type: "editor-mutation-result",
      requestId: "r1",
      ok: true,
      revision: 1,
    })
  })

  it("rejects stale revisions without applying", async () => {
    const mutations = service()
    const { socket: client, sent } = socket()
    const handler = createEditorMessageHandler({
      mutationService: mutations,
      getState: () => ({
        config: {},
        sources: [],
        sourceContents: {},
        themes: [],
      }),
      broadcast: vi.fn(),
    })
    handler.onMessage(
      {
        type: "editor-undo",
        requestId: "r2",
        revision: 1,
      },
      client,
    )
    await vi.waitFor(() => expect(sent).toHaveLength(2))
    expect(mutations.undo).not.toHaveBeenCalled()
    expect(JSON.parse(sent[0]!)).toMatchObject({
      type: "editor-mutation-result",
      ok: false,
      error: "stale editor revision",
    })
  })
})
