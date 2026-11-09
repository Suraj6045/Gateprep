import { describe, expect, it } from 'vitest'
import {
  evaluateExpression,
  formatResult,
  isOperatorTail,
  SCIENTIFIC_FUNCTIONS,
  tokenizeExpression,
} from './calculatorEngine'

describe('calculatorEngine', () => {
  describe('evaluateExpression', () => {
    it('handles standard arithmetic precedence', () => {
      expect(evaluateExpression('2 + 3 × 4')).toBe(14)
      expect(evaluateExpression('( 2 + 3 ) × 4')).toBe(20)
      expect(evaluateExpression('10 - 4 - 2')).toBe(4)
      expect(evaluateExpression('24 ÷ 6 ÷ 2')).toBe(2)
    })

    it('evaluates exponentiation as right-associative', () => {
      // 2 ^ (3 ^ 2) = 2 ^ 9 = 512, whereas (2 ^ 3) ^ 2 would be 64
      expect(evaluateExpression('2 xʸ 3 xʸ 2')).toBe(512)
      expect(evaluateExpression('3 xʸ 2 xʸ 2')).toBe(81) // 3 ^ 4 = 81
    })

    it('evaluates exponentiation with negative exponents and bases', () => {
      expect(evaluateExpression('2 xʸ -1')).toBe(0.5)
      expect(evaluateExpression('4 xʸ -0.5')).toBe(0.5)
      expect(evaluateExpression('-2 xʸ 2')).toBe(4)
      expect(evaluateExpression('-2 xʸ 3')).toBe(-8)
    })

    it('evaluates binary modulo operator correctly', () => {
      expect(evaluateExpression('10 % 3')).toBe(1)
      expect(evaluateExpression('14 % 4')).toBe(2)
    })

    it('handles mixed operators and parentheses', () => {
      expect(evaluateExpression('2 + 2 xʸ 3')).toBe(10)
      expect(evaluateExpression('( 2 + 2 ) xʸ 3')).toBe(64)
    })

    it('throws on mismatched parentheses or invalid syntax', () => {
      expect(() => evaluateExpression('( 2 + 3')).toThrow('Mismatched parentheses')
      expect(() => evaluateExpression('2 + )')).toThrow('Mismatched parentheses')
      expect(() => evaluateExpression('2 +')).toThrow('Invalid expression')
    })
  })

  describe('SCIENTIFIC_FUNCTIONS', () => {
    it('evaluates percentage as decimal value', () => {
      expect(SCIENTIFIC_FUNCTIONS['%'](50)).toBe(0.5)
      expect(SCIENTIFIC_FUNCTIONS['%'](100)).toBe(1)
      expect(SCIENTIFIC_FUNCTIONS['%'](0)).toBe(0)
    })

    it('evaluates powers, roots, and factorials', () => {
      expect(SCIENTIFIC_FUNCTIONS['x²'](5)).toBe(25)
      expect(SCIENTIFIC_FUNCTIONS['x³'](3)).toBe(27)
      expect(SCIENTIFIC_FUNCTIONS['√'](16)).toBe(4)
      expect(SCIENTIFIC_FUNCTIONS['1/x'](4)).toBe(0.25)
      expect(SCIENTIFIC_FUNCTIONS['n!'](5)).toBe(120)
      expect(SCIENTIFIC_FUNCTIONS['n!'](0)).toBe(1)
      expect(SCIENTIFIC_FUNCTIONS['|x|'](-15)).toBe(15)
    })

    it('evaluates logarithms', () => {
      expect(SCIENTIFIC_FUNCTIONS['log'](1000)).toBe(3)
      expect(SCIENTIFIC_FUNCTIONS['log₂'](8)).toBe(3)
      expect(SCIENTIFIC_FUNCTIONS['ln'](Math.E)).toBe(1)
    })

    it('evaluates trigonometric functions in degrees and radians', () => {
      expect(SCIENTIFIC_FUNCTIONS['sin'](90, true)).toBeCloseTo(1, 10)
      expect(SCIENTIFIC_FUNCTIONS['cos'](0, true)).toBeCloseTo(1, 10)
      expect(SCIENTIFIC_FUNCTIONS['tan'](45, true)).toBeCloseTo(1, 10)
    })
  })

  describe('formatResult', () => {
    it('formats numbers up to 10 decimal places and removes trailing zeros', () => {
      expect(formatResult(42)).toBe('42')
      expect(formatResult(0.5)).toBe('0.5')
      expect(formatResult(1 / 3)).toBe('0.3333333333')
    })

    it('returns Error for non-finite values', () => {
      expect(formatResult(NaN)).toBe('Error')
      expect(formatResult(Infinity)).toBe('Error')
      expect(formatResult(-Infinity)).toBe('Error')
    })
  })

  describe('isOperatorTail and tokenizeExpression', () => {
    it('detects if expression ends with an operator', () => {
      expect(isOperatorTail('2 +')).toBe(true)
      expect(isOperatorTail('2 + 3')).toBe(false)
      expect(isOperatorTail('5 xʸ')).toBe(true)
      expect(isOperatorTail('')).toBe(false)
    })

    it('tokenizes expressions separated by whitespace', () => {
      expect(tokenizeExpression('2 + 3 × 4')).toEqual(['2', '+', '3', '×', '4'])
    })
  })
})
