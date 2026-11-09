import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import {
  DashboardTestCard,
  getAttemptMap,
  getAttemptPercentage,
  getCompletedCount,
  getScoreToneClass,
} from './Dashboard'
import type { HistoryItem, TestCatalogItem } from '../types/api'

type DashboardHistoryFixture = Pick<HistoryItem, 'test_id' | 'status' | 'score' | 'total_marks'>

const mockTest: TestCatalogItem = {
  id: 42,
  title: 'Algorithms Test',
  description: 'Practice test for algorithms',
  duration_minutes: 60,
  question_count: 30,
  total_marks: 50,
  created_at: '2026-01-01T00:00:00Z',
  series_id: null,
  series_name: null,
  test_type: null,
  subject: 'CS',
  category: null,
}

describe('Dashboard helpers', () => {
  it('builds the submitted-attempt map and completed count', () => {
    const history: DashboardHistoryFixture[] = [
      { test_id: 1, status: 'submitted', score: 10, total_marks: 20 },
      { test_id: 2, status: 'in_progress', score: 4, total_marks: 20 },
      { test_id: 1, status: 'submitted', score: 15, total_marks: 20 },
      { test_id: 3, status: 'submitted', score: 12, total_marks: 20 },
    ]

    expect(getCompletedCount(history)).toBe(2)
    expect(getAttemptMap(history)[1]).toMatchObject({ test_id: 1, score: 15, total_marks: 20 })
    expect(getAttemptMap(history)[2]).toMatchObject({ test_id: 2, status: 'in_progress' })
  })

  it('calculates the percentage and tone class from a score', () => {
    expect(getAttemptPercentage({ score: 18, total_marks: 20 })).toBe(90)
    expect(getAttemptPercentage({ score: 0, total_marks: 20 })).toBe(0)
    expect(getScoreToneClass(80)).toBe('bg-[var(--success-text)]/10 border-[var(--success-text)]/20 text-success-text dark:text-success-text')
    expect(getScoreToneClass(60)).toBe('bg-[var(--warning-text)]/10 border-[var(--warning-text)]/20 text-warning-text dark:text-warning-text')
    expect(getScoreToneClass(35)).toBe('bg-[var(--destructive)]/10 border-[var(--destructive)]/20 text-destructive dark:text-destructive')
  })
})

describe('DashboardTestCard actions', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders Start Test when not done', () => {
    render(
      <MemoryRouter>
        <DashboardTestCard testItem={mockTest} attempt={undefined} done={false} percentage={null} />
      </MemoryRouter>
    )
    const link = screen.getByRole('link', { name: /start test/i })
    expect(link.getAttribute('href')).toBe('/tests/42')
    expect(screen.queryByText(/retake/i)).toBeNull()
    expect(screen.queryByText(/view result/i)).toBeNull()
  })

  it('renders View Result and Retake when done and attempt exists', () => {
    const attempt: HistoryItem = {
      id: 99,
      test_id: 42,
      status: 'submitted',
      score: 40,
      total_marks: 50,
      started_at: '2026-01-01T00:00:00Z',
      submitted_at: '2026-01-01T01:00:00Z',
      fullscreen_violations: 0,
      tab_violations: 0,
    }

    render(
      <MemoryRouter>
        <DashboardTestCard testItem={mockTest} attempt={attempt} done={true} percentage={80} />
      </MemoryRouter>
    )
    const viewResultLink = screen.getByRole('link', { name: /view result/i })
    expect(viewResultLink.getAttribute('href')).toBe('/results/99')
    const retakeLink = screen.getByRole('link', { name: /retake/i })
    expect(retakeLink.getAttribute('href')).toBe('/tests/42')
  })

  it('hides View Result and renders Retake when done but attempt.id is missing', () => {
    render(
      <MemoryRouter>
        <DashboardTestCard testItem={mockTest} attempt={undefined} done={true} percentage={null} />
      </MemoryRouter>
    )
    expect(screen.queryByText(/view result/i)).toBeNull()
    const retakeLink = screen.getByRole('link', { name: /retake/i })
    expect(retakeLink.getAttribute('href')).toBe('/tests/42')
  })
})
