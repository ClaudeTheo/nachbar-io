import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Anthropic SDK mit Stream-Support
vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = {
      stream: vi.fn().mockReturnValue({
        async *[Symbol.asyncIterator]() {
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hallo ' } }
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Welt' } }
          yield { type: 'message_stop' }
        }
      }),
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Hallo Welt' }],
        stop_reason: 'end_turn'
      })
    }
  }
  return { default: MockAnthropic }
})

vi.mock('@/lib/companion/context-loader', () => ({
  loadQuarterContext: vi.fn().mockResolvedValue({
    quarterName: 'Testquartier',
    wasteDate: [],
    events: [],
    bulletinPosts: [],
    meals: []
  })
}))

vi.mock('@/lib/care/api-helpers', () => ({
  requireAuth: vi.fn().mockResolvedValue({ user: { id: 'test-user' } }),
  unauthorizedResponse: vi.fn().mockReturnValue(new Response('Unauthorized', { status: 401 })),
  errorResponse: vi.fn().mockImplementation((msg: string, status: number) =>
    new Response(JSON.stringify({ error: msg }), { status, headers: { 'Content-Type': 'application/json' } })
  )
}))

vi.mock('@/lib/companion/system-prompt', () => ({
  buildSystemPrompt: vi.fn().mockReturnValue('Du bist der Quartier-Lotse.')
}))

vi.mock('@/lib/companion/tools', () => ({
  companionTools: []
}))

vi.mock('@/lib/companion/tool-executor', () => ({
  isWriteTool: vi.fn().mockReturnValue(false),
  executeCompanionTool: vi.fn().mockResolvedValue({ success: true, summary: 'OK' })
}))

describe('POST /api/companion/chat (streaming)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns SSE stream with text/event-stream content type', async () => {
    const { POST } = await import('@/app/api/companion/chat/route')
    const req = new Request('http://localhost/api/companion/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hallo' }],
        stream: true
      })
    })
    const res = await POST(req)
    expect(res.headers.get('content-type')).toBe('text/event-stream')
    expect(res.status).toBe(200)
  })

  it('still supports non-streaming mode (backwards compatible)', async () => {
    const { POST } = await import('@/app/api/companion/chat/route')
    const req = new Request('http://localhost/api/companion/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hallo' }]
      })
    })
    const res = await POST(req)
    expect(res.headers.get('content-type')).toContain('application/json')
    const json = await res.json()
    expect(json.message).toBe('Hallo Welt')
  })

  it('SSE stream contains text and done events', async () => {
    const { POST } = await import('@/app/api/companion/chat/route')
    const req = new Request('http://localhost/api/companion/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hallo' }],
        stream: true
      })
    })
    const res = await POST(req)
    const text = await res.text()
    expect(text).toContain('event: text')
    expect(text).toContain('event: done')
    expect(text).toContain('"delta":"Hallo "')
  })
})
