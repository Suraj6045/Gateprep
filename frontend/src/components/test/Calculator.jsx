import { useState, useCallback } from 'react'
import { X } from 'lucide-react'

const DEG_TO_RAD = Math.PI / 180

export default function Calculator({ onClose }) {
  const [display, setDisplay] = useState('0')
  const [expression, setExpression] = useState('')
  const [memory, setMemory] = useState(0)
  const [isDeg, setIsDeg] = useState(true)
  const [waitingForOperand, setWaitingForOperand] = useState(false)

  const getAngle = (val) => isDeg ? val * DEG_TO_RAD : val

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
    const val = parseFloat(display)
    setExpression(`${display} ${op}`)
    setWaitingForOperand(true)
  }

  const calculate = () => {
    if (!expression) return
    try {
      const parts = expression.trim().split(' ')
      const left = parseFloat(parts[0])
      const op = parts[1]
      const right = parseFloat(display)
      let result
      switch (op) {
        case '+': result = left + right; break
        case '-': result = left - right; break
        case '×': result = left * right; break
        case '÷': result = right !== 0 ? left / right : 'Error'; break
        case 'xʸ': result = Math.pow(left, right); break
        case '%': result = left % right; break
        default: result = right
      }
      setDisplay(String(parseFloat(result.toFixed(10))))
      setExpression('')
      setWaitingForOperand(true)
    } catch { setDisplay('Error') }
  }

  const sciFunc = (fn) => {
    const val = parseFloat(display)
    let result
    try {
      switch (fn) {
        case 'sin':   result = Math.sin(getAngle(val)); break
        case 'cos':   result = Math.cos(getAngle(val)); break
        case 'tan':   result = Math.tan(getAngle(val)); break
        case 'sin⁻¹': result = isDeg ? Math.asin(val) / DEG_TO_RAD : Math.asin(val); break
        case 'cos⁻¹': result = isDeg ? Math.acos(val) / DEG_TO_RAD : Math.acos(val); break
        case 'tan⁻¹': result = isDeg ? Math.atan(val) / DEG_TO_RAD : Math.atan(val); break
        case 'log':   result = Math.log10(val); break
        case 'ln':    result = Math.log(val); break
        case 'log₂':  result = Math.log2(val); break
        case '√':     result = Math.sqrt(val); break
        case 'x²':    result = val * val; break
        case 'x³':    result = val * val * val; break
        case '1/x':   result = 1 / val; break
        case 'n!':    result = factorial(val); break
        case 'eˣ':    result = Math.exp(val); break
        case '10ˣ':   result = Math.pow(10, val); break
        case '|x|':   result = Math.abs(val); break
        case 'π':     setDisplay(String(Math.PI)); return
        case 'e':     setDisplay(String(Math.E)); return
        default: return
      }
      setDisplay(String(parseFloat(result.toFixed(10))))
      setWaitingForOperand(true)
    } catch { setDisplay('Error') }
  }

  const factorial = (n) => {
    if (n < 0 || !Number.isInteger(n)) return NaN
    if (n === 0 || n === 1) return 1
    let r = 1; for (let i = 2; i <= n; i++) r *= i; return r
  }

  const clear = () => { setDisplay('0'); setExpression(''); setWaitingForOperand(false) }
  const backspace = () => { setDisplay(display.length > 1 ? display.slice(0, -1) : '0') }
  const toggleSign = () => setDisplay(String(parseFloat(display) * -1))

  const Btn = ({ label, onClick, type = 'default', wide = false }) => (
    <button onClick={onClick}
      className={`calc-btn ${type === 'op' ? 'calc-btn-op' : type === 'eq' ? 'calc-btn-eq' : type === 'clear' ? 'calc-btn-clear' : type === 'back' ? 'calc-btn-backspace' : ''} ${wide ? 'col-span-2' : ''}`}>
      {label}
    </button>
  )

  return (
    <div className="fixed z-50 shadow-2xl rounded-lg overflow-hidden select-none"
         style={{ top: '70px', right: '16px', width: '320px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b"
           style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}>
        <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Scientific Calculator</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            <button onClick={() => setIsDeg(true)}
              className={`px-2 py-0.5 rounded ${isDeg ? 'bg-sky-600 text-white' : ''}`}>Deg</button>
            <button onClick={() => setIsDeg(false)}
              className={`px-2 py-0.5 rounded ${!isDeg ? 'bg-sky-600 text-white' : ''}`}>Rad</button>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200"><X size={16} /></button>
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
            className="calc-btn text-xs h-8" style={{ background: '#0f2850', color: '#7dd3fc' }}>{fn}</button>
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
        <Btn label="(" onClick={() => {}} />

        <Btn label="4" onClick={() => inputDigit('4')} />
        <Btn label="5" onClick={() => inputDigit('5')} />
        <Btn label="6" onClick={() => inputDigit('6')} />
        <Btn label="-" onClick={() => handleOperator('-')} type="op" />
        <Btn label=")" onClick={() => {}} />

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
