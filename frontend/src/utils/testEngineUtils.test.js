import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getQStatus, getEndTimeMs, formatTime } from './testEngineUtils'

describe('getQStatus', () => {
  it('returns "current" when qId matches currentQId, regardless of state', () => {
    // Current takes precedence over marked/answered states
    const marked = new Set(['q1'])
    const answers = { q1: 'A' }
    
    expect(getQStatus('q1', 'q1', answers, marked)).toBe('current')
    expect(getQStatus('q2', 'q2', {}, new Set())).toBe('current')
  })

  it('returns "answered-marked" when question is both answered and marked', () => {
    const marked = new Set(['q1'])
    const answers = { q1: 'Option B' }
    
    expect(getQStatus('q1', 'q2', answers, marked)).toBe('answered-marked')
  })

  it('returns "marked" when question is marked but NOT answered', () => {
    const marked = new Set(['q1'])
    const answers = {} // No answer for q1
    
    expect(getQStatus('q1', 'q2', answers, marked)).toBe('marked')
  })

  it('returns "answered" when question is answered but NOT marked', () => {
    const marked = new Set()
    const answers = { q1: 'Option C' }
    
    expect(getQStatus('q1', 'q2', answers, marked)).toBe('answered')
  })

  it('returns "not-answered" when question is neither answered nor marked', () => {
    const marked = new Set()
    const answers = {}
    
    expect(getQStatus('q1', 'q2', answers, marked)).toBe('not-answered')
  })
})

describe('getEndTimeMs', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('falls back to Date.now() when provided with an invalid date string', () => {
    // "invalid-date-format" triggers the catch block
    const durationMinutes = 30
    const expectedFallbackMs = Date.now() + durationMinutes * 60 * 1000
    
    expect(getEndTimeMs('invalid-date-format', durationMinutes)).toBe(expectedFallbackMs)
  })

  it('returns null if startedAt or durationMinutes is not provided', () => {
    expect(getEndTimeMs(null, 30)).toBeNull()
    expect(getEndTimeMs('2026-01-01T10:00:00Z', null)).toBeNull()
  })
})

describe('formatTime', () => {
  it('returns "--:----" for null, undefined, or NaN inputs', () => {
    expect(formatTime(null)).toBe('--:--:--')
    expect(formatTime(undefined)).toBe('--:--:--')
    expect(formatTime(NaN)).toBe('--:--:--')
  })

  it('handles negative values by returning "00:00:00"', () => {
    expect(formatTime(-5000)).toBe('00:00:00')
    expect(formatTime(-1)).toBe('00:00:00')
  })

  it('correctly formats typical valid milliseconds', () => {
    // 3661000 ms = 1h 1m 1s
    expect(formatTime(3661000)).toBe('01:01:01')
    
    // 0 ms
    expect(formatTime(0)).toBe('00:00:00')
    
    // 59000 ms = 59s
    expect(formatTime(59000)).toBe('00:00:59')
    
    // 3599000 ms = 59m 59s
    expect(formatTime(3599000)).toBe('00:59:59')
  })
})
