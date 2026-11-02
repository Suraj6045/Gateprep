import { describe, expect, it } from 'vitest'
import { formatLeaderboardDate, getPercentageTone, getPodiumOrder } from './Leaderboard'

describe('Leaderboard helpers', () => {
  it('orders podium entries as second, first, third', () => {
    const entries = [
      { rank: 1, user_id: 'u1', full_name: 'Alice' },
      { rank: 2, user_id: 'u2', full_name: 'Bob' },
      { rank: 3, user_id: 'u3', full_name: 'Charlie' },
    ]

    expect(getPodiumOrder(entries)).toEqual([entries[1], entries[0], entries[2]])
  })

  it('returns the correct percentage tone for score thresholds', () => {
    expect(getPercentageTone(80)).toBe('text-success-text')
    expect(getPercentageTone(60)).toBe('text-warning-text')
    expect(getPercentageTone(40)).toBe('text-destructive')
  })

  it('formats dates with the Indian locale and null-safe fallback', () => {
    expect(formatLeaderboardDate('2025-02-14T00:00:00Z')).toBe('14/2/2025')
    expect(formatLeaderboardDate(null)).toBe('—')
  })
})
