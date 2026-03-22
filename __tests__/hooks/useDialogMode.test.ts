import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useDialogMode } from '@/hooks/useDialogMode'

describe('useDialogMode', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('startet im idle-State', () => {
    const { result } = renderHook(() => useDialogMode())
    expect(result.current.state).toBe('idle')
  })

  it('Transition: idle -> greeting -> listening (nach startDialog)', async () => {
    const { result } = renderHook(() => useDialogMode())
    await act(async () => {
      result.current.startDialog()
    })
    expect(['greeting', 'listening']).toContain(result.current.state)
  })

  it('stopDialog -> idle', async () => {
    const { result } = renderHook(() => useDialogMode())
    await act(async () => {
      result.current.startDialog()
    })
    act(() => {
      result.current.stopDialog()
    })
    expect(result.current.state).toBe('idle')
  })

  it('erkennt Abschiedsphrasen', () => {
    const { result } = renderHook(() => useDialogMode())
    expect(result.current.isFarewell('Tschuess, danke!')).toBe(true)
    expect(result.current.isFarewell('Danke, das wars')).toBe(true)
    expect(result.current.isFarewell('Fertig')).toBe(true)
    expect(result.current.isFarewell('Wann kommt die Muellabfuhr?')).toBe(false)
  })

  it('handleTranscript wechselt zu processing', async () => {
    const { result } = renderHook(() => useDialogMode())
    await act(async () => {
      result.current.startDialog()
    })
    // State muss greeting oder listening sein
    act(() => {
      result.current.handleTranscript('Was gibt es Neues?')
    })
    expect(result.current.state).toBe('processing')
  })

  it('handleTranscript mit Abschied -> idle', async () => {
    const { result } = renderHook(() => useDialogMode())
    await act(async () => {
      result.current.startDialog()
    })
    act(() => {
      result.current.handleTranscript('Tschuess, danke!')
    })
    expect(result.current.state).toBe('idle')
  })

  it('audioLevel startet bei 0', () => {
    const { result } = renderHook(() => useDialogMode())
    expect(result.current.audioLevel).toBe(0)
  })

  it('setAudioLevel aktualisiert audioLevel', () => {
    const { result } = renderHook(() => useDialogMode())
    act(() => {
      result.current.setAudioLevel(0.7)
    })
    expect(result.current.audioLevel).toBe(0.7)
  })

  it('setSpeakingDone wechselt von speaking zu listening', async () => {
    const { result } = renderHook(() => useDialogMode())
    await act(async () => {
      result.current.startDialog()
    })
    // Simuliere speaking-State
    act(() => {
      result.current.handleTranscript('Hallo')
    })
    // Jetzt processing -> speaking via setSpeakingDone nach Response
    act(() => {
      result.current.setResponse('Antwort text')
    })
    expect(result.current.state).toBe('speaking')
    act(() => {
      result.current.setSpeakingDone()
    })
    expect(result.current.state).toBe('listening')
  })

  it('triggerSilenceCheck wechselt zu silence_check', async () => {
    const { result } = renderHook(() => useDialogMode())
    await act(async () => {
      result.current.startDialog()
    })
    act(() => { vi.advanceTimersByTime(1500) }) // greeting -> listening
    act(() => {
      result.current.triggerSilenceCheck()
    })
    expect(result.current.state).toBe('silence_check')
  })

  it('beendet Dialog nach silence_check + 3s ohne Antwort', async () => {
    const { result } = renderHook(() => useDialogMode())
    await act(async () => {
      result.current.startDialog()
    })
    act(() => { vi.advanceTimersByTime(1500) }) // greeting -> listening
    act(() => {
      result.current.triggerSilenceCheck()
    })
    expect(result.current.state).toBe('silence_check')
    // 3s warten ohne Antwort -> idle
    act(() => { vi.advanceTimersByTime(3000) })
    expect(result.current.state).toBe('idle')
  })

  it('silence_check -> listening wenn Transcript kommt', async () => {
    const { result } = renderHook(() => useDialogMode())
    await act(async () => {
      result.current.startDialog()
    })
    act(() => { vi.advanceTimersByTime(1500) })
    act(() => {
      result.current.triggerSilenceCheck()
    })
    expect(result.current.state).toBe('silence_check')
    // Neue Frage -> processing
    act(() => {
      result.current.handleTranscript('Wie wird das Wetter?')
    })
    expect(result.current.state).toBe('processing')
  })
})
