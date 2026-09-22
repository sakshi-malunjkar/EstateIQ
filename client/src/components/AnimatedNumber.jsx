import { useEffect, useRef, useState } from 'react'

/** Counts up from 0 to `value` over `duration` ms whenever `value`
 * changes. Used for every headline score/stat number in the app. */
export default function AnimatedNumber({ value, duration = 900, decimals = 0, suffix = '' }) {
  const [display, setDisplay] = useState(0)
  const frameRef = useRef(null)

  useEffect(() => {
    const target = Number(value) || 0
    const start = performance.now()
    const from = 0

    function tick(now) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(from + (target - from) * eased)
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        setDisplay(target)
      }
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [value, duration])

  return (
    <span className="font-mono tabular-nums">
      {display.toFixed(decimals)}
      {suffix}
    </span>
  )
}
