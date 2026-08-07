const DEG_TO_RAD = Math.PI / 180
const OPERATORS = new Set(['+', '-', '×', '÷', 'xʸ', '%'])
const OPERATOR_PRECEDENCE = { '+': 1, '-': 1, '×': 2, '÷': 2, '%': 2, 'xʸ': 3 }

export const formatResult = (value) => {
  if (!Number.isFinite(value)) return 'Error'
  return String(parseFloat(value.toFixed(10)))
}

const isOperatorToken = (token) => OPERATORS.has(token)

export const isOperatorTail = (expression) => isOperatorToken(expression.trim().split(/\s+/).at(-1))

export const tokenizeExpression = (expression) => expression.trim().split(/\s+/).filter(Boolean)

const applyOperator = (op, left, right) => {
  switch (op) {
    case '+': return left + right
    case '-': return left - right
    case '×': return left * right
    case '÷': return right !== 0 ? left / right : NaN
    case 'xʸ': return Math.pow(left, right)
    case '%': return left % right
    default: return NaN
  }
}

function shouldPopOperator(operators, token) {
  const top = operators.at(-1)
  return (
    operators.length > 0 &&
    isOperatorToken(top) &&
    OPERATOR_PRECEDENCE[top] >= OPERATOR_PRECEDENCE[token]
  )
}

function handleOperatorToken(token, operators, output) {
  while (shouldPopOperator(operators, token)) {
    output.push(operators.pop())
  }
  operators.push(token)
}

function handleCloseParen(operators, output) {
  while (operators.length > 0 && operators.at(-1) !== '(') {
    output.push(operators.pop())
  }
  if (operators.at(-1) !== '(') throw new Error('Mismatched parentheses')
  operators.pop()
}

function drainRemainingOperators(operators, output) {
  while (operators.length > 0) {
    const op = operators.pop()
    if (op === '(' || op === ')') throw new Error('Mismatched parentheses')
    output.push(op)
  }
}

function toRPN(tokens) {
  const output = []
  const operators = []

  tokens.forEach((token) => {
    if (!Number.isNaN(Number(token))) {
      output.push(Number(token))
      return
    }
    if (isOperatorToken(token)) {
      handleOperatorToken(token, operators, output)
      return
    }
    if (token === '(') {
      operators.push(token)
      return
    }
    if (token === ')') {
      handleCloseParen(operators, output)
      return
    }
    throw new Error('Invalid token')
  })

  drainRemainingOperators(operators, output)
  return output
}

function evaluateRPN(rpn) {
  const stack = []
  rpn.forEach((token) => {
    if (typeof token === 'number') {
      stack.push(token)
      return
    }
    const right = stack.pop()
    const left = stack.pop()
    if (left === undefined || right === undefined) throw new Error('Invalid expression')
    stack.push(applyOperator(token, left, right))
  })
  if (stack.length !== 1) throw new Error('Invalid expression')
  return stack[0]
}

export const evaluateExpression = (expression) => {
  const rpn = toRPN(tokenizeExpression(expression))
  return evaluateRPN(rpn)
}

const factorial = (n) => {
  if (n < 0 || !Number.isInteger(n)) return NaN
  if (n === 0 || n === 1) return 1
  let r = 1; for (let i = 2; i <= n; i++) r *= i; return r
}

export const SCIENTIFIC_FUNCTIONS = {
  'sin':   (v, deg) => Math.sin(deg ? v * DEG_TO_RAD : v),
  'cos':   (v, deg) => Math.cos(deg ? v * DEG_TO_RAD : v),
  'tan':   (v, deg) => Math.tan(deg ? v * DEG_TO_RAD : v),
  'sin⁻¹': (v, deg) => (deg ? Math.asin(v) / DEG_TO_RAD : Math.asin(v)),
  'cos⁻¹': (v, deg) => (deg ? Math.acos(v) / DEG_TO_RAD : Math.acos(v)),
  'tan⁻¹': (v, deg) => (deg ? Math.atan(v) / DEG_TO_RAD : Math.atan(v)),
  'log':   (v) => Math.log10(v),
  'ln':    (v) => Math.log(v),
  'log₂':  (v) => Math.log2(v),
  '√':     (v) => Math.sqrt(v),
  'x²':    (v) => v * v,
  'x³':    (v) => v * v * v,
  '1/x':   (v) => 1 / v,
  'n!':    (v) => factorial(v),
  'eˣ':    (v) => Math.exp(v),
  '10ˣ':   (v) => Math.pow(10, v),
  '|x|':   (v) => Math.abs(v),
}

export const SCIENTIFIC_CONSTANTS = {
  'π': Math.PI,
  'e': Math.E,
}

export { DEG_TO_RAD }