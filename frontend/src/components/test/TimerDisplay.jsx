import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { formatTime, TIMER_WARNINGS } from '../../utils/testEngineUtils'

export default function TimerDisplay({
  endTime,
  onExpire,
  announceWarnings = true,
  className = 'flex items-center gap-1.5 px-3 py-1 rounded font-mono font-bold text-sm border',
  lowClassName = 'bg-destructive/20 border-destructive/50 text-destructive timer-critical',
  normalClassName = 'bg-muted theme-border text-foreground',
}) {
  const getRemaining = useCallback(
    () => Number.isFinite(endTime) ? Math.max(0, endTime - Date.now()) : null,
    [endTime]
  )
  const [remaining, setRemaining] = useState(getRemaining)
  const expiredRef = useRef(false)
  const warnedRef = useRef(new Set())

  useEffect(() => {
    if (!Number.isFinite(endTime)) {
      setRemaining(null)
      return
    }

    expiredRef.current = false
    warnedRef.current = new Set()

    const timer = setInterval(() => {
      const left = Math.max(0, endTime - Date.now())

      setRemaining(left)

      const minsLeft = Math.ceil(left / 60000)
      if (announceWarnings && TIMER_WARNINGS.includes(minsLeft) && !warnedRef.current.has(minsLeft) && left > 1000) {
        warnedRef.current.add(minsLeft)
        if (minsLeft === 5 || minsLeft === 1) {
          toast(minsLeft === 1 ? '1 minute remaining!' : `${minsLeft} minutes remaining`, { duration: 4000 })
        }
      }

      if (left <= 0 && !expiredRef.current) {
        expiredRef.current = true
        clearInterval(timer)
        onExpire()
      }
    }, 1000)

    const left = Math.max(0, endTime - Date.now())
    setRemaining(left)

    return () => clearInterval(timer)
  }, [endTime, onExpire, announceWarnings])

  const isLow = remaining !== null && remaining < 5 * 60 * 1000

  return (
    <div className={clsx(className, isLow ? lowClassName : normalClassName)}>
      {formatTime(remaining)}
    </div>
  )
}
