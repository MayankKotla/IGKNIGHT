import * as Sentry from '@sentry/react'

// No-ops entirely if VITE_SENTRY_DSN isn't set (e.g. local dev, or if you
// haven't created a Sentry project yet) — nothing else in the app needs to
// know whether monitoring is actually active.
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    // Low sample rate — this is a small app, not high-traffic, and
    // performance tracing isn't the point here, error visibility is.
    tracesSampleRate: 0.1,
  })
}

export const SentryErrorBoundary = Sentry.ErrorBoundary
