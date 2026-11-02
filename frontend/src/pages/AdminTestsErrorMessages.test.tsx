import { fireEvent, render, screen, cleanup, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import AdminTests from './AdminTests'
import { adminAPI } from '../api/api'
import toast from 'react-hot-toast'

vi.mock('../api/api', () => ({
  adminAPI: {
    createTest: vi.fn(),
    deleteTest: vi.fn(),
  },
  fetcher: vi.fn(),
}))
vi.mock('swr', () => ({
  default: vi.fn(() => ({ data: [], isLoading: false, mutate: vi.fn() })),
}))
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))
vi.mock('../components/shared/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({ user: null, logout: vi.fn(), sessionExpired: false })),
}))

const mockedCreateTest = vi.mocked(adminAPI.createTest)
const mockedToast = vi.mocked(toast)

const errors = {
  string: { response: { data: { detail: 'Server detail' } } },
  empty: { response: { data: { detail: '' } } },
  noResponse: {},
  plainError: new Error('Request failed'),
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

async function submitCreateTest(error: unknown) {
  mockedCreateTest.mockRejectedValueOnce(error)
  render(<MemoryRouter><AdminTests /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'New Test' }))
  const modal = screen.getByRole('dialog')
  fireEvent.change(within(modal).getByPlaceholderText('e.g. DBMS Weekly Quiz #3'), {
    target: { value: 'Test title' },
  })
  fireEvent.click(within(modal).getByRole('button', { name: 'Weekly Quiz' }))
  fireEvent.change(within(modal).getByRole('combobox'), {
    target: { value: 'Engineering Mathematics' },
  })
  fireEvent.click(within(modal).getByRole('button', { name: 'Create Test' }))
  await vi.waitFor(() => expect(mockedToast.error).toHaveBeenCalled())
}

describe.each([
  ['string detail', errors.string, 'Server detail'],
  ['empty-string detail', errors.empty, 'Failed to create test'],
  ['no response', errors.noResponse, 'Failed to create test'],
  ['non-Axios Error', errors.plainError, 'Failed to create test'],
])('AdminTests create error messages', (label, error, expected) => {
  it(label, async () => {
    await submitCreateTest(error)
    expect(mockedToast.error).toHaveBeenCalledWith(expected)
  })
})

it('returns focus to the trigger button when the modal closes with Escape', () => {
  render(<MemoryRouter><AdminTests /></MemoryRouter>)
  const trigger = screen.getByRole('button', { name: 'New Test' })

  trigger.focus()
  fireEvent.click(trigger)
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

  expect(document.activeElement).toBe(trigger)
})

async function submitAndReadDuration(duration?: string) {
  mockedCreateTest.mockRejectedValueOnce(new Error('characterization'))
  render(<MemoryRouter><AdminTests /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'New Test' }))
  const modal = screen.getByRole('dialog')
  fireEvent.change(within(modal).getByPlaceholderText('e.g. DBMS Weekly Quiz #3'), {
    target: { value: 'Test title' },
  })
  if (duration !== undefined) {
    fireEvent.change(within(modal).getByRole('spinbutton'), { target: { value: duration } })
  }
  fireEvent.click(within(modal).getByRole('button', { name: 'Weekly Quiz' }))
  fireEvent.change(within(modal).getByRole('combobox'), {
    target: { value: 'Engineering Mathematics' },
  })
  fireEvent.click(within(modal).getByRole('button', { name: 'Create Test' }))
  await vi.waitFor(() => expect(mockedCreateTest).toHaveBeenCalled())
  return mockedCreateTest.mock.calls.at(-1)?.[0]
}

it('characterizes the default duration payload', async () => {
  const payload = await submitAndReadDuration()
  expect(payload?.duration_minutes).toBe(180)
})

it('characterizes a changed duration payload', async () => {
  const payload = await submitAndReadDuration('90')
  expect(payload?.duration_minutes).toBe('90')
})

it('characterizes a cleared duration payload', async () => {
  const payload = await submitAndReadDuration('')
  expect(payload?.duration_minutes).toBe('')
})

it('intentional: non-string detail shows the create-test fallback', async () => {
  mockedCreateTest.mockRejectedValueOnce({
    response: { data: { detail: [{ msg: 'duration must be greater than 0' }] } },
  })
  render(<MemoryRouter><AdminTests /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'New Test' }))
  const modal = screen.getByRole('dialog')
  fireEvent.change(within(modal).getByPlaceholderText('e.g. DBMS Weekly Quiz #3'), {
    target: { value: 'Test title' },
  })
  fireEvent.change(within(modal).getByRole('spinbutton'), { target: { value: '' } })
  fireEvent.click(within(modal).getByRole('button', { name: 'Weekly Quiz' }))
  fireEvent.change(within(modal).getByRole('combobox'), {
    target: { value: 'Engineering Mathematics' },
  })
  fireEvent.click(within(modal).getByRole('button', { name: 'Create Test' }))

  await vi.waitFor(() => expect(mockedToast.error).toHaveBeenCalledWith('Failed to create test'))
})
