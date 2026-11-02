import { fireEvent, render, screen, waitFor, cleanup, act } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { AxiosHeaders } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import TestEngine from './TestEngine'
import { adminAPI, testAPI } from '../api/api'
import type { AdminQuestion, ApiResponse, AttemptStart, TestDetail, TestQuestion } from '@/types/api'

vi.mock('../api/api', () => ({
  adminAPI: {
    getQuestions: vi.fn(),
  },
  testAPI: {
    getTest: vi.fn(),
    startTest: vi.fn(),
    getQuestions: vi.fn(),
    saveAnswers: vi.fn(),
    submitTest: vi.fn(),
    updateViolations: vi.fn(),
  },
}))

vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
  }),
}))

const testData: TestDetail = {
  id: 7,
  title: 'Flow Test',
  description: null,
  duration_minutes: 60,
  total_marks: 2,
  question_count: 2,
  series_id: null,
  created_at: '2026-11-01T10:00:00Z',
  test_type: null,
}

const questions: TestQuestion[] = [
  {
    id: 11,
    question_type: 'mcq',
    question_text: 'Which option?',
    question_image_url: null,
    options: ['Alpha', 'Beta'],
    option_images: null,
    order_index: 0,
    marks: 1,
    negative_marks: 0,
    subject: 'Computer Science',
    topic: null,
  },
  {
    id: 12,
    question_type: 'mcq',
    question_text: 'Second question?',
    question_image_url: null,
    options: ['Gamma', 'Delta'],
    option_images: null,
    order_index: 1,
    marks: 1,
    negative_marks: 0,
    subject: 'Computer Science',
    topic: null,
  },
]

const adminQuestions: AdminQuestion[] = [
  {
    id: 11,
    question_type: 'mcq',
    question_text: 'Which option?',
    question_image_url: null,
    options: ['Alpha', 'Beta'],
    option_images: null,
    order_index: 0,
    marks: 1,
    negative_marks: 0,
    subject: 'Computer Science',
    topic: null,
    correct_answer: 'A',
  },
  {
    id: 12,
    question_type: 'mcq',
    question_text: 'Second question?',
    question_image_url: null,
    options: ['Gamma', 'Delta'],
    option_images: null,
    order_index: 1,
    marks: 1,
    negative_marks: 0,
    subject: 'Computer Science',
    topic: null,
    correct_answer: 'A',
  },
]

const attempt: AttemptStart = {
  id: 31,
  test_id: 7,
  status: 'in_progress',
  started_at: '2026-11-01T10:00:00Z',
  submitted_at: null,
  score: null,
  total_marks: null,
  tab_violations: 0,
  fullscreen_violations: 0,
  server_time: '2026-11-01T10:00:00Z',
  answers: [],
  attempt_number: 1,
  max_attempts: 6,
}

function response<T>(data: T): ApiResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  }
}

function LocationProbe(): React.ReactElement {
  const location = useLocation()
  return <output data-testid="location">{location.pathname}</output>
}

function renderPage(entry = '/tests/7'): void {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/tests/:testId" element={<TestEngine />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function beginExam(): Promise<void> {
  await waitFor(() => expect(screen.getByRole('heading', { name: 'General Instructions' })).toBeInTheDocument())
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(screen.getByRole('button', { name: 'Begin Test' }))
  await waitFor(() => expect(screen.getByText('Question No. 1')).toBeInTheDocument())
}

beforeEach(() => {
  vi.mocked(testAPI.getTest).mockResolvedValue(response(testData))
  vi.mocked(testAPI.startTest).mockResolvedValue(response(attempt))
  vi.mocked(testAPI.getQuestions).mockResolvedValue(response(questions))
  vi.mocked(adminAPI.getQuestions).mockResolvedValue(response(adminQuestions))
  vi.mocked(testAPI.saveAnswers).mockResolvedValue(response({ message: 'Saved' }))
  vi.mocked(testAPI.submitTest).mockResolvedValue(response({
    id: 31,
    test_id: 7,
    status: 'submitted',
    started_at: attempt.started_at,
    submitted_at: '2026-11-01T10:30:00Z',
    score: 1,
    total_marks: 2,
    tab_violations: 0,
    fullscreen_violations: 0,
    persisted: true,
  }))
  vi.mocked(testAPI.updateViolations).mockResolvedValue(response({ message: 'Updated' }))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('TestEngine page flow', () => {
  it('loads the test and shows instructions before an attempt starts', async () => {
    renderPage()

    await waitFor(() => expect(screen.getByRole('heading', { name: 'General Instructions' })).toBeInTheDocument())
    expect(screen.queryByText('Question No. 1')).not.toBeInTheDocument()
    expect(testAPI.getTest).toHaveBeenCalledExactlyOnceWith('7')
  })

  it('starts an attempt in API order and shows the first question', async () => {
    renderPage()
    await beginExam()

    expect(testAPI.getTest).toHaveBeenCalledBefore(vi.mocked(testAPI.startTest))
    expect(vi.mocked(testAPI.startTest)).toHaveBeenCalledBefore(vi.mocked(testAPI.getQuestions))
    expect(testAPI.getTest).toHaveBeenCalledExactlyOnceWith('7')
    expect(testAPI.startTest).toHaveBeenCalledExactlyOnceWith('7')
    expect(testAPI.getQuestions).toHaveBeenCalledExactlyOnceWith('7', 31)
  })

  it('submits selected and unanswered answers after review and palette navigation', async () => {
    renderPage()
    await beginExam()

    fireEvent.click(screen.getByRole('button', { name: /Mark & Next/ }))
    fireEvent.click(screen.getAllByRole('radio')[0])
    await waitFor(() => expect(screen.getAllByRole('radio')[0]).toHaveAttribute('aria-checked', 'true'))
    fireEvent.click(screen.getAllByRole('button', { name: /^Q2\/2$/ })[0])
    fireEvent.click(screen.getAllByRole('button', { name: /^1$/ })[0])
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Question Palette' })).not.toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /Submit Test|Submit/ })[0])
    fireEvent.click(screen.getByRole('button', { name: /^Submit$/ }))

    await waitFor(() => expect(testAPI.submitTest).toHaveBeenCalledExactlyOnceWith('7', 31, [
      { question_id: 11, selected_answer: null, time_spent_seconds: 0 },
      { question_id: 12, selected_answer: 'A', time_spent_seconds: 0 },
    ]))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/results/31'))
  })

  it('shows the empty-questions screen without rendering QuestionView', async () => {
    vi.mocked(testAPI.getQuestions).mockResolvedValue(response([]))
    renderPage()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'General Instructions' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Begin Test' }))
    await waitFor(() => expect(screen.getByText('No Questions Available')).toBeInTheDocument())
    expect(screen.getByText('No Questions Available')).toBeInTheDocument()
    expect(screen.queryByText('Question No. 1')).not.toBeInTheDocument()
  })

  it('uses admin questions and admin navigation in preview mode', async () => {
    renderPage('/tests/7?preview=true')
    await beginExam()

    expect(adminAPI.getQuestions).toHaveBeenCalledExactlyOnceWith('7')
    expect(testAPI.startTest).not.toHaveBeenCalled()
    expect(testAPI.saveAnswers).not.toHaveBeenCalled()
    expect(testAPI.submitTest).not.toHaveBeenCalled()

    fireEvent.click(screen.getAllByRole('button', { name: /Submit Test|Submit/ })[0])
    fireEvent.click(screen.getByRole('button', { name: /^Submit$/ }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/admin/tests/7'))
  })

  it('shows the load error and navigates to tests', async () => {
    vi.mocked(testAPI.getTest).mockRejectedValue(new Error('load failed'))
    renderPage()

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to load test'))
    expect(screen.getByTestId('location')).toHaveTextContent('/tests')
  })

  it('records a fullscreen violation after the guarded delay', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    renderPage()
    await beginExam()

    act(() => {
      vi.advanceTimersByTime(2000)
      document.dispatchEvent(new Event('fullscreenchange'))
      vi.advanceTimersByTime(250)
    })

    expect(testAPI.updateViolations).toHaveBeenCalledExactlyOnceWith('7', 31, {
      fullscreen_violations: 1,
    })
  })

  it('autosaves the current answers after thirty seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    renderPage()
    await beginExam()

    act(() => vi.advanceTimersByTime(30000))

    expect(testAPI.saveAnswers).toHaveBeenCalledExactlyOnceWith('7', 31, [])
  })

  it('toggles scientific calculator from the icon button and does not render subject tabs in header', async () => {
    renderPage()
    await beginExam()

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()

    const calcButton = screen.getByRole('button', { name: 'Calculator' })
    expect(calcButton).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Scientific Calculator' })).not.toBeInTheDocument()

    fireEvent.click(calcButton)
    expect(screen.getByRole('dialog', { name: 'Scientific Calculator' })).toBeInTheDocument()

    fireEvent.click(calcButton)
    expect(screen.queryByRole('dialog', { name: 'Scientific Calculator' })).not.toBeInTheDocument()
  })

  it('renders a single section palette without Part A / Part B for single-section tests', async () => {
    renderPage()
    await beginExam()

    expect(screen.queryByText('Part A')).not.toBeInTheDocument()
    expect(screen.queryByText('Part B')).not.toBeInTheDocument()
    expect(screen.getByText('Computer Science')).toBeInTheDocument()
  })

  it('renders General Aptitude and Core Subject sections in palette for full-length test', async () => {
    vi.mocked(testAPI.getTest).mockResolvedValue(response({
      ...testData,
      test_type: 'full_length',
    }))
    vi.mocked(testAPI.getQuestions).mockResolvedValue(response([
      { ...questions[0], id: 101, subject: 'General Aptitude' },
      { ...questions[1], id: 102, subject: 'Computer Science' },
    ]))
    renderPage()
    await beginExam()

    expect(screen.getByText('General Aptitude')).toBeInTheDocument()
    expect(screen.getByText('Core Subject')).toBeInTheDocument()
    expect(screen.queryByText('Part A')).not.toBeInTheDocument()
    expect(screen.queryByText('Part B')).not.toBeInTheDocument()
  })

  it('renders concise question type "MCQ" without "Single"', async () => {
    renderPage()
    await beginExam()

    expect(screen.getByText('MCQ')).toBeInTheDocument()
    expect(screen.queryByText('MCQ Single')).not.toBeInTheDocument()
  })

  it('collapses and expands the sidebar', async () => {
    renderPage()
    await beginExam()

    expect(screen.queryByRole('button', { name: 'Expand sidebar' })).not.toBeInTheDocument()
    const collapseBtn = screen.getByRole('button', { name: 'Collapse sidebar' })
    fireEvent.click(collapseBtn)

    const expandBtn = screen.getByRole('button', { name: 'Expand sidebar' })
    expect(expandBtn).toBeInTheDocument()

    fireEvent.click(expandBtn)
    expect(screen.queryByRole('button', { name: 'Expand sidebar' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeInTheDocument()
  })
})
