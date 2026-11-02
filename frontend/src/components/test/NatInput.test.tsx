import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import NatInput from './NatInput'

describe('NatInput', () => {
  it('preserves intermediate negative and scientific notation values', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <NatInput
        value="-"
        onChange={onChange}
        onCommit={vi.fn()}
        savedValue=""
      />
    )
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Numerical Answer' })

    expect(input.getAttribute('type')).toBe('text')
    expect(input.getAttribute('inputmode')).toBe('decimal')
    expect(input.value).toBe('-')

    fireEvent.change(input, { target: { value: '1.5e-3' } })
    expect(onChange).toHaveBeenCalledWith('1.5e-3')

    rerender(
      <NatInput
        value="1.5e-3"
        onChange={onChange}
        onCommit={vi.fn()}
        savedValue=""
      />
    )
    expect(input.value).toBe('1.5e-3')
  })
})
