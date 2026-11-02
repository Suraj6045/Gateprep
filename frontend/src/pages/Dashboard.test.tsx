import { describe, expect, it } from 'vitest'
import {
  getAttemptMap,
  getAttemptPercentage,
  getCompletedCount,
  getScoreToneClass,
} from './Dashboard'
import type { HistoryItem } from '../types/api'

type DashboardHistoryFixture = Pick<HistoryItem, 'test_id' | 'status' | 'score' | 'total_marks'>

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
