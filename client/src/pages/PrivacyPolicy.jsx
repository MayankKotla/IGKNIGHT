import React from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'

const LAST_UPDATED = 'August 17, 2026'
const CONTACT_EMAIL = 'mayankkotla5@gmail.com'

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-white font-semibold text-lg mb-2.5">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-app-bg text-white">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 pt-28 pb-24">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-10">Last updated {LAST_UPDATED}</p>

        <div className="space-y-9 text-gray-400 text-sm leading-relaxed">
          <Section title="1. Overview">
            <p>
              IgKnight is a study-group platform built for UCF students — course-based groups, realtime chat,
              session scheduling, and KnightCheck, an AI quiz feature. This policy explains what information we
              collect, how it's used, and who it's shared with. IgKnight is an independent, student-built
              project and is <strong className="text-gray-300">not affiliated with, endorsed by, or operated by the University of
              Central Florida</strong>.
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <p><strong className="text-gray-300">Account information:</strong> your name, UCF email address, and password. Your
              password is hashed by our authentication provider (Supabase) — we never see or store it in plain text.</p>
            <p><strong className="text-gray-300">Group and course data:</strong> which courses and groups you're part of, your role
              in a group, and session RSVPs.</p>
            <p><strong className="text-gray-300">Content you provide:</strong> chat messages, files and images you upload, session
              notes, and any sample questions or materials you attach for KnightCheck.</p>
            <p><strong className="text-gray-300">Quiz activity:</strong> your KnightCheck scores and quiz history.</p>
            <p><strong className="text-gray-300">Reports and blocks:</strong> if you report a message or block another user, we
              record who filed it, when, and the reason given.</p>
            <p><strong className="text-gray-300">Technical data:</strong> basic crash and error reports (via Sentry) when
              something goes wrong — this captures device/browser details and stack traces, not the content of your
              messages.</p>
          </Section>

          <Section title="3. How We Use Your Information">
            <p>To operate the core features of the app: creating and joining groups, chatting, scheduling
              sessions, and generating KnightCheck quizzes. Session notes and materials you attach are sent to
              Anthropic's Claude API specifically to generate quiz questions from them. Under Anthropic's
              commercial API terms, this content is not used to train their models. We use crash reports only
              to find and fix bugs.</p>
            <p>We do not sell your data, and we do not use it for advertising.</p>
          </Section>

          <Section title="4. Who We Share It With">
            <p>We rely on a small number of third-party services to run IgKnight:</p>
            <ul className="list-disc list-outside pl-5 space-y-1.5">
              <li><strong className="text-gray-300">Supabase</strong> — database, authentication, and file storage.</li>
              <li><strong className="text-gray-300">Anthropic (Claude API)</strong> — generates KnightCheck quizzes from the session
                materials and notes you provide.</li>
              <li><strong className="text-gray-300">Google (Calendar/Meet API)</strong> — creates meeting links for hybrid and
                online sessions.</li>
              <li><strong className="text-gray-300">Sentry</strong> — error monitoring, technical crash data only.</li>
            </ul>
            <p>We don't sell or rent your information to advertisers or any other third party.</p>
          </Section>

          <Section title="5. Cookies & Local Storage">
            <p>IgKnight doesn't use tracking or advertising cookies. We do use your browser's local storage to
              remember a few preferences on your device — which groups you've read messages in, whether you've
              muted a group's notifications, and your preferred list/calendar view. This data stays on your
              device, isn't sent to us, and is cleared if you clear your browser's site data.</p>
          </Section>

          <Section title="6. Visibility Within Groups">
            <p>Messages and files you post in a group are visible to every other member of that group. A group's
              owner can remove members from the group and can delete the group entirely — deleting a group
              permanently removes its chat history, sessions, notes, and uploaded files.</p>
            <p>Blocking another user only hides their messages from your own view — it doesn't remove them for
              anyone else, and they aren't notified.</p>
          </Section>

          <Section title="7. Data Retention & Deletion">
            <p>We keep your data for as long as your account is active. You can delete your account at any time
              from the account menu in the app — this is self-service and takes effect immediately. Deleting your
              account permanently removes your login and profile, and deletes any groups you own (including their
              chat history, sessions, notes, and uploaded files) for everyone in them. Messages you sent in groups
              you don't own remain, but are disassociated from your account.</p>
          </Section>

          <Section title="8. Your Rights">
            <p>You can access or correct your account information from within the app, and delete your account
              at any time using the "Delete account" option in the account menu. For anything the app doesn't
              cover directly, contact us at the email below.</p>
          </Section>

          <Section title="9. Security">
            <p>Access to data is restricted using row-level security at the database level, and passwords are
              hashed rather than stored in plain text. Data is encrypted in transit (HTTPS/TLS) between your
              device, IgKnight, and the service providers listed above. No system is perfectly secure, and we
              can't guarantee absolute security. If we become aware of a data breach affecting your personal
              information, we'll notify affected users by email without undue delay.</p>
          </Section>

          <Section title="10. Children's Privacy">
            <p>IgKnight requires a valid UCF email address and is not directed at or intended for use by children
              under 13.</p>
          </Section>

          <Section title="11. Changes to This Policy">
            <p>We may update this policy from time to time. Continuing to use IgKnight after a change means you
              accept the updated policy.</p>
          </Section>

          <Section title="12. Contact">
            <p>Questions about this policy? Email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-ucf-gold hover:text-yellow-400 transition-colors duration-150">
                {CONTACT_EMAIL}
              </a>.</p>
          </Section>
        </div>

        <div className="mt-12 pt-8 border-t border-app-border">
          <Link to="/terms" className="text-ucf-gold hover:text-yellow-400 text-sm font-medium transition-colors duration-150">
            Read the Terms of Service →
          </Link>
        </div>
      </div>
    </div>
  )
}
