import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TestHeader, { type TestHeaderProps } from './TestHeader'
import type { TestDetail } from '@/types/api'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const mockTest: TestDetail = {
  id: 1,
  title: 'GATE CS Mock Exam 2026',
  description: 'Full length practice test',
  duration_minutes: 180,
  total_marks: 100,
  question_count: 65,
  series_id: null,
  created_at: '2026-01-01T00:00:00Z',
  test_type: 'full_length',
}

describe('TestHeader component', () => {
  const defaultProps: TestHeaderProps = {
    attemptNumber: 1,
    endTimeMs: Date.now() + 60000,
    handleTimerExpire: vi.fn(),
    maxAttempts: 5,
    onSubmitClick: vi.fn(),
    setShowCalc: vi.fn(),
    showCalc: false,
    submitting: false,
    test: mockTest,
    totalViolations: 0,
  }

  it('renders test title and does not render subject tabs or tablist', () => {
    render(<TestHeader {...defaultProps} />)

    expect(screen.getByText('GATE CS Mock Exam 2026')).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })

  it('renders calculator button as an icon-only button with proper accessibility attributes', () => {
    render(<TestHeader {...defaultProps} />)

    const calcButton = screen.getByRole('button', { name: 'Calculator' })
    expect(calcButton).toBeInTheDocument()
    expect(calcButton).toHaveAttribute('title', 'Calculator')
    // Ensure "Calc" text is no longer rendered
    expect(screen.queryByText(/^Calc$/i)).not.toBeInTheDocument()
  })

  it('toggles calculator state on button click', () => {
    const setShowCalc = vi.fn()
    render(<TestHeader {...defaultProps} setShowCalc={setShowCalc} />)

    const calcButton = screen.getByRole('button', { name: 'Calculator' })
    fireEvent.click(calcButton)

    expect(setShowCalc).toHaveBeenCalledOnce()
    const updater = setShowCalc.mock.calls[0][0]
    expect(typeof updater).toBe('function')
    expect(updater(false)).toBe(true)
    expect(updater(true)).toBe(false)
  })

  it('reflects active calculator state style when showCalc is true', () => {
    const { rerender } = render(<TestHeader {...defaultProps} showCalc={false} />)
    const inactiveBtn = screen.getByRole('button', { name: 'Calculator' })
    expect(inactiveBtn).toHaveClass('text-muted-foreground')

    rerender(<TestHeader {...defaultProps} showCalc={true} />)
    const activeBtn = screen.getByRole('button', { name: 'Calculator' })
    expect(activeBtn).toHaveClass('bg-primary')
    expect(activeBtn).toHaveClass('text-white')
  })

  it('displays attempt count and violations count when applicable', () => {
    const { rerender } = render(
      <TestHeader {...defaultProps} attemptNumber={2} maxAttempts={3} totalViolations={0} />
    )
    expect(screen.getByText('Attempt 2/3')).toBeInTheDocument()
    expect(screen.queryByText(/Violations/)).not.toBeInTheDocument()

    rerender(<TestHeader {...defaultProps} attemptNumber="Preview" maxAttempts="Preview" totalViolations={2} />)
    expect(screen.getByText('Attempt Preview/Preview')).toBeInTheDocument()
    expect(screen.getByText('2/3 Violations')).toBeInTheDocument()
  })

  it('handles submit button clicks and shows spinner when submitting', () => {
    const onSubmitClick = vi.fn()
    const { rerender } = render(<TestHeader {...defaultProps} onSubmitClick={onSubmitClick} submitting={false} />)

    const submitBtn = screen.getByRole('button', { name: /Submit/i })
    expect(submitBtn).not.toBeDisabled()
    fireEvent.click(submitBtn)
    expect(onSubmitClick).toHaveBeenCalledOnce()

    rerender(<TestHeader {...defaultProps} onSubmitClick={onSubmitClick} submitting={true} />)
    expect(screen.getByRole('button', { name: /Submit/i })).toBeDisabled()
  })
})
