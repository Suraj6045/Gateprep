export const TIMER_WARNINGS = [30, 15, 10, 5, 1]

export const STATUS_CLASS = {
  current: 'q-dot q-dot-answered border-2 border-white',
  answered: 'q-dot q-dot-answered',
  'not-answered': 'q-dot q-dot-not-answered',
  'not-visited': 'q-dot q-dot-not-visited',
  marked: 'q-dot q-dot-marked',
  'answered-marked': 'q-dot q-dot-answered-marked',
}

export function formatTime(ms) {
  if (ms === null || ms === undefined || isNaN(ms)) return '--:--:--'
  const totalSecs = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':')
}

export function getQStatus(qId, currentQId, answers, marked) {
  if (qId === currentQId) return 'current'
  if (marked.has(qId) && answers[qId]) return 'answered-marked'
  if (marked.has(qId)) return 'marked'
  if (answers[qId]) return 'answered'
  return 'not-answered'
}

export function getEndTimeMs(startedAt, durationMinutes) {
  if (!startedAt || !durationMinutes) return null

  let startMs
  try {
    let str = String(startedAt).trim()
    if (!str.endsWith('Z') && !str.includes('+') && !/[0-9]-[0-9]{2}:[0-9]{2}$/.test(str)) {
      str = `${str}Z`
    }
    startMs = new Date(str).getTime()
    if (isNaN(startMs)) throw new Error('Invalid date')
  } catch {
    startMs = Date.now()
  }

  return startMs + durationMinutes * 60 * 1000
}
