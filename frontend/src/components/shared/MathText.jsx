import { Fragment, memo, useRef, useEffect } from 'react'

// ── Table detection ──────────────────────────────────────────────
// Require 3+ pipes (2+ columns) so |x| (absolute value) never matches
const TABLE_LINE = /^\|.+\|.+\|$/
const SEPARATOR_ROW = /^\|[-| :]+\|$/
// Multiline anchors: only match whole lines starting/ending with |, not mid-line |x|
const BLOCK_SPLIT = /((?:^\|.+\|.+\|[ \t]*$\n?)+)/gm

function isTableBlock(text) {
  const lines = text.trim().split('\n').map(l => l.trim())
  // A real table MUST have a separator row (e.g. |---|---|)
  const hasSeparator = lines.some(l => SEPARATOR_ROW.test(l))
  if (!hasSeparator) return false
  // And at least one data row with 2+ columns
  return lines.some(l => TABLE_LINE.test(l) && !SEPARATOR_ROW.test(l))
}

function isEscapedPipeAt(str, i) {
  return str[i] === '\\' && i + 1 < str.length && str[i + 1] === '|'
}

function tokenizeRowCells(inner) {
  const cells = []
  let current = ''
  for (let i = 0; i < inner.length; i++) {
    if (isEscapedPipeAt(inner, i)) {
      current += '|'
      i++
    } else if (inner[i] === '|') {
      cells.push(current.trim())
      current = ''
    } else {
      current += inner[i]
    }
  }
  cells.push(current.trim())
  return cells
}

function mergeExcessCells(cells, expectedCols) {
  const extraCount = cells.length - expectedCols
  const merged = []
  for (let i = 0; i < cells.length; i++) {
    if (i > 0 && i <= extraCount) {
      merged[merged.length - 1] += ' | ' + cells[i]
    } else {
      merged.push(cells[i])
    }
  }
  return merged
}

/** Split a row on unescaped | characters, respecting \| as a literal pipe. */
function splitTableCells(row, expectedCols) {
  const inner = row.slice(1, -1) // strip leading/trailing |
  const cells = tokenizeRowCells(inner)

  if (expectedCols && cells.length > expectedCols) {
    return mergeExcessCells(cells, expectedCols)
  }

  return cells
}

function parseTable(text) {
  const allRows = text.trim().split('\n').map(l => l.trim()).filter(l => TABLE_LINE.test(l))

  // Detect column count from the separator row (e.g. |---|---|)
  const sepRow = allRows.find(r => SEPARATOR_ROW.test(r))
  const expectedCols = sepRow ? sepRow.slice(1, -1).split('|').length : null

  const dataRows = allRows.filter(l => !SEPARATOR_ROW.test(l))

  return (
    <table className="math-table">
      <tbody>
        {dataRows.map((row, i) => {
          const cells = splitTableCells(row, expectedCols)
          const Tag = i === 0 ? 'th' : 'td'
          return (
            <tr key={i} className={i % 2 === 0 ? 'math-table-row-alt' : ''}>
              {cells.map((cell, j) => (
                <Tag key={j} className="math-table-cell">
                  {cell}
                </Tag>
              ))}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

// ── Math patterns ────────────────────────────────────────────────
const MATH_FUNCTIONS_STR = "sqrt|frac|sum|int|log|ln|sin|cos|tan|sec|csc|cot|arcsin|arccos|arctan|sinh|cosh|tanh|exp|lim|max|min|det";
const GREEK_LETTERS_STR = "alpha|beta|gamma|theta|Theta|pi|infty|Omega";

const MATH_PATTERN = /(\$\$[\s\S]+?\$\$|\$[^$]+\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\])/g
const LEGACY_MATH_PATTERN = new RegExp(
  `(\\\\(?:${MATH_FUNCTIONS_STR}|${GREEK_LETTERS_STR})(?:[\\^_]\\s*(?:\\{[^{}]*\\}|[A-Za-z0-9]+))*(?:\\s*(?:\\{[^{}]*\\}|\\([^()]*\\)|[A-Za-z0-9]+))*|` +
  `\\\\?(?:Theta|Omega)\\s*\\([^()]+\\)|` +
  `\\bO\\s*\\([^()]+\\)|` +
  `\\b(?:${MATH_FUNCTIONS_STR})\\s*(?:[\\^_]\\s*(?:\\{[^{}]*\\}|[A-Za-z0-9]+))*\\s*\\([^()]+\\)|` +
  `\\b[A-Za-z0-9]+\\s*\\^\\s*(?:\\{[^{}]+\\}|\\([^()]+\\)|[A-Za-z0-9]+)(?:\\s*[-+]\\s*\\d+)?|` +
  `\\b(?:[A-Za-z]\\s+)?(?:log|ln)(?:\\s*\\^\\s*(?:\\{[^{}]+\\}|\\([^()]+\\)|[A-Za-z0-9]+))?\\s+[A-Za-z]\\b)`,
  "g"
);
const RAW_LATEX_HINT = new RegExp(
  `\\\\(${MATH_FUNCTIONS_STR}|${GREEK_LETTERS_STR})|\\\\?(Theta|Omega)\\s*\\(|\\bO\\s*\\(|[\\^_]\\{?[\\w\\d]+|\\b(?:[A-Za-z]\\s+)?(?:log|ln)(?:\\s*\\^\\s*[\\w\\d]+)?\\s+[A-Za-z]\\b`
);

const MATH_WORDS = new Set([
  'O', 'o', 'n', 'h', 'm', 'k', 'x', 'y', 'z',
  'log', 'ln', 'sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh', 'exp', 'lim', 'max', 'min', 'det',
  'sqrt', 'frac', 'sum', 'int',
  'Theta', 'theta', 'Omega',
  'alpha', 'beta', 'gamma', 'pi', 'infty',
])

function normalizeMath(math) {
  return math
    .replace(/^\\\(/, '')
    .replace(/\\\)$/, '')
    .replace(/^\\\[/, '')
    .replace(/\\\]$/, '')
    .replace(/^\$\$/, '')
    .replace(/\$\$$/, '')
    .replace(/^\$/, '')
    .replace(/\$$/, '')
    .replace(/(^|[^\\])\blog~/g, '$1\\log ')
    .replace(/\^\(([^()]+)\)/g, '^{$1}')
    .replace(/(^|[^\\])\b(log|ln|sin|cos|tan|sec|csc|cot|arcsin|arccos|arctan|sinh|cosh|tanh|exp|lim|max|min|det)\b/g, '$1\\$2')
    .replace(/(^|[^\\])\bTheta\b/g, '$1\\Theta')
    .replace(/(^|[^\\])\bOmega\b/g, '$1\\Omega')
}

function mathAriaLabel(math) {
  const label = normalizeMath(math)
    .replace(/\\frac/g, ' fraction ')
    .replace(/\\sqrt/g, ' square root ')
    .replace(/\\sum/g, ' summation ')
    .replace(/\\int/g, ' integral ')
    .replace(/\\log/g, ' log ')
    .replace(/\\ln/g, ' natural log ')
    .replace(/\\sin/g, ' sine ')
    .replace(/\\cos/g, ' cosine ')
    .replace(/\\tan/g, ' tangent ')
    .replace(/\\Theta/g, ' Theta ')
    .replace(/\\Omega/g, ' Omega ')
    .replace(/\\alpha/g, ' alpha ')
    .replace(/\\beta/g, ' beta ')
    .replace(/\\gamma/g, ' gamma ')
    .replace(/\\theta/g, ' theta ')
    .replace(/\\pi/g, ' pi ')
    .replace(/\\infty/g, ' infinity ')
    .replace(/\^/g, ' to the power of ')
    .replace(/_/g, ' subscript ')
    .replace(/\\/g, ' ')
    .replace(/[{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return `Math expression: ${label}`
}

function isStandaloneMath(text) {
  const trimmed = text.trim()
  if (!RAW_LATEX_HINT.test(trimmed)) return false

  // Strip LaTeX commands (e.g., \to, \infty, \text) so their names don't trigger the plain-text word check
  const textWithoutCommands = trimmed.replace(/\\[A-Za-z]+/g, '')
  
  const words = textWithoutCommands.match(/[A-Za-z]+/g) || []
  if (words.some(word => word.length > 1 && !MATH_WORDS.has(word))) {
    return false
  }

  return true
}

function splitLegacyMath(text) {
  const parts = []
  let lastIndex = 0

  for (const match of text.matchAll(LEGACY_MATH_PATTERN)) {
    const value = match[0]
    const index = match.index ?? 0

    if (index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, index) })
    }

    parts.push({ type: 'math', value })
    lastIndex = index + value.length
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return parts
}

function useKatexRender(math, displayMode) {
  const containerRef = useRef(null)
  const ariaLabel = mathAriaLabel(math)

  useEffect(() => {
    if (!containerRef.current) return
    Promise.all([import('katex'), import('katex/dist/katex.min.css')])
      .then(([katexModule]) => {
        if (containerRef.current) {
          katexModule.default.render(normalizeMath(math), containerRef.current, {
            displayMode,
            throwOnError: false,
            errorColor: '#cc0000',
          })
        }
      })
      .catch(err => {
        console.error("KaTeX load/render error:", err, "Original:", math)
        if (containerRef.current) containerRef.current.innerText = math
      })
  }, [math, displayMode])

  return { containerRef, ariaLabel }
}

function SafeInlineMath({ math }) {
  const { containerRef, ariaLabel } = useKatexRender(math, false)
  return <span ref={containerRef} role="math" aria-label={ariaLabel} className="inline-math" />
}

function SafeBlockMath({ math }) {
  const { containerRef, ariaLabel } = useKatexRender(math, true)
  return <div ref={containerRef} role="math" aria-label={ariaLabel} className="block-math my-4 flex justify-center" />
}

function getMathPartKind(part) {
  if (part.startsWith('$$') || part.startsWith('\\[')) return 'block'
  if (part.startsWith('$') || part.startsWith('\\(')) return 'inline'
  return 'text'
}

function renderLegacyMathText(text, keyPrefix) {
  if (isStandaloneMath(text)) {
    return <SafeInlineMath math={text} />
  }

  const legacyParts = splitLegacyMath(text)
  const hasLegacyMath = legacyParts.some(part => part.type === 'math')

  if (!hasLegacyMath) {
    return <>{text}</>
  }

  return (
    <>
      {legacyParts.map((part, index) =>
        part.type === 'math'
          ? <SafeInlineMath key={`${keyPrefix}l${index}`} math={part.value} />
          : <Fragment key={`${keyPrefix}l${index}`}>{part.value}</Fragment>
      )}
    </>
  )
}

function renderExplicitMathParts(text, keyPrefix) {
  const parts = text.split(MATH_PATTERN)

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null

        switch (getMathPartKind(part)) {
          case 'block':
            return <SafeBlockMath key={`${keyPrefix}m${index}`} math={part} />
          case 'inline':
            return <SafeInlineMath key={`${keyPrefix}m${index}`} math={part} />
          default:
            return <Fragment key={`${keyPrefix}m${index}`}>{part}</Fragment>
        }
      })}
    </>
  )
}

function renderMathSegment(text, keyPrefix = '') {
  const hasExplicitMath = text.search(MATH_PATTERN) !== -1
  return hasExplicitMath
    ? renderExplicitMathParts(text, keyPrefix)
    : renderLegacyMathText(text, keyPrefix)
}

const MathText = memo(function MathText({ children }) {
  const text = String(children ?? '')

  if (!text.trim()) return null

  // Split on table blocks first, then parse math in non-table segments
  const segments = text.split(BLOCK_SPLIT)

  const hasTable = segments.some(seg => isTableBlock(seg))

  if (!hasTable) {
    return renderMathSegment(text)
  }

  return (
    <>
      {segments.map((seg, i) =>
        isTableBlock(seg)
          ? <Fragment key={i}>{parseTable(seg)}</Fragment>
          : <Fragment key={i}>{renderMathSegment(seg, `s${i}`)}</Fragment>
      )}
    </>
  )
})

export default MathText;
