import { useState, useMemo } from 'react'
import { SERIES_LABELS, TYPE_LABELS } from '../utils/constants'

export function useTestNavigation(tests) {
  const [nav, setNav] = useState([])

  const push = (type, value) => setNav(n => [...n, { type, value }])
  const goBack = (idx) => setNav(n => n.slice(0, idx))

  const filteredTests = useMemo(() => {
    let filtered = tests
    nav.forEach(step => {
      if (step.type === 'category') filtered = filtered.filter(t => t.category === step.value)
      if (step.type === 'series')   filtered = filtered.filter(t => t.series_name === step.value)
      if (step.type === 'type')     filtered = filtered.filter(t => t.test_type === step.value)
      if (step.type === 'subject')  filtered = filtered.filter(t => t.subject === step.value)
    })
    return filtered
  }, [tests, nav])

  const breadcrumbs = useMemo(() => ['Tests', ...nav.map(s => {
    if (s.type === 'category') return s.value === 'weekly_quiz' ? 'Weekly Quiz' : 'Test Series'
    if (s.type === 'series')   return SERIES_LABELS[s.value] || s.value
    if (s.type === 'type')     return TYPE_LABELS[s.value] || s.value
    if (s.type === 'subject')  return s.value
    return s.value
  })], [nav])

  const currentNav = nav[nav.length - 1]

  return { nav, currentNav, push, goBack, filteredTests, breadcrumbs }
}