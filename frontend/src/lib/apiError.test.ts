import { describe, expect, it } from 'vitest'
import { getApiErrorDetail } from './apiError'

describe('getApiErrorDetail', () => {
  it.each([
    ['string detail', { response: { data: { detail: 'Invalid input' } } }, 'Invalid input'],
    ['empty string', { response: { data: { detail: '' } } }, undefined],
    ['array detail', { response: { data: { detail: [{ msg: 'Invalid input' }] } } }, undefined],
    ['object detail', { response: { data: { detail: { msg: 'Invalid input' } } } }, undefined],
    ['no response', {}, undefined],
    ['plain Error', new Error('Failed'), undefined],
    ['null', null, undefined],
    ['undefined', undefined, undefined],
    ['non-object', 'error', undefined],
  ])('%s', (_label, error, expected) => {
    expect(getApiErrorDetail(error)).toBe(expected)
  })
})
