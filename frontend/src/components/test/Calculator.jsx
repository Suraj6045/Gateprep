import { useEffect, useRef, useState, useCallback } from 'react'
import X from 'lucide-react/dist/esm/icons/x'
import { DEG_TO_RAD, isOperatorTail, tokenizeExpression, formatResult, evaluateExpression, SCIENTIFIC_FUNCTIONS, SCIENTIFIC_CONSTANTS } from '../../utils/calculatorEngine'

const Btn = ({ label, onClick, type = 'default', wide = false }) => (
  <button onClick={onClick}
    className={`calc-btn ${type === 'op' ? 'calc-btn-op' : type === 'eq' ? 'calc-btn-eq' : type === 'clear' ? 'calc-btn-clear' : type === 'back' ? 'calc-btn-backspace' : ''} ${wide ? 'col-span-2' : ''}`}>
    {label}
  </button>
)

export default function Calculator({ onClose }) {
  const dialogRef = useRef(null)
  const expressionRef = useRef('')
  const [display, setDisplay] = useState('0')
  const [expression, setExpression] = useState('')
  const [memory, setMemory] = useState(0)
  const [isDeg, setIsDeg] = useState(true)
  const [waitingForOperand, setWaitingForOperand] = useState(false)

  const getAngle = (val) => isDeg ? val * DEG_TO_RAD : val

  const setExpressionText = useCallback((next) => {
    const value = typeof next === 'function' ? next(expressionRef.current) : next
    expressionRef.current = value
    setExpression(value)
  }, [])

  useEffect(() => {
    const firstButton = dialogRef.current?.querySelector('button')
    firstButton?.focus()
  }, [])

  const inputDigit = (digit) => {
    if (waitingForOperand) {
      setDisplay(String(digit))
      setWaitingForOperand(false)
    } else {
      setDisplay(display === '0' ? String(digit) : display + digit)
    }
  }

  const inputDecimal = () => {
    if (waitingForOperand) { setDisplay('0.'); setWaitingForOperand(false); return }
    if (!display.includes('.')) setDisplay(display + '.')
  }

  const handleOperator = (op) => {
    setExpressionText(prev => {
      const trimmed = prev.trim()
      if (!trimmed) return `${display} ${op}`
      if (isOperatorTail(trimmed)) return `${trimmed.slice(0, trimmed.lastIndexOf(' ')).trim()} ${op}`
      if (trimmed.endsWith(')')) return `${trimmed} ${op}`
      return `${trimmed} ${display} ${op}`
    })
    setWaitingForOperand(true)
  }

  const inputOpenParen = () => {
    setExpressionText(prev => {
      const trimmed = prev.trim()
      if (!trimmed) return '('
      if (isOperatorTail(trimmed) || trimmed.endsWith('(')) return `${trimmed} (`
      return `${trimmed} ${display} × (`
    })
    setDisplay('0')
    setWaitingForOperand(true)
  }

  const inputCloseParen = () => {
    const tokens = tokenizeExpression(expressionRef.current)
    const openCount = tokens.filter(token => token === '(').length
    const closeCount = tokens.filter(token => token === ')').length
    if (openCount <= closeCount) return

    setExpressionText(prev => {
      const trimmed = prev.trim()
      if (!trimmed || trimmed.endsWith('(')) return trimmed
      if (trimmed.endsWith(')')) return `${trimmed} )`
      return `${trimmed} ${display} )`
    })
    setWaitingForOperand(false)
  }

  const calculate = () => {
    if (!expressionRef.current) return
    try {
      const trimmed = expressionRef.current.trim()
      const finalExpression = trimmed.endsWith(')') ? trimmed : `${trimmed} ${display}`
      setDisplay(formatResult(evaluateExpression(finalExpression)))
      setExpressionText('')
      setWaitingForOperand(true)
    } catch { setDisplay('Error') }
  }

  const sciFunc = (fn) => {
    if (fn in SCIENTIFIC_CONSTANTS) {
      setDisplay(String(SCIENTIFIC_CONSTANTS[fn]))
      return
    }

    const compute = SCIENTIFIC_FUNCTIONS[fn]
    if (!compute) return

    try {
      setDisplay(formatResult(compute(parseFloat(display), isDeg)))
      setWaitingForOperand(true)
    } catch { 
      setDisplay('Error') 
    }
  }

  const clear = () => { setDisplay('0'); setExpressionText(''); setWaitingForOperand(false) }
  const backspace = () => { setDisplay(display.length > 1 ? display.slice(0, -1) : '0') }
  const toggleSign = () => setDisplay(String(parseFloat(display) * -1))

  const handleDialogKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }

    if (event.key !== 'Tab') return

    const focusable = Array.from(
      dialogRef.current?.querySelectorAll('button:not([disabled])') || []
    )
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable.at(-1)
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }, [onClose])

  return (
    <div ref={dialogRef}
         className="fixed z-50 shadow-2xl rounded-lg overflow-hidden select-none sm:w-[320px] left-4 right-4 sm:left-auto sm:right-4"
         role="dialog" aria-modal="true" aria-labelledby="calculator-title"
         onKeyDown={handleDialogKeyDown}
         style={{ top: '70px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b"
           style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
        <span id="calculator-title" className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Scientific Calculator</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            <button onClick={() => setIsDeg(true)}
              className={`px-2 py-0.5 rounded ${isDeg ? 'bg-primary text-white' : ''}`}>Deg</button>
            <button onClick={() => setIsDeg(false)}
              className={`px-2 py-0.5 rounded ${!isDeg ? 'bg-primary text-white' : ''}`}>Rad</button>
          </div>
          <button onClick={onClose} aria-label="Close Calculator" className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>
      </div>

      {/* Display */}
      <div className="px-3 py-2 text-right" style={{ background: 'var(--bg)' }}>
        <div className="text-xs h-4 mb-1" style={{ color: 'var(--text-muted)' }}>{expression}</div>
        <div className="text-2xl font-mono font-bold truncate" style={{ color: 'var(--text)' }}>{display}</div>
      </div>

      {/* Memory row */}
      <div className="grid grid-cols-5 gap-1 px-2 pb-1">
        {[
          { l: 'MC', fn: () => setMemory(0) },
          { l: 'MR', fn: () => { setDisplay(String(memory)); setWaitingForOperand(false) } },
          { l: 'MS', fn: () => setMemory(parseFloat(display)) },
          { l: 'M+', fn: () => setMemory(m => m + parseFloat(display)) },
          { l: 'M-', fn: () => setMemory(m => m - parseFloat(display)) },
        ].map(({ l, fn }) => (
          <button key={l} onClick={fn}
            className="calc-btn text-xs h-7" style={{ background: '#1a3060', color: '#93c5fd' }}>{l}</button>
        ))}
      </div>

      {/* Scientific functions */}
      <div className="grid grid-cols-5 gap-1 px-2 pb-1">
        {['sin','cos','tan','log','ln',
          'sin⁻¹','cos⁻¹','tan⁻¹','log₂','eˣ',
          'x²','x³','√','10ˣ','1/x',
          'n!','|x|','π','e','%'].map(fn => (
          <button key={fn} onClick={() => sciFunc(fn)}
            className="calc-btn text-xs h-8" style={{ background: 'var(--bg-panel)', color: 'var(--brand-light)' }}>{fn}</button>
        ))}
      </div>

      {/* Main keypad */}
      <div className="grid grid-cols-5 gap-1 px-2 pb-2">
        <Btn label="C" onClick={clear} type="clear" />
        <Btn label="+/-" onClick={toggleSign} />
        <Btn label="←" onClick={backspace} type="back" />
        <Btn label="xʸ" onClick={() => handleOperator('xʸ')} type="op" />
        <Btn label="÷" onClick={() => handleOperator('÷')} type="op" />

        <Btn label="7" onClick={() => inputDigit('7')} />
        <Btn label="8" onClick={() => inputDigit('8')} />
        <Btn label="9" onClick={() => inputDigit('9')} />
        <Btn label="×" onClick={() => handleOperator('×')} type="op" />
        <Btn label="(" onClick={inputOpenParen} />

        <Btn label="4" onClick={() => inputDigit('4')} />
        <Btn label="5" onClick={() => inputDigit('5')} />
        <Btn label="6" onClick={() => inputDigit('6')} />
        <Btn label="-" onClick={() => handleOperator('-')} type="op" />
        <Btn label=")" onClick={inputCloseParen} />

        <Btn label="1" onClick={() => inputDigit('1')} />
        <Btn label="2" onClick={() => inputDigit('2')} />
        <Btn label="3" onClick={() => inputDigit('3')} />
        <Btn label="+" onClick={() => handleOperator('+')} type="op" />
        <Btn label="%" onClick={() => handleOperator('%')} type="op" />

        <Btn label="0" onClick={() => inputDigit('0')} wide />
        <Btn label="." onClick={inputDecimal} />
        <Btn label="=" onClick={calculate} type="eq" wide />
      </div>
    </div>
  )
}
