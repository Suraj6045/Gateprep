import { useCallback, useEffect, useRef, useState } from 'react'

export default function useTestAnswerState({
  current,
  questions,
  currentQuestion,
  answersRef,
  timingsRef,
}) {
  const [answers, setAnswers] = useState({})
  const [timings, setTimings] = useState({})
  const [marked, setMarked] = useState(new Set())
  const [visited, setVisited] = useState(new Set())
  const [natInput, setNatInput] = useState('')

  const questionStartRef = useRef(Date.now())

  // Per-question elapsed timing effect
  useEffect(() => {
    const q = questions[current]
    if (!q) return
    questionStartRef.current = Date.now()
    return () => {
      const elapsed = Math.floor((Date.now() - questionStartRef.current) / 1000)
      if (elapsed > 0) {
        setTimings(t => {
          const updated = { ...t, [q.id]: (t[q.id] || 0) + elapsed }
          timingsRef.current = updated
          return updated
        })
      }
    }
  }, [current, questions, timingsRef])

  // Visited tracking effect
  useEffect(() => {
    const q = questions[current]
    if (q) setVisited(v => new Set([...v, q.id]))
  }, [current, questions])

  // NAT input sync effect
  useEffect(() => {
    const q = questions[current]
    if (q?.question_type === 'nat') setNatInput(answers[q.id] || '')
  }, [current, questions, answers])

  const setMCQ = useCallback((letter) => {
    if (!currentQuestion) return
    setAnswers(a => {
      const updated = { ...a, [currentQuestion.id]: a[currentQuestion.id] === letter ? undefined : letter }
      answersRef.current = updated
      return updated
    })
  }, [currentQuestion, answersRef])

  const toggleMSQ = useCallback((letter) => {
    if (!currentQuestion) return
    setAnswers(a => {
      const cur = (a[currentQuestion.id] || '').split(',').filter(Boolean)
      const next = cur.includes(letter) ? cur.filter(l => l !== letter) : [...cur, letter].sort()
      const updated = { ...a, [currentQuestion.id]: next.join(',') || undefined }
      answersRef.current = updated
      return updated
    })
  }, [currentQuestion, answersRef])

  const commitNAT = useCallback(() => {
    if (!currentQuestion) return
    setAnswers(a => {
      const updated = { ...a, [currentQuestion.id]: natInput.trim() || undefined }
      answersRef.current = updated
      return updated
    })
  }, [currentQuestion, natInput, answersRef])

  const clearResponse = useCallback(() => {
    if (!currentQuestion) return
    setAnswers(a => {
      const n = { ...a }
      delete n[currentQuestion.id]
      answersRef.current = n
      return n
    })
    setNatInput('')
  }, [currentQuestion, answersRef])

  return {
    answers,
    setAnswers,
    timings,
    setTimings,
    marked,
    setMarked,
    visited,
    setVisited,
    natInput,
    setNatInput,
    setMCQ,
    toggleMSQ,
    commitNAT,
    clearResponse,
    questionStartRef,
  }
}