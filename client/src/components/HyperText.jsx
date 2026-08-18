import { useEffect, useRef, useState } from 'react'

const DEFAULT_CHARACTER_SET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const getRandomInt = (max) => Math.floor(Math.random() * max)

// Ported from Magic UI's Hyper Text (https://magicui.design/r/hyper-text.json),
// trimmed to a plain-JSX version with no framer-motion, no hover retrigger,
// and no intersection-observer trigger — this is only ever used once, for
// the Home tab's greeting header on its first mount, so it just scrambles
// and settles as soon as it's rendered.
export default function HyperText({
  children,
  className = '',
  duration = 800,
  delay = 0,
  as: Component = 'span',
  characterSet = DEFAULT_CHARACTER_SET,
  ...props
}) {
  const text = String(children ?? '')
  const [displayText, setDisplayText] = useState(() => text.split(''))
  const [isAnimating, setIsAnimating] = useState(false)
  const iterationCount = useRef(0)

  useEffect(() => {
    const startTimeout = setTimeout(() => setIsAnimating(true), delay)
    return () => clearTimeout(startTimeout)
  }, [delay])

  useEffect(() => {
    let animationFrameId = null

    if (isAnimating) {
      const maxIterations = text.length
      const startTime = performance.now()

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)
        iterationCount.current = progress * maxIterations

        setDisplayText((current) =>
          current.map((letter, index) =>
            letter === ' '
              ? letter
              : index <= iterationCount.current
                ? text[index]
                : characterSet[getRandomInt(characterSet.length)]
          )
        )

        if (progress < 1) {
          animationFrameId = requestAnimationFrame(animate)
        } else {
          setIsAnimating(false)
        }
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    return () => {
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId)
    }
  }, [text, duration, isAnimating, characterSet])

  return (
    <Component className={className} {...props}>
      {displayText.map((letter, index) => (
        <span key={index}>{letter}</span>
      ))}
    </Component>
  )
}
