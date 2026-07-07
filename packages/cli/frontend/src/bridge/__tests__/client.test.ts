import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ChannelRegistry } from 'sireno-deck/react'
import { createWsClient } from '../client'

class FakeWebSocket {
  static OPEN = 1
  static CLOSED = 3
  static instances: FakeWebSocket[] = []
  url: string
  readyState = 0
  sentFrames: string[] = []
  messageListeners: Array<(event: MessageEvent) => void> = []
  closeListeners: Array<() => void> = []
  openListeners: Array<() => void> = []
  errorListeners: Array<() => void> = []

  constructor(url: string) {
    this.url = url
    FakeWebSocket.instances.push(this)
  }
  send(frame: string): void {
    this.sentFrames.push(frame)
  }
  close(): void {
    this.readyState = FakeWebSocket.CLOSED
    for (const l of this.closeListeners) l()
  }
  addEventListener(name: string, cb: unknown): void {
    if (name === 'open') this.openListeners.push(cb as () => void)
    if (name === 'close') this.closeListeners.push(cb as () => void)
    if (name === 'error') this.errorListeners.push(cb as () => void)
    if (name === 'message')
      this.messageListeners.push(cb as (event: MessageEvent) => void)
  }
  emitOpen(): void {
    this.readyState = FakeWebSocket.OPEN
    for (const l of this.openListeners) l()
  }
  emitMessage(data: string): void {
    for (const l of this.messageListeners) l({ data } as MessageEvent)
  }
  emitClose(): void {
    this.readyState = FakeWebSocket.CLOSED
    for (const l of this.closeListeners) l()
  }
}

beforeEach(() => {
  ChannelRegistry.resetForTests()
  FakeWebSocket.instances = []
  ;(globalThis as unknown as { WebSocket: typeof FakeWebSocket }).WebSocket =
    FakeWebSocket as unknown as typeof WebSocket
})
afterEach(() => {
  ChannelRegistry.resetForTests()
  vi.useRealTimers()
})

describe('createWsClient', () => {
  it('sends a hello on open', () => {
    const client = createWsClient({ url: 'ws://test' })
    client.connect()
    FakeWebSocket.instances[0]!.emitOpen()
    expect(FakeWebSocket.instances[0]!.sentFrames[0]).toContain(
      '"type":"hello"',
    )
  })

  it('publishes incoming state messages to the channel registry', () => {
    const client = createWsClient({ url: 'ws://test' })
    client.connect()
    const ws = FakeWebSocket.instances[0]!
    ws.emitOpen()
    ws.emitMessage(
      JSON.stringify({ type: 'state', channels: { cpu: { usage: 0.5 } } }),
    )
    expect(ChannelRegistry.instance().last('cpu')).toEqual({ usage: 0.5 })
  })

  it('emits open status via onStatus', () => {
    const statuses: string[] = []
    const client = createWsClient({
      url: 'ws://test',
      onStatus: (s) => statuses.push(s),
    })
    client.connect()
    expect(statuses.at(-1)).toBe('connecting')
    FakeWebSocket.instances[0]!.emitOpen()
    expect(statuses).toContain('open')
  })

  it('close prevents reconnect', () => {
    vi.useFakeTimers()
    const client = createWsClient({ url: 'ws://test', backoffMs: [10] })
    client.connect()
    FakeWebSocket.instances[0]!.emitClose()
    client.close()
    vi.advanceTimersByTime(100)
    expect(FakeWebSocket.instances.length).toBe(1)
  })
})

describe('createWsClient.subscribeChannels', () => {
  it('sends subscribe-channels message when socket is open', () => {
    const client = createWsClient({ url: 'ws://test' })
    client.connect()
    const ws = FakeWebSocket.instances[0]!
    ws.emitOpen()
    const before = ws.sentFrames.length
    client.subscribeChannels(['weather:current'])
    expect(ws.sentFrames.length).toBe(before + 1)
    const sent = JSON.parse(ws.sentFrames[ws.sentFrames.length - 1]!)
    expect(sent.type).toBe('subscribe-channels')
    expect(sent.channels).toEqual(['weather:current'])
  })

  it('dedupes already-subscribed channels', () => {
    const client = createWsClient({ url: 'ws://test' })
    client.connect()
    const ws = FakeWebSocket.instances[0]!
    ws.emitOpen()
    client.subscribeChannels(['a'])
    const afterFirst = ws.sentFrames.length
    client.subscribeChannels(['a'])
    expect(ws.sentFrames.length).toBe(afterFirst)
  })

  it('queues subscriptions before open and flushes on connect', () => {
    const client = createWsClient({ url: 'ws://test' })
    client.connect()
    const ws = FakeWebSocket.instances[0]!
    expect(ws.readyState).toBe(0)
    client.subscribeChannels(['weather:current'])
    expect(ws.sentFrames.filter((f) => f.includes('subscribe-channels'))).toHaveLength(0)
    ws.emitOpen()
    const subscribeFrames = ws.sentFrames.filter((f) => f.includes('subscribe-channels'))
    expect(subscribeFrames).toHaveLength(1)
    const sent = JSON.parse(subscribeFrames[0]!)
    expect(sent.channels).toEqual(['weather:current'])
  })

  it('re-announces subscriptions after reconnect', () => {
    vi.useFakeTimers()
    const client = createWsClient({ url: 'ws://test', backoffMs: [10] })
    client.connect()
    const ws1 = FakeWebSocket.instances[0]!
    ws1.emitOpen()
    client.subscribeChannels(['weather:current'])
    ws1.emitClose()
    vi.advanceTimersByTime(20)
    const ws2 = FakeWebSocket.instances[1]!
    ws2.emitOpen()
    const subscribeFrames = ws2.sentFrames.filter((f) => f.includes('subscribe-channels'))
    expect(subscribeFrames).toHaveLength(1)
    const sent = JSON.parse(subscribeFrames[0]!)
    expect(sent.channels).toEqual(['weather:current'])
    client.close()
    vi.useRealTimers()
  })
})
