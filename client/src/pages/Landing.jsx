import React, { useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, useMotionValue, useSpring, useMotionTemplate } from 'framer-motion'
import { BookOpen, Users, Brain, Calendar, MessageSquare, Shield, ArrowRight, ChevronRight } from 'lucide-react'
import Navbar from '../components/Navbar'

const features = [
  {
    icon: Users,
    title: 'Smart Study Groups',
    desc: 'Find classmates enrolled in your exact courses and form focused study groups in seconds.',
  },
  {
    icon: Brain,
    title: 'AI Tutor',
    desc: 'Ask RetAIn anything about your coursework and get instant, accurate answers.',
  },
  {
    icon: MessageSquare,
    title: 'Realtime Chat',
    desc: 'Collaborate live with your group through instant messaging powered by Supabase Realtime.',
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
    title: '500+ Courses',
    desc: 'Browse study groups across every department and subject offered at UCF.',
  },
]

const steps = [
  {
    title: 'Sign up with your UCF email',
    desc: 'Create your account using your @ucf.edu or @knights.ucf.edu address.',
  },
  {
    title: 'Find your courses',
    desc: 'Browse the course catalog and join or create a study group for your class.',
  },
  {
    title: 'Study smarter together',
    desc: 'Chat in realtime, schedule sessions, and ask the AI tutor for help — all in one place.',
  },
]

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

function AnimatedFeatureCard({ icon: Icon, title, desc }) {
  return (
    <motion.div
      variants={fadeUp}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
      className="card border rounded-2xl p-7 hover:border-ucf-gold/30 transition-colors duration-200 group cursor-default"
    >
      <motion.div
        whileHover={{ scale: 1.08, rotate: -4 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        className="w-11 h-11 bg-ucf-gold/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-ucf-gold/18 transition-colors duration-200"
      >
        <Icon className="w-5 h-5 text-ucf-gold" />
      </motion.div>
      <h3 className="text-base font-semibold mb-2 text-white">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
    </motion.div>
  )
}

function AnimatedStep({ title, desc, index, isLast }) {
  return (
    <>
      <motion.div
        variants={fadeUp}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="flex-1 flex flex-col items-center text-center px-4"
      >
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16, delay: index * 0.12 + 0.1 }}
          className="w-10 h-10 rounded-full border border-ucf-gold/50 bg-ucf-gold/10 flex items-center justify-center mb-5 shrink-0"
        >
          <span className="text-ucf-gold font-bold text-sm">{index + 1}</span>
        </motion.div>
        <h3 className="text-base font-semibold mb-2 text-white">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
      </motion.div>
      {!isLast && (
        <div className="hidden md:flex items-start pt-5 shrink-0">
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.6, delay: index * 0.12 + 0.3, ease: 'easeOut' }}
            style={{
              transformOrigin: 'left',
              background: 'linear-gradient(to right, rgba(255,201,4,0.2), rgba(255,201,4,0.1))',
            }}
            className="w-16 h-px mt-0"
          />
        </div>
      )}
    </>
  )
}

// Extruded 3D headline — stacks translucent copies of the text along the
// Z axis inside a shared preserve-3d space. The front copy is the real
// gold/white text; the copies behind it are a solid dark-gold "edge"
// color, darkening with depth. Flat-on, you only see the front face; as
// the parent tilts (mouse-driven rotateX/rotateY), the stack's side steps
// become visible, reading as genuine extruded depth rather than a flat
// plane rotating in place.
const EXTRUDE_LAYERS = 12
const EXTRUDE_STEP = 1.6 // px between each layer along Z

// Traveling key light sizing — LIGHT_PAD must exceed LIGHT_RADIUS so the
// glow's containing box always has enough margin on every side to render a
// complete circle, no matter where the path moves it.
const LIGHT_RADIUS = 300
const LIGHT_PAD = 340

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

  // Tracks scroll progress across exactly one viewport-height of scrolling
  // right after the hero: 0 at the top of the page, 1 once the next
  // section has fully arrived. Drives the "receding wall" effect.
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroTransitionRef,
    offset: ['start start', 'end start'],
  })
  const heroOpacity = useTransform(heroProgress, [0, 1], [1, 0.5])
  const heroScale = useTransform(heroProgress, [0, 1], [1, 0.4])
  const heroY = useTransform(heroProgress, [0, 1], [0, -70])

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
  const lightScrollY = useTransform(smoothProgress, [0, 1], ['6vh', '90vh'])

  // The path itself: smooth, continuous sine curves driven by (smoothed)
  // scroll position, so the wiggle and the "dialing" size pulse are always
  // in sync with the descent and never jumpy. Lower frequencies than before
  // so the S-curve completes fewer, longer sweeps down the page instead of
  // several tight ones. Different frequencies/phases keep it from feeling
  // like a single mechanical loop.
  // In viewport-width units (not px) so the swing genuinely reaches both
  // edges of the screen regardless of device width, instead of a fixed
  // pixel amount that barely registers on a wide monitor.
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

  const handleHeroMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5)
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5)
  }
  const handleHeroMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
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

  // The room itself is entirely static — wall, seam, floor, and the shadow
  // under the text never move. The key light (rendered below, outside the
  // hero) is the one thing that moves: it wanders with the cursor while
  // you're in the hero, and travels down the page as you scroll.
  const lightSpring = { stiffness: 38, damping: 16, mass: 0.9 }
  const lightMouseX = useSpring(mouseX, lightSpring)
  const lightMouseY = useSpring(mouseY, lightSpring)
  const lightTranslateX = useTransform(lightMouseX, [-0.5, 0.5], [-70, 70])
  const lightTranslateY = useTransform(lightMouseY, [-0.5, 0.5], [-40, 40])

  // Cursor wander and the scroll-driven path add together, so the light is
  // one thing responding to two inputs rather than two separate effects.
  // pathX is in vw and lightTranslateX is in px, so they're combined via a
  // CSS calc() string rather than plain addition.
  const lightPosX = useMotionTemplate`calc(${pathX}vw + ${lightTranslateX}px)`
  const lightPosY = useTransform([pathY, lightTranslateY], ([a, b]) => a + b)

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
          entire way. The outer box is padded well beyond the glow's radius
          on every side so the circle never gets clipped by its own
          container, however far the path wanders. */}
      <motion.div
        className="fixed inset-x-0 pointer-events-none"
        style={{
          top: -LIGHT_PAD,
          height: `calc(100vh + ${LIGHT_PAD * 2}px)`,
          y: lightScrollY,
          zIndex: 15,
          mixBlendMode: 'screen',
        }}
      >
        <motion.div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle ${LIGHT_RADIUS}px at 50% ${LIGHT_PAD}px, rgba(255,201,4,0.30) 0%, transparent 70%)`,
            x: lightPosX,
            y: lightPosY,
            scale: pathScale,
            opacity: pathOpacity,
          }}
        />
      </motion.div>

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

        <motion.div
          style={{
            opacity: heroOpacity,
            scale: heroScale,
            y: heroY,
            rotateX,
            rotateY,
            transformPerspective: 1000,
            transformStyle: 'preserve-3d',
          }}
          className="max-w-4xl mx-auto relative z-10"
        >
          <motion.div initial="hidden" animate="visible" variants={heroContainer} style={{ transformStyle: 'preserve-3d' }}>
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
              IgKnight connects UCF students through AI-powered study groups, realtime collaboration,
              and an AI tutor that never sleeps.
            </motion.p>
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

        {/* Features — full-screen like the hero. scroll-snap-align pairs with
            the document-level scroll-snap-type set above: once you're
            scrolling near this section, it locks cleanly to fill the
            screen instead of stopping mid-way through it. */}
        <section
          className="h-screen flex flex-col justify-center px-10"
          style={{ scrollSnapAlign: 'start' }}
        >
          <div className="max-w-6xl mx-auto w-full">
            <motion.div
              className="text-center mb-14"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }}
              variants={staggerContainer}
            >
              <motion.h2 variants={fadeUp} transition={{ duration: 0.55 }} className="text-3xl font-bold mb-3 text-white">
                Everything you need to succeed
              </motion.h2>
              <motion.p variants={fadeUp} transition={{ duration: 0.55 }} className="text-gray-400 max-w-xl mx-auto">
                One platform built for UCF students, with every tool you need to study effectively.
              </motion.p>
            </motion.div>
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.15 }}
              variants={staggerContainer}
            >
              {features.map((f) => (
                <AnimatedFeatureCard key={f.title} {...f} />
              ))}
            </motion.div>
          </div>
        </section>

        <Divider />

        {/* How it works */}
        <section className="py-24 px-10 -mx-4" style={{ scrollSnapAlign: 'start' }}>
          <div className="max-w-4xl mx-auto">
            <motion.div
              className="text-center mb-14"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }}
              variants={staggerContainer}
            >
              <motion.h2 variants={fadeUp} transition={{ duration: 0.55 }} className="text-3xl font-bold mb-3 text-white">
                How it works
              </motion.h2>
              <motion.p variants={fadeUp} transition={{ duration: 0.55 }} className="text-gray-400">
                Up and running in under 2 minutes.
              </motion.p>
            </motion.div>

            <motion.div
              className="flex flex-col md:flex-row items-start gap-0"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={staggerContainer}
            >
              {steps.map(({ title, desc }, i) => (
                <AnimatedStep key={title} title={title} desc={desc} index={i} isLast={i === steps.length - 1} />
              ))}
            </motion.div>
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
              <span className="text-white font-bold text-sm tracking-tight">IgKnight</span>
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
