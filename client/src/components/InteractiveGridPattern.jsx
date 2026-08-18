import { useEffect, useRef, useState } from 'react'

// Ported from Magic UI's Interactive Grid Pattern
// (https://magicui.design/r/interactive-grid-pattern.json), stripped of the
// shadcn `cn()` helper to fit this plain Vite/JSX app, and reworked beyond
// the original in two ways:
//
// 1. Square count is measured off the actual rendered box (ResizeObserver)
//    instead of being a fixed [horizontal, vertical] count. The original
//    always draws exactly `squares` rects sized at `width`x`height` and
//    then CSS-stretches that fixed canvas to fill whatever box it's in —
//    fine for a section with a known height, but our container's real
//    height varies a lot (short tab vs. a long scrollable list, skewed
//    oversize for the diagonal tilt), so a fixed count either squishes
//    squares tiny or stretches them huge depending on content. Measuring
//    the box directly keeps every square the same real pixel size no
//    matter how tall the content ends up being.
// 2. Hovering a square also lights up its 8 neighbors at a lower opacity,
//    so it reads as a soft glow rather than one hard square flipping on.
export default function InteractiveGridPattern({
  width = 90,
  height = 90,
  className = '',
  squaresClassName = '',
  ...props
}) {
  const containerRef = useRef(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [hoveredSquare, setHoveredSquare] = useState(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => setSize({ w: el.offsetWidth, h: el.offsetHeight })
    measure()

    // Debounced: the sidebar's hover-expand animates the dashboard's main
    // column width over ~200ms, which fires a burst of resize events on
    // every intermediate frame. Recomputing the grid (which adds/removes
    // whole squares) on each of those made hovering near the sidebar look
    // like the background was stuttering/re-rendering mid-transition.
    // Waiting for the resize to settle before redrawing fixes that.
    let timeoutId = null
    const observer = new ResizeObserver(() => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(measure, 200)
    })
    observer.observe(el)

    return () => {
      observer.disconnect()
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  // +1 row/column of overscan so the grid still fully covers the box's
  // edges even when the box size isn't an exact multiple of the square size.
  const horizontal = size.w > 0 ? Math.ceil(size.w / width) + 1 : 0
  const vertical = size.h > 0 ? Math.ceil(size.h / height) + 1 : 0
  const hoveredCol = hoveredSquare === null ? null : hoveredSquare % horizontal
  const hoveredRow = hoveredSquare === null ? null : Math.floor(hoveredSquare / horizontal)

  return (
    <div ref={containerRef} className={`absolute inset-0 ${className}`} {...props}>
      {horizontal > 0 && vertical > 0 && (
        <svg width={horizontal * width} height={vertical * height} className="border-none">
          {Array.from({ length: horizontal * vertical }).map((_, index) => {
            const col = index % horizontal
            const row = Math.floor(index / horizontal)
            const x = col * width
            const y = row * height

            let fillClass = 'fill-transparent'
            if (hoveredSquare !== null) {
              const colDiff = Math.abs(col - hoveredCol)
              const rowDiff = Math.abs(row - hoveredRow)
              if (colDiff === 0 && rowDiff === 0) fillClass = 'fill-white/[0.05]'
              else if (colDiff <= 1 && rowDiff <= 1) fillClass = 'fill-white/[0.02]'
            }

            return (
              <rect
                key={index}
                x={x}
                y={y}
                width={width}
                height={height}
                className={`stroke-white/[0.03] transition-all duration-150 ease-in-out not-[&:hover]:duration-1000 ${fillClass} ${squaresClassName}`}
                onMouseEnter={() => setHoveredSquare(index)}
                onMouseLeave={() => setHoveredSquare((s) => (s === index ? null : s))}
              />
            )
          })}
        </svg>
      )}
    </div>
  )
}
