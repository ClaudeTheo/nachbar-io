'use client'

import { useState, useCallback, useRef } from 'react'

// SSE-Event Typen vom Companion Chat API
interface ToolResultEvent {
  name: string
  result: { success: boolean; summary: string; route?: string }
}

interface ConfirmationEvent {
  tool: string
  params: Record<string, unknown>
  description: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface UseStreamingChatOptions {
  onToolResult?: (event: ToolResultEvent) => void
  onConfirmation?: (event: ConfirmationEvent) => void
}

interface UseStreamingChatReturn {
  streamingText: string
  isStreaming: boolean
  error: string | null
  sendStreaming: (messages: ChatMessage[]) => Promise<void>
  reset: () => void
}

// useStreamingChat — Konsumiert SSE-Stream vom Companion Chat API
export function useStreamingChat(options?: UseStreamingChatOptions): UseStreamingChatReturn {
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const sendStreaming = useCallback(async (messages: ChatMessage[]) => {
    // Vorherigen Stream abbrechen
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setStreamingText('')
    setIsStreaming(true)
    setError(null)

    try {
      const res = await fetch('/api/companion/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, stream: true }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // SSE-Events parsen: getrennt durch doppeltes Newline
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? '' // Letztes (unvollstaendiges) Stueck behalten

        for (const part of parts) {
          if (!part.trim()) continue

          // Event-Typ und Daten extrahieren
          let eventType = ''
          let data = ''

          for (const line of part.split('\n')) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim()
            } else if (line.startsWith('data: ')) {
              data = line.slice(6)
            }
          }

          if (!eventType || !data) continue

          try {
            const parsed = JSON.parse(data)

            switch (eventType) {
              case 'text':
                // Text-Delta akkumulieren
                accumulated += parsed.delta ?? ''
                setStreamingText(accumulated)
                break

              case 'tool':
                // Tool-Result melden
                options?.onToolResult?.(parsed)
                break

              case 'confirmation':
                // Bestaetigung anfordern
                options?.onConfirmation?.(parsed)
                break

              case 'done':
                // Stream beendet — finalen Text setzen
                if (parsed.full_reply) {
                  accumulated = parsed.full_reply
                  setStreamingText(parsed.full_reply)
                }
                break

              case 'error':
                setError(parsed.message ?? 'Unbekannter Fehler')
                break
            }
          } catch {
            // Ungueltige JSON-Daten ignorieren
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message ?? 'Verbindungsfehler')
      }
    } finally {
      setIsStreaming(false)
    }
  }, [options])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setStreamingText('')
    setIsStreaming(false)
    setError(null)
  }, [])

  return { streamingText, isStreaming, error, sendStreaming, reset }
}
