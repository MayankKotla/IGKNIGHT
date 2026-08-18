import { useEffect, useState } from 'react'

// Returns the current time as a Date, updated every `intervalMs`. Plain
// `new Date()` computed inline during render only reflects "now" at the
// moment something else happens to trigger a re-render (a realtime event,
// a click, etc.) — it never updates on its own, so anything gating on it
// (e.g. "is this session ongoing yet?") silently goes stale until the user
// does something unrelated or reloads the page. This hook forces a
// re-render on a timer so time-based UI (session Upcoming/Ongoing/Past
// buckets, "starts in X min" banners, etc.) stays correct on its own.
//
// Defaults to 30s — frequent enough that a session flipping to "Ongoing"
// or "Past" shows up well within a minute of the real cutoff, without
// re-rendering so often it'd be wasteful for a value that's only ever
// compared at minute granularity anyway.
export function useNowTick(intervalMs = 30000) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}
