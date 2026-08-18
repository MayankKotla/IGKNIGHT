import { useState } from 'react'

// Ported from Magic UI's Interactive Grid Pattern
// (https://magicui.design/r/interactive-grid-pattern.json), stripped of the
// shadcn `cn()` helper to fit this plain Vite/JSX app. Renders a grid of
// SVG squares that light up on hover — used as a subtle background behind
// the dashboard's tab content.
//
// Extended beyond the original: hovering a square also lights up its 8
// neighbors at a lower opacity, so the hover effect reads as a soft glow
// rather than a single hard-edged square flipping on.
export default function InteractiveGridPattern({
  width = 40,
  height = 40,
  squares = [24, 24],
  className = '',
  squaresClassName = '',
  ...props
}) {
  const [horizontal, vertical] = squares
  const [hoveredSquare, setHoveredSquare] = useState(null)

  const hoveredCol = hoveredSquare === null ? null : hoveredSquare % horizontal
  const hoveredRow = hoveredSquare === null ? null : Math.floor(hoveredSquare / horizontal)

  return (
    <svg
      width={width * horizontal}
      height={height * vertical}
      viewBox={`0 0 ${width * horizontal} ${height * vertical}`}
      preserveAspectRatio="none"
      className={`absolute inset-0 h-full w-full border border-gray-400/30 ${className}`}
      {...props}
    >
      {Array.from({ length: horizontal * vertical }).map((_, index) => {
        const col = index % horizontal
        const row = Math.floor(index / horizontal)
        const x = col * width
        const y = row * height

        let fillClass = 'fill-transparent'
        if (hoveredSquare !== null) {
          const colDiff = Math.abs(col - hoveredCol)
          const rowDiff = Math.abs(row - hoveredRow)
          if (colDiff === 0 && rowDiff === 0) fillClass = 'fill-white/10'
          else if (colDiff <= 1 && rowDiff <= 1) fillClass = 'fill-white/5'
        }

        return (
          <rect
            key={index}
            x={x}
            y={y}
            width={width}
            height={height}
            className={`stroke-white/10 transition-all duration-150 ease-in-out not-[&:hover]:duration-1000 ${fillClass} ${squaresClassName}`}
            onMouseEnter={() => setHoveredSquare(index)}
            onMouseLeave={() => setHoveredSquare((s) => (s === index ? null : s))}
          />
        )
      })}
    </svg>
  )
}
