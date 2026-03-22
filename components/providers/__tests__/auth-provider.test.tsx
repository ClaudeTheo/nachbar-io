// Unit-Tests fuer AuthProvider + useAuth Hook
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act, cleanup } from '@testing-library/react'
import { AuthProvider, useAuth } from '../auth-provider'

// Mock: Supabase Client
const mockGetUser = vi.fn()
const mockGetSession = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockUnsubscribe = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
  }),
}))

// Hilfskomponente zum Testen des Hooks
function AuthConsumer() {
  const { user, loading, refreshUser } = useAuth()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user?.email ?? 'null'}</span>
      <button onClick={refreshUser}>Refresh</button>
    </div>
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('rendert children korrekt', () => {
    render(
      <AuthProvider>
        <span>Inhalt</span>
      </AuthProvider>
    )
    expect(screen.getByText('Inhalt')).toBeInTheDocument()
  })

  it('startet mit loading=true, dann false nach mount', async () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )

    // Nach dem initialen getUser-Call wird loading auf false gesetzt
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })
  })

  it('liefert user=null wenn nicht eingeloggt', async () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('null')
    })
  })

  it('liefert den User wenn eingeloggt', async () => {
    const fakeUser = { id: '123', email: 'test@example.com' }
    mockGetSession.mockResolvedValue({ data: { session: { user: fakeUser } }, error: null })

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('test@example.com')
    })
  })

  it('registriert onAuthStateChange und raumt beim Unmount auf', async () => {
    const { unmount } = render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(mockOnAuthStateChange).toHaveBeenCalledOnce()
    })

    unmount()
    expect(mockUnsubscribe).toHaveBeenCalledOnce()
  })

  it('aktualisiert den User bei Auth-State-Aenderung', async () => {
    let authCallback: (event: string, session: { user: { id: string; email: string } } | null) => void = () => {}
    mockOnAuthStateChange.mockImplementation((cb: typeof authCallback) => {
      authCallback = cb
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } }
    })

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    // Simuliere Login via onAuthStateChange
    act(() => {
      authCallback('SIGNED_IN', { user: { id: '456', email: 'neu@example.com' } })
    })

    expect(screen.getByTestId('user').textContent).toBe('neu@example.com')
  })

  it('setzt user auf null bei SIGNED_OUT', async () => {
    const fakeUser = { id: '123', email: 'test@example.com' }
    mockGetSession.mockResolvedValue({ data: { session: { user: fakeUser } }, error: null })

    let authCallback: (event: string, session: null) => void = () => {}
    mockOnAuthStateChange.mockImplementation((cb: typeof authCallback) => {
      authCallback = cb
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } }
    })

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('test@example.com')
    })

    // Simuliere Logout
    act(() => {
      authCallback('SIGNED_OUT', null)
    })

    expect(screen.getByTestId('user').textContent).toBe('null')
  })

  it('refreshUser laedt den User neu', async () => {
    // Throttle umgehen: Date.now() so manipulieren, dass der Abstand >30s ist
    const originalNow = Date.now
    let nowValue = 1000000

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('null')
    })

    // Jetzt gibt getUser einen User zurueck
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: '789', email: 'refresh@example.com' } },
      error: null,
    })

    // Throttle-Sperre umgehen: Zeit 60s vorspulen
    Date.now = () => nowValue + 60_000

    // Refresh ausloesen
    await act(async () => {
      screen.getByRole('button', { name: 'Refresh' }).click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('refresh@example.com')
    })

    Date.now = originalNow
  })
})

describe('useAuth (ohne Provider)', () => {
  afterEach(() => {
    cleanup()
  })

  it('gibt Standardwerte zurueck wenn kein Provider vorhanden', () => {
    // Ohne Provider: loading=true, user=null (Standardwerte aus createContext)
    const { getByTestId } = render(<AuthConsumer />)
    expect(getByTestId('loading').textContent).toBe('true')
    expect(getByTestId('user').textContent).toBe('null')
  })
})
