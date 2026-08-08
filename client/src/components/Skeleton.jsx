import React from 'react'

// Shared skeleton-loading primitives — used across Dashboard, SessionDetail,
// GroupChat, and Quiz while their data is in flight.

export function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse bg-app-input rounded-2xl ${className}`} />
}

export function SkeletonLine({ className = '' }) {
  return <div className={`animate-pulse bg-app-input rounded-full ${className}`} />
}

export function SkeletonCircle({ className = '' }) {
  return <div className={`animate-pulse bg-app-input rounded-full shrink-0 ${className}`} />
}
