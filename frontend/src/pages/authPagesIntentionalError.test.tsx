import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps, ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from './Login'
import RegisterPage from './Register'
import ResetPasswordPage from './ResetPassword'
import { authAPI } from '../api/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

vi.mock('../context/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../api/api', () => ({
  authAPI: {
    login: vi.fn(),
    register: vi.fn(),
    resetPassword: vi.fn(),
  },
}))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../components/shared/Spinner', () => ({ default: () => null }))
vi.mock('../components/shared/Logo', () => ({ default: () => null }))
vi.mock('../components/ui/button', () => ({
  Button: ({ children, ...props }: ComponentProps<'button'>) => <button {...props}>{children}</button>,
}))
vi.mock('../components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
vi.mock('../components/ui/input', () => ({ Input: (props: ComponentProps<'input'>) => <input {...props} /> }))
vi.mock('../components/ui/label', () => ({
  Label: ({ children, ...props }: ComponentProps<'label'>) => <label {...props}>{children}</label>,
}))

const mockedUseAuth = vi.mocked(useAuth)
const mockedAuthAPI = vi.mocked(authAPI)
const mockedToast = vi.mocked(toast)

beforeEach(() => {
  vi.clearAllMocks()
  mockedUseAuth.mockReturnValue({
    user: null,
    loading: false,
    saveUser: vi.fn(() => ({ id: 1, email: 'user@example.com', role: 'user', full_name: 'Test User' })),
    logout: vi.fn(async () => {}),
    sessionExpired: false,
  })
})

afterEach(() => cleanup())

type AuthPage = 'login' | 'register' | 'reset'

function renderPage(page: AuthPage): void {
  const entry = page === 'reset' ? '/reset-password?token=token' : '/'
  const Page = page === 'login' ? LoginPage : page === 'register' ? RegisterPage : ResetPasswordPage
  render(<MemoryRouter initialEntries={[entry]}><Page /></MemoryRouter>)
}

function fillPage(page: AuthPage): void {
  if (page === 'login') {
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
  } else if (page === 'register') {
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Test User' } })
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'password123' } })
  } else {
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'password123' } })
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'password123' } })
  }
}

async function submitPage(page: AuthPage): Promise<void> {
  const request = page === 'login'
    ? mockedAuthAPI.login
    : page === 'register'
      ? mockedAuthAPI.register
      : mockedAuthAPI.resetPassword
  request.mockRejectedValueOnce({ response: { data: { detail: [{ msg: 'Invalid input' }] } } })
  renderPage(page)
  fillPage(page)
  fireEvent.click(screen.getByRole('button', { name: page === 'login' ? 'Sign In' : page === 'register' ? 'Create Account' : 'Update Password' }))
  await vi.waitFor(() => expect(mockedToast.error).toHaveBeenCalled())
}

const intentionalErrorCases: ReadonlyArray<readonly [AuthPage, string]> = [
  ['login', 'Invalid email or password'],
  ['register', 'Registration failed'],
  ['reset', 'Password reset failed'],
]

describe.each(intentionalErrorCases)('%s intentional 422 handling', (page, fallback) => {
  it('intentional: non-string detail shows fallback', async () => {
    await submitPage(page)
    expect(mockedToast.error).toHaveBeenCalledWith(fallback)
  })
})
