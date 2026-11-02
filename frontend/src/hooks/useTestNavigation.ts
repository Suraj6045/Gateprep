import { useState, useMemo } from 'react'
import { SERIES_LABELS, TYPE_LABELS } from '../utils/constants'

import type { TestCatalogItem } from '@/types/api'

export type NavigationType = 'category' | 'series' | 'type' | 'subject'
export interface NavigationStep { type: NavigationType; value: string }
export interface TestNavigationParams { tests: TestCatalogItem[] }
export interface TestNavigationResult {
  nav: NavigationStep[]
  currentNav: NavigationStep | undefined
  push: (type: NavigationType, value: string) => void
  goBack: (idx: number) => void
  filteredTests: TestCatalogItem[]
  breadcrumbs: string[]
}

export function useTestNavigation(tests: TestCatalogItem[]): TestNavigationResult {
  const [nav, setNav] = useState<NavigationStep[]>([])

  const push = (type: NavigationType, value: string) => setNav(n => [...n, { type, value }])
  const goBack = (idx: number) => setNav(n => n.slice(0, idx))

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
    if (s.type === 'series')   return Object.entries(SERIES_LABELS).find(([key]) => key === s.value)?.[1] || s.value
    if (s.type === 'type')     return Object.entries(TYPE_LABELS).find(([key]) => key === s.value)?.[1] || s.value
    if (s.type === 'subject')  return s.value
    return s.value
  })], [nav])

  const currentNav = nav[nav.length - 1]

  return { nav, currentNav, push, goBack, filteredTests, breadcrumbs }
}