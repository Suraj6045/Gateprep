import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getQStatus,
  getEndTimeMs,
  formatTime,
  isGeneralAptitudeQuestion,
  isFullLengthExam,
  groupExamQuestions,
  SECTION_GENERAL_APTITUDE,
  SECTION_CORE_SUBJECT,
} from './testEngineUtils'

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
    const marked = new Set<string>()
    const answers = { q1: 'Option C' }
    
    expect(getQStatus('q1', 'q2', answers, marked)).toBe('answered')
  })

  it('returns "not-answered" when question is neither answered nor marked', () => {
    const marked = new Set<string>()
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
    vi.restoreAllMocks()
  })

  it('falls back to a full duration when provided with an invalid date string', () => {
    const durationMinutes = 30
    vi.spyOn(performance, 'now').mockReturnValue(5000)
    const expectedFallbackMs = 5000 + durationMinutes * 60 * 1000
    
    expect(getEndTimeMs('invalid-date-format', durationMinutes)).toBe(expectedFallbackMs)
  })

  it('uses server time and a monotonic client clock for the deadline', () => {
    vi.spyOn(performance, 'now').mockReturnValue(5000)
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'))

    expect(
      getEndTimeMs(
        '2026-01-01T10:00:00Z',
        180,
        '2026-01-01T12:30:00Z'
      )
    ).toBe(5000 + 30 * 60 * 1000)
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

describe('isGeneralAptitudeQuestion', () => {
  it('identifies General Aptitude by subject or part', () => {
    expect(isGeneralAptitudeQuestion({ subject: 'General Aptitude' })).toBe(true)
    expect(isGeneralAptitudeQuestion({ subject: 'general aptitude' })).toBe(true)
    expect(isGeneralAptitudeQuestion({ subject: 'GA' })).toBe(true)
    expect(isGeneralAptitudeQuestion({ subject: 'aptitude' })).toBe(true)
    expect(isGeneralAptitudeQuestion({ subject: 'Part A' })).toBe(true)
    expect(isGeneralAptitudeQuestion({ part: 'A' })).toBe(true)
    expect(isGeneralAptitudeQuestion({ part: 'a' })).toBe(true)
  })

  it('returns false for core technical subjects or empty input', () => {
    expect(isGeneralAptitudeQuestion({ subject: 'Algorithms' })).toBe(false)
    expect(isGeneralAptitudeQuestion({ subject: 'Engineering Mathematics' })).toBe(false)
    expect(isGeneralAptitudeQuestion({ subject: 'Digital Logic' })).toBe(false)
    expect(isGeneralAptitudeQuestion({})).toBe(false)
    expect(isGeneralAptitudeQuestion({ subject: null })).toBe(false)
  })
})

describe('isFullLengthExam', () => {
  it('returns true when testType is full_length', () => {
    expect(isFullLengthExam('full_length')).toBe(true)
    expect(isFullLengthExam('full_length', [{ subject: 'Algorithms' }])).toBe(true)
  })

  it('returns true when questions contain both General Aptitude and Core questions', () => {
    const questions = [
      { subject: 'Algorithms' },
      { subject: 'General Aptitude' },
    ]
    expect(isFullLengthExam(null, questions)).toBe(true)
    expect(isFullLengthExam(undefined, questions)).toBe(true)
  })

  it('returns false when questions contain only Core subjects or only General Aptitude', () => {
    expect(isFullLengthExam('subject_wise', [{ subject: 'Algorithms' }, { subject: 'Databases' }])).toBe(false)
    expect(isFullLengthExam(null, [{ subject: 'General Aptitude' }])).toBe(false)
    expect(isFullLengthExam(null, [{ subject: 'Algorithms' }])).toBe(false)
    expect(isFullLengthExam(null, [])).toBe(false)
  })
})

describe('groupExamQuestions', () => {
  const fltQuestions = [
    { id: 1, subject: 'Algorithms' },
    { id: 2, subject: 'General Aptitude' },
    { id: 3, subject: 'Engineering Mathematics' },
    { id: 4, subject: 'GA' },
    { id: 5, subject: 'Databases' },
  ]

  it('groups full-length tests into General Aptitude and Core Subject only', () => {
    const groups = groupExamQuestions(fltQuestions, true)

    expect([...groups.keys()]).toEqual([SECTION_GENERAL_APTITUDE, SECTION_CORE_SUBJECT])
    expect(groups.get(SECTION_GENERAL_APTITUDE)?.map(i => i.question.id)).toEqual([2, 4])
    expect(groups.get(SECTION_CORE_SUBJECT)?.map(i => i.question.id)).toEqual([1, 3, 5])
    expect(groups.get(SECTION_CORE_SUBJECT)?.map(i => i.index)).toEqual([0, 2, 4])
  })

  it('groups single-section tests into a single unified section without Part A / Part B', () => {
    const quizQuestions = [
      { id: 10, subject: 'Algorithms' },
      { id: 11, subject: 'Algorithms' },
      { id: 12, subject: 'Algorithms' },
    ]
    const groups = groupExamQuestions(quizQuestions, false)

    expect([...groups.keys()]).toEqual(['Algorithms'])
    expect(groups.get('Algorithms')?.map(i => i.question.id)).toEqual([10, 11, 12])
    expect(groups.has('Part A')).toBe(false)
    expect(groups.has('Part B')).toBe(false)
    expect(groups.has(SECTION_GENERAL_APTITUDE)).toBe(false)
    expect(groups.has(SECTION_CORE_SUBJECT)).toBe(false)
  })

  it('returns empty map for empty questions array', () => {
    expect(groupExamQuestions([], true).size).toBe(0)
    expect(groupExamQuestions([], false).size).toBe(0)
  })
})
