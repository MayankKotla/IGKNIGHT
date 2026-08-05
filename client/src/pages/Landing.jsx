import React from 'react'
import { Link } from 'react-router-dom'
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

export default function Landing() {
  return (
    <div className="min-h-screen bg-app-bg overflow-x-hidden">
      {/* Fixed glow — stays anchored to viewport top on overscroll */}
      <div
        className="fixed top-0 left-0 w-full pointer-events-none"
        style={{
          height: '600px',
          background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(255,201,4,0.11) 0%, transparent 70%)',
          zIndex: 0,
        }}
      />

      <Navbar />

      {/* Hero */}
      <section className="pt-36 pb-28 px-6 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 bg-ucf-gold/10 border border-ucf-gold/20 rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 rounded-full bg-ucf-gold animate-pulse" />
            <span className="text-ucf-gold text-sm font-medium">Exclusive to UCF Knights</span>
          </div>
          <h1 className="text-5xl sm:text-7xl font-extrabold leading-tight mb-6 text-white">
            Study smarter.<br />
            <span className="text-ucf-gold">Ace it together.</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            IgKnight connects UCF students through AI-powered study groups, realtime collaboration,
            and an AI tutor that never sleeps.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 bg-ucf-gold text-black font-bold px-8 py-3.5 rounded-xl text-base hover:bg-yellow-400 transition-colors duration-200 shadow-lg shadow-yellow-500/15"
            >
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center border border-app-border text-[#e8e8e8] font-medium px-8 py-3.5 rounded-xl text-base hover:bg-app-surface hover:border-app-border transition-colors duration-200"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      <Divider />

      {/* Features */}
      <section className="py-24 px-10 -mx-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3 text-white">Everything you need to succeed</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              One platform built for UCF students, with every tool you need to study effectively.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="card border rounded-2xl p-7 hover:border-ucf-gold/30 transition-colors duration-200 group"
              >
                <div className="w-11 h-11 bg-ucf-gold/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-ucf-gold/18 transition-colors duration-200">
                  <Icon className="w-5 h-5 text-ucf-gold" />
                </div>
                <h3 className="text-base font-semibold mb-2 text-white">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* How it works */}
      <section className="py-24 px-10 -mx-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3 text-white">How it works</h2>
            <p className="text-gray-400">Up and running in under 2 minutes.</p>
          </div>

          <div className="flex flex-col md:flex-row items-start gap-0">
            {steps.map(({ title, desc }, i) => (
              <React.Fragment key={title}>
                <div className="flex-1 flex flex-col items-center text-center px-4">
                  <div className="w-10 h-10 rounded-full border border-ucf-gold/50 bg-ucf-gold/10 flex items-center justify-center mb-5 shrink-0">
                    <span className="text-ucf-gold font-bold text-sm">{i + 1}</span>
                  </div>
                  <h3 className="text-base font-semibold mb-2 text-white">{title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden md:flex items-start pt-5 shrink-0">
                    <div className="w-16 h-px mt-0" style={{ background: 'linear-gradient(to right, rgba(255,201,4,0.2), rgba(255,201,4,0.1))' }} />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* CTA */}
      <section className="py-24 px-10 -mx-4">
        <div className="max-w-2xl mx-auto">
          <div className="card border rounded-3xl p-12 text-center relative overflow-hidden">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse 80% 60% at 50% 120%, rgba(255,201,4,0.07) 0%, transparent 70%)',
              }}
            />
            <h2 className="text-3xl font-bold mb-3 text-white relative">Ready to charge ahead?</h2>
            <p className="text-gray-400 mb-8 relative">
              Join your fellow Knights and start studying smarter today. Free forever.
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 bg-ucf-gold text-black font-bold px-8 py-3.5 rounded-xl text-base hover:bg-yellow-400 transition-colors duration-200 shadow-lg shadow-yellow-500/15 relative"
            >
              Create your account <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <Divider />

      {/* Footer */}
      <footer className="py-8 px-10 -mx-4">
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
      </footer>
    </div>
  )
}
