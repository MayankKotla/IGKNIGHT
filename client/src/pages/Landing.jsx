import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
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
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
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

export default function Landing() {
  return (
    <div className="min-h-screen bg-app-bg overflow-x-hidden">
      {/* Fixed glow — stays anchored to viewport top on overscroll, gently breathing */}
      <motion.div
        className="fixed top-0 left-0 w-full pointer-events-none"
        style={{
          height: '600px',
          background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(255,201,4,0.11) 0%, transparent 70%)',
          zIndex: 0,
        }}
        animate={{ opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      <Navbar />

      {/* Hero */}
      <section className="pt-36 pb-28 px-6 text-center relative overflow-hidden">
        <motion.div
          className="max-w-4xl mx-auto relative z-10"
          initial="hidden"
          animate="visible"
          variants={heroContainer}
        >
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 bg-ucf-gold/10 border border-ucf-gold/20 rounded-full px-4 py-1.5 mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-ucf-gold animate-pulse" />
            <span className="text-ucf-gold text-sm font-medium">Exclusive to UCF Knights</span>
          </motion.div>
          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl sm:text-7xl font-extrabold leading-tight mb-6 text-white"
          >
            Study smarter.<br />
            <span className="text-ucf-gold">Ace it together.</span>
          </motion.h1>
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
      </section>

      <Divider />

      {/* Features */}
      <section className="py-24 px-10 -mx-4">
        <div className="max-w-6xl mx-auto">
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
      <section className="py-24 px-10 -mx-4">
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
      <section className="py-24 px-10 -mx-4">
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
  )
}
