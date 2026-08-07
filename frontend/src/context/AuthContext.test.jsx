import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'

// ── Mocks ────────────────────────────────────────────────────────
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('swr', () => ({ mutate: vi.fn() }))

const mockGet = vi.fn()
const mockPost = vi.fn()
vi.mock('../api/client', () => ({
  default: { get: (...args) => mockGet(...args), post: (...args) => mockPost(...args) },
  AUTH_UNAUTHORIZED_EVENT: 'gateprep:auth-unauthorized',
  startTokenRefresh: vi.fn(),
  stopTokenRefresh: vi.fn(),
}))

// Helper to consume and display context values
function AuthConsumer() {
  const { user, loading, sessionExpired, logout, saveUser } = useAuth()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? JSON.stringify(user) : 'null'}</span>
      <span data-testid="session-expired">{String(sessionExpired)}</span>
      <button data-testid="logout-btn" onClick={logout}>Logout</button>
      <button data-testid="save-btn" onClick={() => saveUser({ id: 99, email: 'new@test.com', role: 'student', full_name: 'New' })}>Save</button>
    </div>
  )
}

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

// ── Tests ────────────────────────────────────────────────────────
describe('AuthProvider', () => {
  it('initialises: fetches /auth/me and sets user on success', async () => {
    const userData = { id: 1, email: 'a@b.com', role: 'admin', full_name: 'Admin' }
    mockGet.mockResolvedValueOnce({ data: userData })

    renderWithRouter(
      <AuthProvider><AuthConsumer /></AuthProvider>
    )

    // Initially loading
    expect(screen.getByTestId('loading').textContent).toBe('true')

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    expect(screen.getByTestId('user').textContent).toContain('"email":"a@b.com"')

    const { startTokenRefresh } = await import('../api/client')
    expect(startTokenRefresh).toHaveBeenCalledWith({ refreshNow: true })
  })

  it('initialises: sets user to null when /auth/me fails', async () => {
    mockGet.mockRejectedValueOnce(new Error('Unauthorized'))

    renderWithRouter(
      <AuthProvider><AuthConsumer /></AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    expect(screen.getByTestId('user').textContent).toBe('null')
  })

  it('logout: clears user, stops refresh, and navigates to /login', async () => {
    const userData = { id: 1, email: 'a@b.com', role: 'admin', full_name: 'Admin' }
    mockGet.mockResolvedValueOnce({ data: userData })
    mockPost.mockResolvedValueOnce({}) // logout API call

    renderWithRouter(
      <AuthProvider><AuthConsumer /></AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    await act(async () => {
      await userEvent.click(screen.getByTestId('logout-btn'))
    })

    const { stopTokenRefresh } = await import('../api/client')
    expect(stopTokenRefresh).toHaveBeenCalled()
    expect(screen.getByTestId('user').textContent).toBe('null')
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
  })

  it('logout: still clears state even if API call fails', async () => {
    mockGet.mockResolvedValueOnce({ data: { id: 1, email: 'a@b.com', role: 'student', full_name: 'S' } })
    mockPost.mockRejectedValueOnce(new Error('network error'))

    renderWithRouter(
      <AuthProvider><AuthConsumer /></AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    await act(async () => {
      await userEvent.click(screen.getByTestId('logout-btn'))
    })

    // User should still be cleared despite API failure
    expect(screen.getByTestId('user').textContent).toBe('null')
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
  })

  it('saveUser: sets user from provided data and starts token refresh', async () => {
    mockGet.mockRejectedValueOnce(new Error('no session')) // initial load fails

    renderWithRouter(
      <AuthProvider><AuthConsumer /></AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    await act(async () => {
      await userEvent.click(screen.getByTestId('save-btn'))
    })

    expect(screen.getByTestId('user').textContent).toContain('"email":"new@test.com"')
    expect(screen.getByTestId('session-expired').textContent).toBe('false')

    const { startTokenRefresh } = await import('../api/client')
    expect(startTokenRefresh).toHaveBeenCalled()
  })

  it('session expired: shows dialog on AUTH_UNAUTHORIZED_EVENT', async () => {
    mockGet.mockResolvedValueOnce({ data: { id: 1, email: 'a@b.com', role: 'admin', full_name: 'A' } })

    renderWithRouter(
      <AuthProvider><AuthConsumer /></AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    // Fire the unauthorized event
    act(() => {
      window.dispatchEvent(new CustomEvent('gateprep:auth-unauthorized'))
    })

    expect(screen.getByTestId('session-expired').textContent).toBe('true')
    expect(screen.getByText('Session expired')).toBeTruthy()
    expect(screen.getByText('Sign in')).toBeTruthy()
  })

  it('confirmSessionExpired: clicking "Sign in" clears state and navigates to /login', async () => {
    mockGet.mockResolvedValueOnce({ data: { id: 1, email: 'a@b.com', role: 'admin', full_name: 'A' } })

    renderWithRouter(
      <AuthProvider><AuthConsumer /></AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false')
    })

    act(() => {
      window.dispatchEvent(new CustomEvent('gateprep:auth-unauthorized'))
    })

    await act(async () => {
      await userEvent.click(screen.getByText('Sign in'))
    })

    const { stopTokenRefresh } = await import('../api/client')
    expect(stopTokenRefresh).toHaveBeenCalled()
    expect(screen.getByTestId('user').textContent).toBe('null')
    expect(screen.getByTestId('session-expired').textContent).toBe('false')
    expect(mockNavigate).toHaveBeenCalledWith('/login', expect.objectContaining({ replace: true }))
  })
})

describe('useAuth', () => {
  it('throws if used outside AuthProvider', () => {
    // Suppress React error boundary console noise
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    function Naked() {
      useAuth()
      return null
    }

    expect(() => render(<Naked />)).toThrow('useAuth must be used within AuthProvider')
    spy.mockRestore()
  })
})
