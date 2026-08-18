import { useEffect, useRef } from 'react'
import { useInView, useMotionValue, useSpring } from 'framer-motion'

// Ported from Magic UI's Number Ticker (https://magicui.design/r/number-ticker.json),
// stripped of TypeScript and the shadcn `cn()` helper to fit this plain Vite/JSX app.
// Animates a `<span>` from `startValue` up (or down) to `value` using a spring,
// starting once the element scrolls into view.
export default function NumberTicker({
  value,
  startValue = 0,
  direction = 'up',
  delay = 0,
  decimalPlaces = 0,
  className = '',
  ...props
}) {
  const ref = useRef(null)
  const motionValue = useMotionValue(direction === 'down' ? value : startValue)
  const springValue = useSpring(motionValue, { damping: 60, stiffness: 100 })
  const isInView = useInView(ref, { once: true, margin: '0px' })

  useEffect(() => {
    if (!isInView) return
    const timer = setTimeout(() => {
      motionValue.set(direction === 'down' ? startValue : value)
    }, delay * 1000)
    return () => clearTimeout(timer)
  }, [motionValue, isInView, delay, value, direction, startValue])

  useEffect(
    () =>
      springValue.on('change', (latest) => {
        if (ref.current) {
          ref.current.textContent = Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces,
          }).format(Number(latest.toFixed(decimalPlaces)))
        }
      }),
    [springValue, decimalPlaces]
  )

  return (
    <span ref={ref} className={`inline-block tabular-nums ${className}`} {...props}>
      {startValue}
    </span>
  )
}
