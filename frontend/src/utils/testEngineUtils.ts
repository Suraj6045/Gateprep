export const TIMER_WARNINGS = [30, 15, 10, 5, 1]

export const STATUS_CLASS = {
  current: 'q-dot q-dot-answered border-2 border-white',
  answered: 'q-dot q-dot-answered',
  'not-answered': 'q-dot q-dot-not-answered',
  'not-visited': 'q-dot q-dot-not-visited',
  marked: 'q-dot q-dot-marked',
  'answered-marked': 'q-dot q-dot-answered-marked',
}

export type QuestionStatus = keyof typeof STATUS_CLASS

export const SECTION_GENERAL_APTITUDE = 'General Aptitude'
export const SECTION_CORE_SUBJECT = 'Core Subject'

export function isGeneralAptitudeQuestion(question: {
  subject?: string | null
  part?: string | null
}): boolean {
  if (question.part && String(question.part).trim().toUpperCase() === 'A') {
    return true
  }
  if (!question.subject) return false
  const s = question.subject.trim().toLowerCase()
  return s === 'general aptitude' || s === 'ga' || s === 'aptitude' || s === 'part a'
}

export function isFullLengthExam(
  testType?: string | null,
  questions?: Array<{ subject?: string | null; part?: string | null }>,
): boolean {
  if (testType === 'full_length') return true
  if (!questions || questions.length === 0) return false

  const hasGA = questions.some(isGeneralAptitudeQuestion)
  const hasCore = questions.some(q => !isGeneralAptitudeQuestion(q))
  return hasGA && hasCore
}

export type QuestionGroup<T = unknown> = { question: T; index: number }
export type QuestionGroups<T = unknown> = Map<string, QuestionGroup<T>[]>

export function groupExamQuestions<T extends { subject?: string | null; part?: string | null }>(
  questions: T[],
  isFullLength: boolean,
  options?: { singleSectionName?: string },
): QuestionGroups<T> {
  const groups: QuestionGroups<T> = new Map()
  if (!questions || questions.length === 0) return groups

  if (isFullLength) {
    const gaItems: QuestionGroup<T>[] = []
    const coreItems: QuestionGroup<T>[] = []

    questions.forEach((question, index) => {
      const item: QuestionGroup<T> = { question, index }
      if (isGeneralAptitudeQuestion(question)) {
        gaItems.push(item)
      } else {
        coreItems.push(item)
      }
    })

    gaItems.sort((a, b) => a.index - b.index)
    coreItems.sort((a, b) => a.index - b.index)

    if (gaItems.length > 0) {
      groups.set(SECTION_GENERAL_APTITUDE, gaItems)
    }
    if (coreItems.length > 0) {
      groups.set(SECTION_CORE_SUBJECT, coreItems)
    }
    return groups
  }

  // Single-section test (Weekly Quiz, Subject-wise, Topic-wise)
  const firstSubject = questions[0]?.subject?.trim()
  const allSameSubject = firstSubject ? questions.every(q => q.subject?.trim() === firstSubject) : false
  const sectionName: string = options?.singleSectionName || (allSameSubject && firstSubject ? firstSubject : 'Questions')
  const allItems: QuestionGroup<T>[] = questions.map((question, index) => ({ question, index }))
  groups.set(sectionName, allItems)
  return groups
}

export function formatTime(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || isNaN(ms)) return '--:--:--'
  const totalSecs = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':')
}

export function getQStatus(
  qId: string,
  currentQId: string,
  answers: Record<string, unknown>,
  marked: ReadonlySet<string>,
): QuestionStatus {
  if (qId === currentQId) return 'current'
  if (marked.has(qId) && answers[qId]) return 'answered-marked'
  if (marked.has(qId)) return 'marked'
  if (answers[qId]) return 'answered'
  return 'not-answered'
}

export function getEndTimeMs(
  startedAt: string | null | undefined,
  durationMinutes: number | null | undefined,
  serverTime?: string | null,
): number | null {
  if (!startedAt || !durationMinutes) return null

  let startMs
  let serverNowMs
  try {
    const parseUtcDate = (value: string): number => {
      let str = String(value).trim()
      if (!str.endsWith('Z') && !str.includes('+') && !/[0-9]-[0-9]{2}:[0-9]{2}$/.test(str)) {
        str = `${str}Z`
      }
      return new Date(str).getTime()
    }
    startMs = parseUtcDate(startedAt)
    serverNowMs = serverTime ? parseUtcDate(serverTime) : startMs
    if (!Number.isFinite(startMs) || !Number.isFinite(serverNowMs)) {
      throw new Error('Invalid date')
    }
  } catch {
    return performance.now() + durationMinutes * 60 * 1000
  }

  const remainingMs = Math.max(
    0,
    startMs + durationMinutes * 60 * 1000 - serverNowMs
  )
  return performance.now() + remainingMs
}
