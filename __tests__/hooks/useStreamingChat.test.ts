import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useStreamingChat } from '@/hooks/useStreamingChat'

// Hilfsfunktion: Mock-SSE-Response erstellen
function mockSSEResponse(events: string[]) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(event + '\n\n'))
      }
      controller.close()
    }
  })
  return new Response(stream, {
    headers: { 'content-type': 'text/event-stream' }
  })
}

describe('useStreamingChat', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('akkumuliert Text-Deltas', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockSSEResponse([
        'event: text\ndata: {"delta":"Hallo "}',
        'event: text\ndata: {"delta":"Welt"}',
        'event: done\ndata: {"full_reply":"Hallo Welt"}'
      ])
    )

    const { result } = renderHook(() => useStreamingChat())

    await act(async () => {
      await result.current.sendStreaming([{ role: 'user', content: 'Hi' }])
    })

    expect(result.current.streamingText).toBe('Hallo Welt')
    expect(result.current.isStreaming).toBe(false)
  })

  it('meldet Tool-Results ueber Callback', async () => {
    const onToolResult = vi.fn()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockSSEResponse([
        'event: tool\ndata: {"name":"get_waste_dates","result":{"success":true}}',
        'event: done\ndata: {"full_reply":"Hier sind die Termine."}'
      ])
    )

    const { result } = renderHook(() => useStreamingChat({ onToolResult }))

    await act(async () => {
      await result.current.sendStreaming([{ role: 'user', content: 'Muell?' }])
    })

    expect(onToolResult).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'get_waste_dates' })
    )
  })

  it('meldet Confirmations ueber Callback', async () => {
    const onConfirmation = vi.fn()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockSSEResponse([
        'event: confirmation\ndata: {"tool":"create_bulletin_post","params":{"title":"Test"},"description":"Beitrag erstellen"}',
        'event: done\ndata: {"full_reply":""}'
      ])
    )

    const { result } = renderHook(() => useStreamingChat({ onConfirmation }))

    await act(async () => {
      await result.current.sendStreaming([{ role: 'user', content: 'Erstelle Beitrag' }])
    })

    expect(onConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({ tool: 'create_bulletin_post' })
    )
  })

  it('setzt isStreaming korrekt', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockSSEResponse([
        'event: text\ndata: {"delta":"Test"}',
        'event: done\ndata: {"full_reply":"Test"}'
      ])
    )

    const { result } = renderHook(() => useStreamingChat())

    expect(result.current.isStreaming).toBe(false)

    await act(async () => {
      await result.current.sendStreaming([{ role: 'user', content: 'Hi' }])
    })

    expect(result.current.isStreaming).toBe(false)
  })

  it('setzt error bei Netzwerkfehler', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useStreamingChat())

    await act(async () => {
      await result.current.sendStreaming([{ role: 'user', content: 'Hi' }])
    })

    expect(result.current.error).toBe('Network error')
    expect(result.current.isStreaming).toBe(false)
  })
})
