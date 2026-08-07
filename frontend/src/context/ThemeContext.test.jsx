import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, useTheme } from './ThemeContext'

function ThemeConsumer() {
  const { theme, toggle } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button data-testid="toggle-btn" onClick={toggle}>Toggle</button>
    </div>
  )
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.style.colorScheme = ''
})

afterEach(() => {
  cleanup()
})

describe('ThemeProvider', () => {
  it('defaults to "dark" when localStorage has no saved theme', () => {
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>)

    expect(screen.getByTestId('theme').textContent).toBe('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('restores saved theme from localStorage', () => {
    localStorage.setItem('theme', 'light')

    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>)

    expect(screen.getByTestId('theme').textContent).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('toggles from dark to light', async () => {
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>)

    expect(screen.getByTestId('theme').textContent).toBe('dark')

    await act(async () => {
      await userEvent.click(screen.getByTestId('toggle-btn'))
    })

    expect(screen.getByTestId('theme').textContent).toBe('light')
    expect(localStorage.getItem('theme')).toBe('light')
  })

  it('toggles from light back to dark', async () => {
    localStorage.setItem('theme', 'light')

    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>)

    await act(async () => {
      await userEvent.click(screen.getByTestId('toggle-btn'))
    })

    expect(screen.getByTestId('theme').textContent).toBe('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('sets colorScheme on the document element', () => {
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>)

    expect(document.documentElement.style.colorScheme).toBe('dark')
  })
})

describe('useTheme', () => {
  it('returns null when used outside ThemeProvider', () => {
    // useTheme uses raw useContext without a guard, so it returns null outside provider
    function Naked() {
      const ctx = useTheme()
      return <span data-testid="ctx">{String(ctx)}</span>
    }

    render(<Naked />)
    expect(screen.getByTestId('ctx').textContent).toBe('null')
  })
})
