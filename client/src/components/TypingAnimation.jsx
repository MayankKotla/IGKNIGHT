import { useEffect, useState } from 'react'

// Ported from Magic UI's Typing Animation
// (https://magicui.design/r/typing-animation.json), trimmed to a plain-JSX,
// single-string, no-loop version — types the text out once, character by
// character, every time it mounts. Used for the Home tab's greeting header.
export default function TypingAnimation({
  children,
  className = '',
  duration = 60,
  delay = 0,
  as: Component = 'span',
  showCursor = true,
  ...props
}) {
  const text = String(children ?? '')
  const graphemes = Array.from(text)
  const [displayedText, setDisplayedText] = useState('')
  const [charIndex, setCharIndex] = useState(0)

  useEffect(() => {
    setDisplayedText('')
    setCharIndex(0)
  }, [text])

  useEffect(() => {
    if (charIndex >= graphemes.length) return
    const timeoutDelay = charIndex === 0 ? delay : duration
    const timeout = setTimeout(() => {
      setDisplayedText(graphemes.slice(0, charIndex + 1).join(''))
      setCharIndex((i) => i + 1)
    }, timeoutDelay)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charIndex, text, duration, delay])

  const isComplete = charIndex >= graphemes.length

  return (
    <Component className={className} {...props}>
      {displayedText}
      {showCursor && !isComplete && (
        <span className="inline-block animate-blink-cursor">|</span>
      )}
    </Component>
  )
}
