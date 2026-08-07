import { render, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'

import {
  LeaderboardSkeleton,
  ResultCardSkeleton,
  ResultSkeleton,
  SkeletonBlock,
  StatCardSkeleton,
  TestCardSkeleton,
} from './Skeletons'

afterEach(() => {
  cleanup()
})

describe('Skeletons', () => {
  it('renders SkeletonBlock with the expected default classes and accessibility marker', () => {
    const { container } = render(<SkeletonBlock className="h-4 w-full" />)
    const block = container.firstChild

    expect(block).toBeInTheDocument()
    expect(block).toHaveAttribute('aria-hidden', 'true')
    expect(block).toHaveClass('block', 'animate-pulse', 'rounded', 'bg-muted', 'h-4', 'w-full')
  })

  it('renders TestCardSkeleton with its card structure and pulse placeholders', () => {
    const { container } = render(<TestCardSkeleton />)
    const card = container.querySelector('[data-slot="card"]')

    expect(card).toBeInTheDocument()
    const content = card.querySelector('[data-slot="card-content"]')
    expect(content).toHaveClass('p-5', 'flex', 'flex-col', 'gap-3')
    expect(container.querySelectorAll('.animate-pulse')).not.toHaveLength(0)
  })

  it('renders the other shared skeleton variants without crashing', () => {
    const statResult = render(<StatCardSkeleton />)
    expect(statResult.container.querySelector('[data-slot="card"]')).toBeInTheDocument()

    const leaderboardResult = render(<LeaderboardSkeleton />)
    expect(leaderboardResult.container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)

    const resultCardResult = render(<ResultCardSkeleton />)
    expect(resultCardResult.container.querySelector('[data-slot="card"]')).toBeInTheDocument()

    const resultPageResult = render(<ResultSkeleton />)
    expect(resultPageResult.container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
  })
})
