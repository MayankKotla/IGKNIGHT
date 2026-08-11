import React, { useRef, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useMotionTemplate,
  animate,
} from 'framer-motion'
import { BookOpen, Users, Target, Calendar, MessageSquare, Shield, ArrowRight, ChevronRight, ChevronDown } from 'lucide-react'
import Navbar from '../components/Navbar'

const features = [
  {
    icon: Users,
    title: 'Smart Study Groups',
    desc: 'Find classmates enrolled in your exact courses and form focused study groups in seconds.',
  },
  {
    icon: Target,
    title: 'KnightCheck',
    desc: 'AI-generated quizzes from your session notes and materials — check what you actually retained.',
  },
  {
    icon: MessageSquare,
    title: 'Realtime Chat',
    desc: 'Message your group live, share files and photos, and edit or delete anything you send.',
  },
  {
    icon: Calendar,
    title: 'Session Scheduling',
    desc: 'Coordinate study sessions, set locations or meeting links, and keep everyone aligned.',
  },
  {
    icon: Shield,
    title: 'UCF Verified Only',
    desc: 'Access is exclusive to UCF students — your @ucf.edu email is your key.',
  },
  {
    icon: BookOpen,
    title: 'Every UCF Course',
    desc: "Browse groups across every department, or add a course code we don't have yet.",
  },
]

// Each step gets its own position in a slight zigzag (1 up-left, 2 down and
// centered, 3 up-right, mirroring step 1) instead of sitting on one flat
// row. Horizontal placement (desktop only — see .how-it-works-step-* in
// index.css) sits at the halfway points of the screen: step 1 a quarter of
// the way in from the left, step 3 a quarter of the way in from the right.
const steps = [
  {
    title: 'Sign up with your UCF email',
    desc: 'Create your account using your @ucf.edu address.',
    stepClass: 'how-it-works-step-1',
  },
  {
    title: 'Find your courses',
    desc: 'Browse the course catalog and join or create a study group for your class.',
    stepClass: 'how-it-works-step-2',
  },
  {
    title: 'Study smarter together',
    desc: 'Chat in realtime, schedule sessions, and quiz yourself with KnightCheck — all in one place.',
    stepClass: 'how-it-works-step-3',
  },
]

// ─── Hero depth elements ────────────────────────────────────────────────────
// Small ambient dust motes drifting through the hero. Positions are
// percentages within the hero, deliberately kept to the edges/corners so
// nothing crosses the headline, subtext, or buttons in the center.

// Cut from 16 down to 8 to fix lag that persisted even with the cursor
// completely still: each mote runs its own `repeat: Infinity` keyframe
// animation (opacity/x/y) forever, regardless of any user interaction, plus
// a blur filter — so this was a constant, always-on compositing cost that
// had nothing to do with the cursor-proximity code we'd been optimizing.
const DUST_MOTES = [
  { leftPct: 18, topPct: 22, size: 3, depth: 0.9, duration: 9, delay: 0, xDrift: 10 },
  { leftPct: 82, topPct: 18, size: 2, depth: 0.5, duration: 12, delay: 0.6, xDrift: -8 },
  { leftPct: 12, topPct: 62, size: 4, depth: 1, duration: 8, delay: 1.2, xDrift: 14 },
  { leftPct: 88, topPct: 66, size: 2, depth: 0.6, duration: 11, delay: 0.3, xDrift: -12 },
  { leftPct: 28, topPct: 82, size: 2, depth: 0.4, duration: 13, delay: 1.8, xDrift: 9 },
  { leftPct: 72, topPct: 86, size: 3, depth: 0.7, duration: 10, delay: 0.9, xDrift: -10 },
  { leftPct: 50, topPct: 12, size: 2, depth: 0.5, duration: 12.5, delay: 1.5, xDrift: 7 },
  { leftPct: 64, topPct: 36, size: 3, depth: 0.6, duration: 11.5, delay: 0.4, xDrift: 11 },
  // Added back in — the original lag turned out to be mostly battery/power
  // mode (confirmed by the user), not this count specifically. Filling in
  // gaps between the 8 above rather than clustering.
  { leftPct: 40, topPct: 48, size: 2, depth: 0.5, duration: 10.5, delay: 2.1, xDrift: 8 },
  { leftPct: 6, topPct: 40, size: 3, depth: 0.8, duration: 9.5, delay: 0.2, xDrift: -11 },
  { leftPct: 95, topPct: 42, size: 2, depth: 0.6, duration: 12, delay: 1.1, xDrift: 10 },
  { leftPct: 35, topPct: 8, size: 2, depth: 0.4, duration: 13.5, delay: 2.5, xDrift: -7 },
  // Two more on the right edge, vertically centered (middle of the hero),
  // given distinct sizes.
  { leftPct: 88, topPct: 46, size: 4, depth: 0.9, duration: 9.5, delay: 0.5, xDrift: -9 },
  { leftPct: 79, topPct: 58, size: 1, depth: 0.3, duration: 13, delay: 2, xDrift: 8 },
]

// A larger scattering of softer glows through the hero, using the exact
// same radial-gradient recipe as the traveling key light further down this
// file (rgba(255,201,4,0.30) fading to transparent at 70%) — scaled way
// down and kept to a tight, varied-but-modest size range (10–24px radius)
// so they read as many small specks catching the light, not a handful of
// mini spotlights. Distinct from the finer DUST_MOTES above.
// Originally cut from 14 down to 7 for perf, then partially restored — the
// lag turned out to be mostly battery/power mode, so a few more were added
// back in gaps between the original 7.
const HERO_LIGHT_SPECKS = [
  { leftPct: 24, topPct: 28, radius: 22, duration: 7.5, delay: 0.3, xDrift: 12 },
  { leftPct: 78, topPct: 22, radius: 14, duration: 9, delay: 1.8, xDrift: -10 },
  { leftPct: 15, topPct: 76, radius: 20, duration: 8.2, delay: 1, xDrift: 9 },
  { leftPct: 85, topPct: 72, radius: 12, duration: 10.5, delay: 2.4, xDrift: -8 },
  { leftPct: 55, topPct: 85, radius: 18, duration: 8.8, delay: 0.7, xDrift: 11 },
  { leftPct: 10, topPct: 15, radius: 16, duration: 9.6, delay: 1.3, xDrift: 8 },
  { leftPct: 90, topPct: 12, radius: 11, duration: 11, delay: 0.5, xDrift: -9 },
  { leftPct: 45, topPct: 55, radius: 15, duration: 9.2, delay: 1.9, xDrift: 10 },
  { leftPct: 5, topPct: 55, radius: 13, duration: 10.8, delay: 0.9, xDrift: -8 },
  { leftPct: 68, topPct: 8, radius: 17, duration: 8.6, delay: 2.2, xDrift: 9 },
]

// Each speck sits at a fixed (leftPct, topPct) spot and reacts only to how
// close the cursor gets to THAT spot — not to the cursor's raw position
// across the whole hero. mouseX/mouseY here are the shared smoothMouseX/Y
// (one spring pair, defined once in the parent and reused by every ambient
// element — see the note by proximitySpring there for why it's shared
// rather than one spring per element). This component's own math is a
// plain, non-spring useTransform: we convert the speck's own percent
// position into the same -0.5..0.5 space as the smoothed mouse position and
// measure the distance between the two. Within PROXIMITY_RADIUS the speck
// gets nudged away from the cursor, with the nudge strength fading smoothly
// to zero at the radius's edge — outside it, the speck doesn't move at all.
// The already-smoothed input is what makes the reaction ease in/out
// smoothly, without needing another spring on top of it here.
const SPECK_PROXIMITY_RADIUS = 0.16
const SPECK_MAX_NUDGE = 14

function HeroLightSpeck({ leftPct, topPct, radius, duration, delay, mouseX, mouseY, heroActive }) {
  const homeX = leftPct / 100 - 0.5
  const homeY = topPct / 100 - 0.5

  // mouseX/mouseY here are the shared, already-springed smoothMouseX/Y (one
  // spring pair reused by every ambient element — see the note by
  // proximitySpring in the parent component) — no per-element spring on top
  // of it, since that's what caused the earlier lag.
  const speckX = useTransform([mouseX, mouseY, heroActive], ([mx, my, active]) => {
    if (!active) return 0
    const dx = homeX - mx
    const dy = homeY - my
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001
    const strength = Math.max(0, 1 - dist / SPECK_PROXIMITY_RADIUS)
    return (dx / dist) * strength * SPECK_MAX_NUDGE
  })
  const speckY = useTransform([mouseX, mouseY, heroActive], ([mx, my, active]) => {
    if (!active) return 0
    const dx = homeX - mx
    const dy = homeY - my
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001
    const strength = Math.max(0, 1 - dist / SPECK_PROXIMITY_RADIUS)
    return (dy / dist) * strength * SPECK_MAX_NUDGE
  })

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: `${leftPct}%`,
        top: `${topPct}%`,
        width: radius * 2,
        height: radius * 2,
        marginLeft: -radius,
        marginTop: -radius,
        zIndex: 4,
        x: speckX,
        y: speckY,
        background: `radial-gradient(circle ${radius}px at 50% 50%, rgba(255,201,4,0.30) 0%, transparent 70%)`,
      }}
      animate={{
        opacity: [0.35, 0.9, 0.45, 0.8, 0.35],
        scale: [1, 1.12, 0.94, 1.08, 1],
      }}
      transition={{ duration, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  )
}

function DustMote({ leftPct, topPct, size, depth, duration, delay, xDrift, mouseX, mouseY, heroActive }) {
  // Same proximity model as HeroLightSpeck below — the mote only reacts
  // when the cursor is actually near it, not to the cursor's position
  // anywhere in the hero. Near motes (higher depth) still drift more than
  // far ones when they do react — the same near-things-move-more-than-far-
  // things cue real parallax uses — via the depth-scaled nudge magnitude.
  const homeX = leftPct / 100 - 0.5
  const homeY = topPct / 100 - 0.5

  // mouseX/mouseY here are the shared, already-springed smoothMouseX/Y — no
  // per-element spring on top (see the note by proximitySpring in the
  // parent component for why: one shared spring instead of ~60 individual
  // ones is what actually fixed the lag).
  const moteX = useTransform([mouseX, mouseY, heroActive], ([mx, my, active]) => {
    if (!active) return 0
    const dx = homeX - mx
    const dy = homeY - my
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001
    const strength = Math.max(0, 1 - dist / SPECK_PROXIMITY_RADIUS)
    return (dx / dist) * strength * 16 * depth
  })
  const moteY = useTransform([mouseX, mouseY, heroActive], ([mx, my, active]) => {
    if (!active) return 0
    const dx = homeX - mx
    const dy = homeY - my
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001
    const strength = Math.max(0, 1 - dist / SPECK_PROXIMITY_RADIUS)
    return (dy / dist) * strength * 10 * depth
  })
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: `${leftPct}%`, top: `${topPct}%`, width: size, height: size, x: moteX, y: moteY, zIndex: 4 }}
    >
      {/* Small, soft-edged, and drifting diagonally rather than a crisp dot
          bobbing straight up and down — closer to how a speck of dust
          actually tumbles and catches light unevenly. No hard box-shadow
          halo, just a heavily-blurred core so it stays hazy. */}
      <motion.div
        className="w-full h-full rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255,225,140,0.9) 0%, rgba(255,201,4,0.5) 55%, transparent 100%)',
          filter: `blur(${1.1 + (1 - depth) * 1.4}px)`,
        }}
        animate={{
          opacity: [0.1, 0.55, 0.15, 0.4, 0.1],
          x: [0, xDrift, xDrift * 0.4, -xDrift * 0.5, 0],
          y: [0, -12, -20, -8, 0],
        }}
        transition={{ duration, repeat: Infinity, ease: 'easeInOut', delay }}
      />
    </motion.div>
  )
}

// ─── Motion variants ────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 40, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1 },
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
}

const heroContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.14 } },
}

function Divider() {
  return (
    <div
      className="-mx-8 h-px"
      style={{
        background: 'linear-gradient(to right, transparent, rgba(255,201,4,0.18) 30%, rgba(255,201,4,0.22) 50%, rgba(255,201,4,0.18) 70%, transparent)',
      }}
    />
  )
}

// ─── Feature carousel ───────────────────────────────────────────────────────
// A coverflow-style carousel: the active card sits centered and full size,
// with neighbors peeking in on either side at reduced scale/opacity and a
// slight 3D tilt. Drag/swipe the row to rotate through cards, or click a
// side card/dot to bring it to center. Loops in both directions.
//
// Position is a single continuous value (not an integer index) — while
// you're actively scrolling it, cards slide smoothly in direct proportion
// to scroll distance instead of jumping card-by-card. When scrolling stops,
// it coasts with whatever velocity it had and decays naturally, then
// spring-locks onto whichever card it ends up nearest to — a gentle scroll
// barely moves past where you left it; a fast flick keeps spinning for a
// beat before settling.

const CAROUSEL_SPACING = 300 // px between each card's center, left/right
const CAROUSEL_DRAG_THRESHOLD = 60 // px of drag before it counts as a swipe
const CAROUSEL_WHEEL_DEADZONE = 4 // px of trackpad deltaX before it registers
const CAROUSEL_WHEEL_IDLE = 120 // ms of no wheel events before we start settling
const CAROUSEL_COAST_FRICTION = 3.2 // higher = decays to a stop faster
const CAROUSEL_COAST_STOP_VELOCITY = 0.015 // position-units/sec considered "stopped"
const CAROUSEL_SNAP_SPRING = { type: 'spring', stiffness: 220, damping: 26 }

// Shortest signed distance from `p` to card `i` around a loop of `n` cards —
// e.g. with 6 cards, card 0 is +1 away from card 5, not -5 away.
function carouselWrap(i, p, n) {
  let diff = i - p
  diff -= n * Math.round(diff / n)
  return diff
}

// The representative of target's equivalence class (mod n) nearest current —
// what a click/drag animates toward, so it always takes the short way around
// the loop instead of unwinding all the way back past every other card.
function carouselNearestTarget(target, current, n) {
  return target + n * Math.round((current - target) / n)
}

function CarouselCard({ icon: Icon, title, desc, index, position, n, onSelect }) {
  const diff = useTransform(position, (p) => carouselWrap(index, p, n))
  const x = useTransform(diff, (d) => d * CAROUSEL_SPACING)
  const scale = useTransform(diff, (d) => {
    const abs = Math.abs(d)
    return abs <= 1 ? 1 - abs * 0.2 : Math.max(0.4, 0.8 - (abs - 1) * 0.18)
  })
  const opacity = useTransform(diff, (d) => {
    const abs = Math.abs(d)
    if (abs > 2.4) return 0
    return abs <= 1 ? 1 - abs * 0.5 : Math.max(0, 0.5 - (abs - 1) * 0.34)
  })
  const rotateY = useTransform(diff, (d) => Math.max(-22, Math.min(22, d * -22)))
  const zIndex = useTransform(diff, (d) => Math.round(10 - Math.abs(d)))
  const pointerEvents = useTransform(diff, (d) => (Math.abs(d) < 2.2 ? 'auto' : 'none'))
  const borderOpacity = useTransform(diff, (d) => (Math.abs(d) < 0.15 ? 1 : 0))
  const borderColor = useMotionTemplate`rgba(255,201,4,${borderOpacity})`

  // Split into a statically-centered outer element (plain CSS transform via
  // Tailwind's -translate classes) and an inner one that Framer drives —
  // Framer takes over the whole `transform` property on any element it
  // manages x/scale/rotate on, so the -50%/-50% centering has to live on a
  // separate element or it gets silently overwritten every frame.
  return (
    <motion.div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ zIndex, pointerEvents }}
      onClick={onSelect}
    >
      <motion.div
        className="w-[300px] sm:w-[340px] cursor-pointer"
        style={{ x, scale, opacity, rotateY, transformPerspective: 1200 }}
      >
        <motion.div className="card border border-transparent rounded-2xl p-9" style={{ borderColor }}>
          <div className="w-14 h-14 bg-ucf-gold/10 rounded-xl flex items-center justify-center mb-6">
            <Icon className="w-6 h-6 text-ucf-gold" />
          </div>
          <h3 className="text-lg font-semibold mb-2.5 text-white">{title}</h3>
          <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

function CarouselDot({ index, position, n, onClick }) {
  const width = useTransform(position, (p) => (((Math.round(p) % n) + n) % n === index ? 20 : 6))
  const background = useTransform(position, (p) =>
    ((Math.round(p) % n) + n) % n === index ? '#FFC904' : '#26263a'
  )
  return (
    <motion.button
      onClick={onClick}
      aria-label={`Show feature ${index + 1}`}
      className="h-1.5 rounded-full"
      style={{ width, background }}
      transition={{ duration: 0.2 }}
    />
  )
}

function FeatureCarousel({ items }) {
  const n = items.length
  const position = useMotionValue(0)
  const velocityRef = useRef(0)
  const lastWheelTimeRef = useRef(0)
  const idleTimerRef = useRef(null)
  const coastRafRef = useRef(null)
  const containerRef = useRef(null)

  const cancelSettle = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
    if (coastRafRef.current) {
      cancelAnimationFrame(coastRafRef.current)
      coastRafRef.current = null
    }
    position.stop()
  }

  const startSettle = () => {
    let lastT = performance.now()
    const step = (now) => {
      const dt = Math.min((now - lastT) / 1000, 0.05)
      lastT = now
      const v = velocityRef.current
      if (Math.abs(v) < CAROUSEL_COAST_STOP_VELOCITY) {
        animate(position, Math.round(position.get()), CAROUSEL_SNAP_SPRING)
        coastRafRef.current = null
        return
      }
      position.set(position.get() + v * dt)
      velocityRef.current = v * Math.exp(-CAROUSEL_COAST_FRICTION * dt)
      coastRafRef.current = requestAnimationFrame(step)
    }
    coastRafRef.current = requestAnimationFrame(step)
  }

  const goTo = (index) => {
    cancelSettle()
    velocityRef.current = 0
    animate(position, carouselNearestTarget(index, position.get(), n), CAROUSEL_SNAP_SPRING)
  }

  // Native (non-React) wheel listener — React attaches onWheel as a passive
  // listener by default, which silently ignores preventDefault() and is
  // exactly what let a horizontal trackpad swipe fall through to the
  // browser's back/forward-navigation gesture. A manually-attached
  // { passive: false } listener is the only reliable way to stop that.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleWheel = (e) => {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return
      e.preventDefault()
      if (Math.abs(e.deltaX) < CAROUSEL_WHEEL_DEADZONE) return

      cancelSettle()
      const now = performance.now()
      const dt = (now - lastWheelTimeRef.current) / 1000
      lastWheelTimeRef.current = now
      const deltaPos = e.deltaX / CAROUSEL_SPACING
      position.set(position.get() + deltaPos)
      // A gap longer than ~300ms means this is a fresh gesture, not a
      // continuation — start its velocity estimate clean.
      const instVelocity = dt > 0 && dt < 0.3 ? deltaPos / dt : 0
      velocityRef.current = dt < 0.3 ? velocityRef.current * 0.6 + instVelocity * 0.4 : instVelocity

      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(startSettle, CAROUSEL_WHEEL_IDLE)
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', handleWheel)
      cancelSettle()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDragStart = () => cancelSettle()
  const handleDragEnd = (_e, info) => {
    const { offset, velocity } = info
    if (offset.x < -CAROUSEL_DRAG_THRESHOLD || velocity.x < -400) {
      goTo(Math.round(position.get()) + 1)
    } else if (offset.x > CAROUSEL_DRAG_THRESHOLD || velocity.x > 400) {
      goTo(Math.round(position.get()) - 1)
    }
  }

  return (
    <div ref={containerRef} className="relative h-[380px] sm:h-[400px]">
      <motion.div
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {items.map((f, i) => (
          <CarouselCard key={f.title} {...f} index={i} position={position} n={n} onSelect={() => goTo(i)} />
        ))}
      </motion.div>

      {/* Dots — also click-to-select, and show which card is nearest-active */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {items.map((f, i) => (
          <CarouselDot key={f.title} index={i} position={position} n={n} onClick={() => goTo(i)} />
        ))}
      </div>
    </div>
  )
}

function AnimatedStep({ title, desc, index, stepClass }) {
  // Direct, self-contained initial/whileInView on this element itself —
  // no variants, no relying on an ancestor's animation state. That's the
  // exact same pattern already proven reliable elsewhere on this page (the
  // "How it works" heading, the Features carousel). The earlier bug came
  // from a CHILD depending on an inherited "hidden" variant from a distant
  // parent, which could get stuck; a direct trigger on the element that's
  // actually animating removes that dependency entirely. Staggered by
  // index so the three cards fade up one after another rather than at once.
  return (
    <div className={`how-it-works-step ${stepClass} flex flex-col items-center text-center mb-10 md:mb-0 md:px-0 px-4`}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: index * 0.12 }}
        className="flex flex-col items-center text-center w-full"
      >
        {/* No more bare solid number here — the giant ghost numeral behind
            the card (rendered in the parent, see how-it-works-ghost) is now
            the only "1/2/3" indicator, so there were no longer two rows of
            numbers stacked on top of each other. Kept as visually-hidden
            text so the step order still reaches screen readers. */}
        <span className="sr-only">Step {index + 1}: </span>
        {/* Fixed size so all three cards match regardless of description
            length — text centers within instead of stretching the box. */}
        <div className="card border border-app-border rounded-2xl p-6 w-[264px] h-48 flex flex-col justify-center">
          <h3 className="text-base font-semibold mb-2.5 text-white">{title}</h3>
          <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
        </div>
      </motion.div>
    </div>
  )
}

// Extruded 3D headline — stacks translucent copies of the text along the
// Z axis inside a shared preserve-3d space. The front copy is the real
// gold/white text; the copies behind it are a solid dark-gold "edge"
// color, darkening with depth. Flat-on, you only see the front face; as
// the parent tilts (mouse-driven rotateX/rotateY), the stack's side steps
// become visible, reading as genuine extruded depth rather than a flat
// plane rotating in place.
//
// Dropped from 12 layers to 1 to fix lag: every layer is its own
// absolutely-positioned element inside a preserve-3d parent whose rotation
// updates every frame you move the mouse (via the tilt spring), so the
// browser was recompositing 13 stacked large-text elements continuously.
// With 1 layer there's no visible "steps" of depth as it tilts anymore —
// it's back to a flat plane rotating in place — but it still tilts with
// the cursor, just without the extruded edge effect.
const EXTRUDE_LAYERS = 1
const EXTRUDE_STEP = 1.6 // px between each layer along Z

// Traveling key light sizing. The light starts out small (the same size as
// the ambient hero specks, so it first reads as "just another speck") and
// grows to its full size as you scroll down.
const LIGHT_RADIUS_START = 20
const LIGHT_RADIUS_END = 220
// The blend-mode box (see mixBlendMode note near where this is rendered)
// only needs to be big enough to contain the largest possible glow. The
// gradient goes fully transparent at 70% of its own radius, so at the max
// radius (220px) the lit area tops out around 154px from center — 420px
// gives a comfortable margin for that, plus the glow's own scale pulse
// (up to ~1.22x), without coming anywhere near covering the full page the
// way the old pad-based box did.
const LIGHT_BOX_SIZE = 420

function ExtrudedHeadline() {
  const layers = Array.from({ length: EXTRUDE_LAYERS })
  return (
    <div style={{ position: 'relative', transformStyle: 'preserve-3d' }} className="mb-6">
      {/* Invisible spacer copy establishes correct box sizing/flow */}
      <h1 className="text-6xl sm:text-8xl font-extrabold leading-tight invisible" aria-hidden="true">
        Study smarter.<br />
        <span>Ace it together.</span>
      </h1>
      {layers.map((_, i) => {
        const isFront = i === EXTRUDE_LAYERS - 1
        const depthFromFront = EXTRUDE_LAYERS - 1 - i
        const z = -depthFromFront * EXTRUDE_STEP
        const lightness = Math.max(9, 26 - depthFromFront * 1.5)
        const edgeColor = `hsl(45, 65%, ${lightness}%)`
        return (
          <h1
            key={i}
            aria-hidden={!isFront || undefined}
            style={{
              position: 'absolute',
              inset: 0,
              transform: `translateZ(${z}px)`,
              color: isFront ? '#ffffff' : edgeColor,
            }}
            className="text-6xl sm:text-8xl font-extrabold leading-tight"
          >
            Study smarter.<br />
            <span style={{ color: isFront ? '#FFC904' : edgeColor }}>Ace it together.</span>
          </h1>
        )
      })}
    </div>
  )
}

export default function Landing() {
  const heroTransitionRef = useRef(null)
  const featuresRef = useRef(null)

  // Tracks scroll progress across exactly one viewport-height of scrolling
  // right after the hero: 0 at the top of the page, 1 once the next
  // section has fully arrived. Drives the "receding wall" effect.
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroTransitionRef,
    offset: ['start start', 'end start'],
  })

  // Drives the Features heading's reveal directly off scroll position: 0
  // as the section's top is still at the bottom of the viewport (just
  // starting to arrive), 1 once it's most of the way to its resting spot —
  // so the heading resolves continuously as you scroll in, rather than a
  // whileInView animation firing once and then being done.
  const { scrollYProgress: featuresProgress } = useScroll({
    target: featuresRef,
    offset: ['start end', 'start 0.4'],
  })
  const featuresHeadingOpacity = useTransform(featuresProgress, [0, 1], [0, 1])
  const featuresHeadingY = useTransform(featuresProgress, [0, 1], [60, 0])
  const featuresHeadingScale = useTransform(featuresProgress, [0, 1], [0.9, 1])

  const heroOpacity = useTransform(heroProgress, [0, 1], [1, 0.5])
  const heroScale = useTransform(heroProgress, [0, 1], [1, 0.4])
  const heroY = useTransform(heroProgress, [0, 1], [0, -70])

  // Same trick, one section later: tracks scroll across Features' own
  // natural extent — 0 when its top hits the top of the viewport (fully
  // arrived), 1 when its bottom does (fully scrolled past). No separate
  // pinned layer or spacer needed — the shrink/dim/drift-back is layered
  // directly onto its ordinary scroll motion as it passes, so there's no
  // gap between it and "How it works" arriving right underneath.
  const { scrollYProgress: featuresRecedeProgress } = useScroll({
    target: featuresRef,
    offset: ['start start', 'end start'],
  })
  const featuresOpacity = useTransform(featuresRecedeProgress, [0, 1], [1, 0.5])
  const featuresScale = useTransform(featuresRecedeProgress, [0, 1], [1, 0.4])
  const featuresY = useTransform(featuresRecedeProgress, [0, 1], [0, -70])

  // Tracks scroll progress across the entire page (0 at top, 1 at bottom).
  // Drives the traveling key light — one continuous light source that
  // starts in the hero and drifts all the way down to the footer, so every
  // section shares the same light instead of each having its own.
  const { scrollYProgress: pageProgress } = useScroll()
  // Raw scroll progress jumps around on a fast flick/trackpad fling, which
  // made the light snap frame-to-frame. Smoothing it through a spring first
  // means everything derived from it — descent, wiggle, size, brightness —
  // eases toward the target instead of teleporting to it, however fast you
  // scroll, while still catching up quickly once you slow down or stop.
  const smoothProgress = useSpring(pageProgress, { stiffness: 80, damping: 22, mass: 0.5 })
  // Overall descent — the light's containing box travels the full page height.
  // Starts at 20vh rather than right at the top: the fixed Navbar (z-50,
  // opaque/blurred, ~64px tall) sits above the light's own z-index of 15, so
  // a start position tucked under it would be hidden — this was invisible
  // at first with the old large radius too, it just didn't matter because
  // the glow was big enough to bleed out from under the navbar either way.
  // Now that it starts small (see LIGHT_RADIUS_START), it needs a start
  // position that's actually clear of the navbar to read as visible at all.
  const lightScrollY = useTransform(smoothProgress, [0, 1], ['20vh', '90vh'])

  // The path itself: smooth, continuous sine curves driven by (smoothed)
  // scroll position, so the wiggle and the "dialing" size pulse are always
  // in sync with the descent and never jumpy. Lower frequencies than before
  // so the S-curve completes fewer, longer sweeps down the page instead of
  // several tight ones. Different frequencies/phases keep it from feeling
  // like a single mechanical loop.
  // In viewport-width units (not px) so the swing genuinely reaches both
  // edges of the screen regardless of device width, instead of a fixed
  // pixel amount that barely registers on a wide monitor.
  // Grows from speck-size to full size over the first ~40% of the page,
  // then holds — a gradual reveal rather than a jump the moment you scroll.
  const lightRadius = useTransform(smoothProgress, [0, 0.4], [LIGHT_RADIUS_START, LIGHT_RADIUS_END])

  const pathX = useTransform(smoothProgress, (p) => Math.sin(p * Math.PI * 2 * 1.3) * 42)
  const pathY = useTransform(smoothProgress, (p) => Math.sin(p * Math.PI * 2 * 0.9 + 1) * 40)
  const pathScale = useTransform(smoothProgress, (p) => 1 + Math.sin(p * Math.PI * 2 * 1.8 + 0.6) * 0.22)
  const pathOpacity = useTransform(
    smoothProgress,
    (p) => 0.82 + (Math.sin(p * Math.PI * 2 * 1.8 + 0.6) * 0.5 + 0.5) * 0.18
  )

  // Mouse-tracked 3D tilt — raw cursor position (-0.5 to 0.5, centered on the
  // hero), smoothed through springs so it feels weighty and fluid instead of
  // snapping straight to the cursor. Resets to center on mouse leave.
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  // Separate on/off flag for proximity-based effects (e.g. HeroLightSpeck).
  // mouseX/mouseY reset to 0 (center) on mouse-leave so the headline tilt
  // and ambient parallax ease back to neutral — but 0,0 is a real, valid
  // cursor position for proximity math, so without this flag a speck near
  // the center would wrongly read "the mouse just arrived right on top of
  // me" the instant the cursor actually left.
  const heroActive = useMotionValue(0)

  // mousemove can fire far more often than the screen actually repaints
  // (well over 60Hz on a high-polling-rate mouse/trackpad), and each raw
  // event used to call mouseX.set()/mouseY.set() directly — fanning out
  // synchronously to every subscriber (every dust mote, light speck, and
  // the main light) on every single event. Batching to one update per
  // animation frame caps that fan-out to the display's actual refresh
  // rate, which is most of this component's real performance fix.
  const latestMouseRef = useRef({ x: 0, y: 0 })
  const mouseRafRef = useRef(null)

  const handleHeroMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    latestMouseRef.current.x = (e.clientX - rect.left) / rect.width - 0.5
    latestMouseRef.current.y = (e.clientY - rect.top) / rect.height - 0.5
    if (mouseRafRef.current) return
    mouseRafRef.current = requestAnimationFrame(() => {
      mouseX.set(latestMouseRef.current.x)
      mouseY.set(latestMouseRef.current.y)
      heroActive.set(1)
      mouseRafRef.current = null
    })
  }
  const handleHeroMouseLeave = () => {
    if (mouseRafRef.current) {
      cancelAnimationFrame(mouseRafRef.current)
      mouseRafRef.current = null
    }
    mouseX.set(0)
    mouseY.set(0)
    heroActive.set(0)
  }

  // Advances exactly one viewport-height, which is also the exact span the
  // hero's spacer div (heroTransitionRef) occupies — so this lands right at
  // the top of the Features section, and scroll-snap (mandatory, set below)
  // locks it neatly into place rather than stopping partway.
  const handleScrollHintClick = () => {
    window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })
  }

  // Softer/heavier than a snap-to-cursor spring — lower stiffness and more
  // mass make it glide toward the target instead of darting to it, which
  // reads as smoother and more deliberate.
  const tiltSpring = { stiffness: 70, damping: 18, mass: 0.6 }
  const tiltX = useSpring(mouseY, tiltSpring)
  const tiltY = useSpring(mouseX, tiltSpring)
  // The side your mouse is on tilts forward, out of the screen. Kept subtle
  // (was ±5°) so it reads as a gentle lean rather than a swing.
  const rotateX = useTransform(tiltX, [-0.5, 0.5], [-3, 3])
  const rotateY = useTransform(tiltY, [-0.5, 0.5], [3, -3])

  // One shared smoothing spring, reused by every dust mote, light speck,
  // and the main light's proximity reaction. A spring isn't a cheap, one-
  // shot calculation — it's a physics simulation that keeps re-solving
  // itself every animation frame until it settles. An earlier version of
  // this gave each of the ~30 ambient elements its own independent spring
  // (~60 springs total, all ticking every frame the cursor moved), which is
  // what actually caused the lag. A single shared spring plus cheap,
  // non-spring proximity math per element keeps the same smooth "glide"
  // feel at a fraction of the per-frame cost.
  const proximitySpring = { stiffness: 100, damping: 20, mass: 0.5 }
  const smoothMouseX = useSpring(mouseX, proximitySpring)
  const smoothMouseY = useSpring(mouseY, proximitySpring)

  // The room itself is entirely static — wall, seam, floor, and the shadow
  // under the text never move. The key light (rendered below, outside the
  // hero) is the one thing that moves: it wanders toward the cursor, but
  // only when the cursor is actually near it — same proximity model as the
  // ambient specks below, rather than reacting to the cursor's position
  // anywhere in the hero — and travels down the page as you scroll.
  //
  // "Near it" is measured in the same -0.5..0.5-of-hero-bounds space as
  // mouseX/mouseY. pathX is already in vw and the hero spans the full
  // viewport width, so pathX/100 lines up directly as the light's baseline
  // horizontal position. lightScrollY is a '20vh'..'90vh' string — the
  // light's absolute vertical position as a fraction of the (full-viewport-
  // height) hero — so centering it (fraction - 0.5) lines it up the same way.
  const lightHomeX = useTransform(pathX, (px) => px / 100)
  const lightHomeY = useTransform(lightScrollY, (vh) => parseFloat(vh) / 100 - 0.5)

  const lightTranslateX = useTransform(
    [smoothMouseX, smoothMouseY, lightHomeX, lightHomeY, heroActive],
    ([mx, my, hx, hy, active]) => {
      if (!active) return 0
      const dx = mx - hx
      const dy = my - hy
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001
      const strength = Math.max(0, 1 - dist / SPECK_PROXIMITY_RADIUS)
      return (dx / dist) * strength * 70
    }
  )
  const lightTranslateY = useTransform(
    [smoothMouseX, smoothMouseY, lightHomeX, lightHomeY, heroActive],
    ([mx, my, hx, hy, active]) => {
      if (!active) return 0
      const dx = mx - hx
      const dy = my - hy
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001
      const strength = Math.max(0, 1 - dist / SPECK_PROXIMITY_RADIUS)
      return (dy / dist) * strength * 40
    }
  )

  // Cursor wander and the scroll-driven path add together, so the light is
  // one thing responding to two inputs rather than two separate effects.
  // pathX is in vw and lightTranslateX is in px, so they're combined via a
  // CSS calc() string rather than plain addition.
  const lightPosX = useMotionTemplate`calc(${pathX}vw + ${lightTranslateX}px)`
  // Same idea vertically: lightScrollY is the light's absolute scroll-driven
  // position (a vh string), pathY is its local wiggle, and lightTranslateY
  // is the cursor-proximity nudge — all combined into one calc() so the box
  // below only needs a single y transform instead of stacking two nested
  // elements the way this used to.
  const lightPosY = useMotionTemplate`calc(${lightScrollY} + ${pathY}px + ${lightTranslateY}px)`
  // The gradient is now centered in its own small box (see LIGHT_BOX_SIZE)
  // rather than offset by a large fixed pad within a page-spanning box, so
  // it's just centered at 50% 50%. Still reactive via useMotionTemplate
  // since the radius grows with scroll.
  const lightBackground = useMotionTemplate`radial-gradient(circle ${lightRadius}px at 50% 50%, rgba(255,201,4,0.30) 0%, transparent 70%)`

  // Scroll-snap is opt-in per element via scroll-snap-align, but the
  // snap-type itself has to live on the actual scrolling element — which
  // for a normal-flow page is <html>, not any div in this component. Set
  // it only while Landing is mounted so other routes are unaffected.
  // "mandatory" reliably locks to the nearest snap point once a scroll
  // gesture ends, rather than "proximity"'s barely-noticeable nudge.
  // scroll-behavior: smooth is what actually makes that lock feel like a
  // gentle glide into place instead of an instant jump-cut — that jump-cut
  // is what read as "violent."
  useEffect(() => {
    const root = document.documentElement
    const previousSnap = root.style.scrollSnapType
    const previousBehavior = root.style.scrollBehavior
    root.style.scrollSnapType = 'y mandatory'
    root.style.scrollBehavior = 'smooth'
    return () => {
      root.style.scrollSnapType = previousSnap
      root.style.scrollBehavior = previousBehavior
    }
  }, [])

  return (
    <div className="min-h-screen bg-app-bg overflow-x-hidden">
      <Navbar />

      {/* Traveling key light — the one continuous light source for the whole
          page. It starts near the top of the hero and winds its way down to
          the footer as you scroll in a smooth S-curve, staying visible the
          entire way. mixBlendMode is what makes it read as a light additively
          brightening whatever's beneath it rather than a flat gold circle —
          but blend-mode compositing is expensive over a large area, so this
          box is sized just big enough to contain the glow itself (see
          LIGHT_BOX_SIZE) and moves as one element, instead of the previous
          two-layer setup where the blended box spanned nearly two full
          viewport heights at all times regardless of the glow's actual size. */}
      <motion.div
        className="fixed pointer-events-none"
        style={{
          left: '50%',
          top: 0,
          width: LIGHT_BOX_SIZE,
          height: LIGHT_BOX_SIZE,
          marginLeft: -LIGHT_BOX_SIZE / 2,
          marginTop: -LIGHT_BOX_SIZE / 2,
          zIndex: 15,
          mixBlendMode: 'screen',
          background: lightBackground,
          x: lightPosX,
          y: lightPosY,
          scale: pathScale,
          opacity: pathOpacity,
        }}
      />

      {/* Hero — fixed to the viewport (the permanent "back wall"). As you scroll,
          it shrinks, dims, and drifts back — like the camera pulling away from
          it — while staying dimly visible until the next section covers it. */}
      <section
        onMouseMove={handleHeroMouseMove}
        onMouseLeave={handleHeroMouseLeave}
        className="fixed inset-0 flex items-center justify-center px-6 text-center overflow-hidden"
        style={{ perspective: 1000, zIndex: 5 }}
      >
        {/* ─── The room ──────────────────────────────────────────────────
            Static wall→floor tonal gradient, a static coving seam where they
            meet, a static warm floor bounce, and a static contact shadow
            grounding the text — a fixed, stable space. The traveling key
            light (rendered above, outside the hero) sits on top of this. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 0,
            background: 'linear-gradient(180deg, #16151b 0%, #0d0d11 46%, #0d0d11 60%, #08080b 100%)',
          }}
        />

        {/* Coving seam — the visible line where wall meets floor */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 2,
            background: 'radial-gradient(ellipse 140% 20% at 50% 58%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.035) 45%, transparent 75%)',
            filter: 'blur(2px)',
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 2,
            background: 'radial-gradient(ellipse 100% 55% at 50% 100%, rgba(255,201,4,0.10) 0%, transparent 65%)',
          }}
        />

        {/* Contact shadow — a real cast shadow under the text instead of a
            glow. Shadows read as "grounded" far more convincingly than a
            light pool does, and it stays put like a real shadow would. */}
        <div
          className="absolute pointer-events-none"
          style={{
            zIndex: 3,
            left: '50%',
            top: '61%',
            width: '52%',
            height: '80px',
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(ellipse 60% 100% at 50% 50%, rgba(0,0,0,0.5) 0%, transparent 78%)',
            filter: 'blur(9px)',
          }}
        />

        {/* Ambient dust motes — near ones drift more with the cursor than
            far ones, the classic multi-plane parallax depth cue, plus a
            slow idle bob/pulse so the room feels like it has air in it. */}
        {DUST_MOTES.map((m, i) => (
          <DustMote key={i} {...m} mouseX={smoothMouseX} mouseY={smoothMouseY} heroActive={heroActive} />
        ))}

        {/* A few bigger, softer light specks — same glow recipe as the
            traveling key light, scaled way down. */}
        {HERO_LIGHT_SPECKS.map((s, i) => (
          <HeroLightSpeck key={i} {...s} mouseX={smoothMouseX} mouseY={smoothMouseY} heroActive={heroActive} />
        ))}

        <motion.div
          style={{
            opacity: heroOpacity,
            scale: heroScale,
            y: heroY,
          }}
          className="max-w-4xl mx-auto relative z-10"
        >
          <motion.div initial="hidden" animate="visible" variants={heroContainer} style={{ transformStyle: 'preserve-3d' }}>
            {/* Tilt is applied here, around the badge/headline/subtext only —
                not around the buttons below. The buttons used to sit inside
                this tilted layer too, and hovering one nudged the mouse
                position, which nudged the tilt, which shifted the button
                out from under the cursor, dropping the hover, un-tilting,
                and re-triggering it — a rapid flicker loop. Keeping
                interactive elements out of anything that reacts to hovering
                them avoids that feedback entirely. */}
            <motion.div
              style={{ rotateX, rotateY, transformPerspective: 1000, transformStyle: 'preserve-3d' }}
            >
              <motion.div
                variants={fadeUp}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="inline-flex items-center gap-2 bg-ucf-gold/10 border border-ucf-gold/20 rounded-full px-4 py-1.5 mb-8"
              >
                <span className="w-2 h-2 rounded-full bg-ucf-gold animate-pulse" />
                <span className="text-ucf-gold text-sm font-medium">Exclusive to UCF Knights</span>
              </motion.div>

              <motion.div variants={fadeUp} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }} style={{ transformStyle: 'preserve-3d' }}>
                <ExtrudedHeadline />
              </motion.div>

              <motion.p
                variants={fadeUp}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed"
              >
                IgKnight connects UCF students through study groups, realtime collaboration,
                and AI-powered quizzes that check what you actually retained.
              </motion.p>
            </motion.div>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col sm:flex-row gap-3 justify-center"
            >
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center gap-2 bg-ucf-gold text-black font-bold px-8 py-3.5 rounded-xl text-base hover:bg-yellow-400 transition-colors duration-200 shadow-lg shadow-yellow-500/15"
                >
                  Get Started Free <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center border border-app-border text-[#e8e8e8] font-medium px-8 py-3.5 rounded-xl text-base hover:bg-app-surface hover:border-app-border transition-colors duration-200"
                >
                  Sign In
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Scroll hint — pinned near the bottom of the hero viewport rather
            than stacked under the buttons, so it reads as "there's more
            below" independent of how tall the centered content block is.
            Sibling of that block (not nested inside it) so its position
            doesn't move if the content above grows/shrinks. Opacity is
            driven by the same heroOpacity used for the rest of the hero, on
            a plain wrapping div — kept separate from the button's own
            initial/animate entrance so the two don't fight over the opacity
            property. */}
        <motion.div
          className="absolute inset-x-0 bottom-10 sm:bottom-14 z-10 flex justify-center pointer-events-none"
          style={{ opacity: heroOpacity }}
        >
          <motion.button
            type="button"
            onClick={handleScrollHintClick}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto flex flex-col items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors duration-200 cursor-pointer"
            aria-label="Scroll down to explore"
          >
            <span className="text-[11px] uppercase tracking-widest font-medium">Scroll to explore</span>
            <motion.span
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ChevronDown className="w-5 h-5" />
            </motion.span>
          </motion.button>
        </motion.div>
      </section>

      {/* Spacer — holds the hero's place in normal document flow (the hero
          itself is fixed and takes no flow space). Scrolling through this
          exact span is what drives the receding-wall transform above. */}
      <div
        ref={heroTransitionRef}
        style={{ height: '100vh', scrollSnapAlign: 'start' }}
        aria-hidden="true"
      />

      {/* Everything below stacks above the fixed hero and opaquely covers it
          as it scrolls into place — that brief moment of overlap, where this
          content is arriving and the shrunk hero is still peeking out above
          it, is the "coming forward while the wall recedes" effect. */}
      <div className="relative bg-app-bg" style={{ zIndex: 10 }}>
        <Divider />

        {/* Features — full-screen like the hero, and it recedes the same
            way as you scroll past it: no gap, no separate pinned layer —
            it's normal in-flow content like everything else here, just with
            a shrink/dim/drift-back transform layered on top of its natural
            scroll motion, tracked over the exact viewport-height of scroll
            it takes to pass. "How it works" is right underneath in the DOM,
            so it arrives in the same motion with nothing in between. */}
        <section
          ref={featuresRef}
          className="h-screen flex flex-col justify-center px-10 relative overflow-hidden"
          style={{ scrollSnapAlign: 'start' }}
        >
          {/* Gentle light at the bottom edge of the section — a soft,
              low-opacity glow, not the sharp traveling key light. Anchored
              to bottom:0 of this section specifically (not the page), and
              the section has overflow-hidden, so it's physically clipped
              to this section's own box and can't bleed into "How it works"
              below no matter how the section recedes/scrolls. Sits behind
              the actual content via z-index (content below is given its
              own z-10) rather than relying on DOM order, since a plain,
              non-positioned element always paints behind a positioned one
              regardless of DOM order — the same gotcha that caused the
              gap bug between the hero and this section earlier. */}
          <div
            className="absolute inset-x-0 bottom-0 pointer-events-none"
            style={{
              height: '260px',
              background: 'radial-gradient(ellipse 65% 100% at 50% 100%, rgba(255,201,4,0.07) 0%, transparent 72%)',
              zIndex: 0,
            }}
            aria-hidden="true"
          />
          <motion.div
            className="max-w-6xl mx-auto w-full relative z-10"
            style={{ opacity: featuresOpacity, scale: featuresScale, y: featuresY }}
          >
            {/* Heading reveal is tied directly to scroll position (not a
                one-shot whileInView trigger) — it continuously resolves in
                proportion to how far you've scrolled into the section, so
                arriving here reads as one continuous motion rather than a
                canned animation firing once you cross a line. */}
            <motion.div
              className="relative text-center mb-14"
              style={{ opacity: featuresHeadingOpacity, y: featuresHeadingY, scale: featuresHeadingScale }}
            >
              {/* Contact shadow — the same grounding trick as the hero's
                  headline, so this text reads as sitting in the same lit
                  room rather than floating on a plain background. */}
              <div
                className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
                style={{
                  top: '100%',
                  marginTop: '-14px',
                  width: '360px',
                  height: '70px',
                  background: 'radial-gradient(ellipse 60% 100% at 50% 50%, rgba(0,0,0,0.5) 0%, transparent 78%)',
                  filter: 'blur(9px)',
                }}
              />
              <h2 className="text-3xl font-bold mb-3 text-white">Everything you need to succeed</h2>
              <p className="text-gray-400 max-w-xl mx-auto">
                One platform built for UCF students, with every tool you need to study effectively.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <FeatureCarousel items={features} />
            </motion.div>
          </motion.div>
        </section>

        <Divider />

        {/* How it works — full-screen like the hero and features sections.
            With justify-center, padding-bottom pushes the centered content
            block UP (shrinks the box it's centered within, from the
            bottom) and padding-top pushes it DOWN (shrinks it from the
            top) — pb is gone entirely now, so pt is what's moving the
            heading down further. There's very little slack left before the
            now much-taller steps container (bigger ghost numerals) starts
            pushing the bottom step cards toward/past the fold, so this
            can't grow a lot more without also shrinking the steps below. */}
        <section
          className="h-screen flex flex-col justify-center px-10 pt-16"
          style={{ scrollSnapAlign: 'start' }}
        >
          <div className="max-w-4xl mx-auto w-full">
            <motion.div
              className="text-center mb-16"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }}
              variants={staggerContainer}
            >
              <motion.h2 variants={fadeUp} transition={{ duration: 0.55 }} className="text-4xl font-bold mb-3 text-white">
                How it works
              </motion.h2>
              <motion.p variants={fadeUp} transition={{ duration: 0.55 }} className="text-gray-400">
                Three simple steps to get started.
              </motion.p>
            </motion.div>
          </div>

          {/* Deliberately NOT nested inside the max-w-4xl column above — it
              needs to span the section's full width so the 25%/50%/75%
              positions on the steps below land at genuine screen halfway
              points, not halfway points of the narrower heading column. On
              mobile this is a plain stacked column. */}
          {/* Plain div, not animated — each AnimatedStep card now handles
              its own fade-in directly (see AnimatedStep), so animating
              this wrapper too would compound with the cards' own opacity/y
              transitions and could make their own whileInView visibility
              checks unstable while this parent is also still moving. */}
          <div className="how-it-works-steps relative w-full flex flex-col items-center md:block">
            {/* Giant ghost numerals — huge, very low-opacity "1"/"2"/"3"
                behind each step, filling the empty space as background
                texture. Rendered first so they sit behind the actual
                number/card content via DOM order. aria-hidden since
                they're purely decorative and the real numbers (in
                AnimatedStep) already convey the step order to screen
                readers. Static (no fade) — only the cards animate. */}
            <div className="how-it-works-ghost how-it-works-ghost-1 hidden md:block" aria-hidden="true">1</div>
            <div className="how-it-works-ghost how-it-works-ghost-2 hidden md:block" aria-hidden="true">2</div>
            <div className="how-it-works-ghost how-it-works-ghost-3 hidden md:block" aria-hidden="true">3</div>

            {steps.map(({ title, desc, stepClass }, i) => (
              <AnimatedStep
                key={title}
                title={title}
                desc={desc}
                index={i}
                stepClass={stepClass}
              />
            ))}
          </div>
        </section>

        <Divider />

        {/* CTA */}
        <section className="py-24 px-10 -mx-4" style={{ scrollSnapAlign: 'start' }}>
          <div className="max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="card border rounded-3xl p-12 text-center relative overflow-hidden"
            >
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse 80% 60% at 50% 120%, rgba(255,201,4,0.07) 0%, transparent 70%)',
                }}
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <h2 className="text-3xl font-bold mb-3 text-white relative">Ready to charge ahead?</h2>
              <p className="text-gray-400 mb-8 relative">
                Join your fellow Knights and start studying smarter today. Free forever.
              </p>
              <motion.div className="relative inline-block" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 bg-ucf-gold text-black font-bold px-8 py-3.5 rounded-xl text-base hover:bg-yellow-400 transition-colors duration-200 shadow-lg shadow-yellow-500/15"
                >
                  Create your account <ChevronRight className="w-4 h-4" />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <Divider />

        {/* Footer */}
        <motion.footer
          className="py-8 px-10 -mx-4"
          style={{ scrollSnapAlign: 'start' }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.8 }}
          transition={{ duration: 0.6 }}
        >
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-ucf-gold/15 rounded-lg flex items-center justify-center shrink-0">
                <BookOpen className="h-3.5 w-3.5 text-ucf-gold" />
              </div>
              <span className="text-white font-bold text-sm tracking-tight uppercase">IgKnight</span>
            </div>
            <p className="text-gray-600 text-sm">
              © {new Date().getFullYear()} IgKnight. Built for UCF Knights. Not affiliated with UCF.
            </p>
          </div>
        </motion.footer>
      </div>
    </div>
  )
}
